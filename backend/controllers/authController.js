
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import "dotenv/config";
import {
  hashPassword,
  verifyPassword,
} from "../utils/password.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const ACCESS_TTL = 15 * 60;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
  maxAge: ACCESS_TTL * 1000,
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

// Dummy hash helps make unknown-email logins take a similar amount
// of password-hashing work as incorrect-password logins.
const dummyHash = await hashPassword(
  crypto.randomBytes(32).toString("hex")
);



const pendingRegistrations = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

async function sendOtpEmail(email, otp) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your CineShow verification code",
    text: `Your verification code is ${otp}. It expires in 5 minutes. Do not share it with anyone.`,
    html: `
      <h2>Verify your CineShow account</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 8px;">${otp}</h1>
      <p>This code expires in 5 minutes. Do not share it with anyone.</p>
    `,
  });
}

// POST /api/auth/register
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const existingPending = pendingRegistrations.get(email);

    if (
      existingPending &&
      Date.now() < existingPending.expiresAt &&
      Date.now() < existingPending.resendAvailableAt
    ) {
      return res.status(429).json({
        error: "Please wait before requesting another OTP.",
      });
    }

    const passwordHash = await hashPassword(password);
    const otp = crypto.randomInt(100000, 1000000).toString();

    pendingRegistrations.set(email, {
      name,
      email,
      passwordHash,
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
      attempts: 0,
    });

    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      pendingRegistrations.delete(email);
      console.error("OTP email error:", emailError.message);

      return res.status(503).json({
        error: "Unable to send OTP email. Check your SMTP configuration.",
      });
    }

    return res.status(200).json({
      message: "OTP sent to your email. Verify it to complete registration.",
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    return res.status(500).json({
      error: "Unable to process registration right now.",
    });
  }
}



export async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    const pending = pendingRegistrations.get(email);

    if (!pending) {
      return res.status(400).json({
        error: "No pending registration found. Please register again.",
      });
    }

    if (Date.now() >= pending.expiresAt) {
      pendingRegistrations.delete(email);

      return res.status(400).json({
        error: "OTP expired. Please register again.",
      });
    }

    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      pendingRegistrations.delete(email);

      return res.status(429).json({
        error: "Too many incorrect attempts. Please register again.",
      });
    }

    pending.attempts++;

    const submittedHash = hashOtp(otp);

    const isValid = crypto.timingSafeEqual(
      Buffer.from(submittedHash, "hex"),
      Buffer.from(pending.otpHash, "hex")
    );

    if (!isValid) {
      if (pending.attempts >= MAX_OTP_ATTEMPTS) {
        pendingRegistrations.delete(email);
      }

      return res.status(400).json({
        error: "Invalid OTP.",
      });
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, name, email, role`,
      [pending.name, pending.email, pending.passwordHash]
    );

    pendingRegistrations.delete(email);

    if (result.rows.length === 0) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const user = result.rows[0];

    return res.status(201).json({
      message: "Email verified and account created successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      error: "Unable to verify OTP right now.",
    });
  }
}



export async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    const pending = pendingRegistrations.get(email);

    if (!pending || Date.now() >= pending.expiresAt) {
      pendingRegistrations.delete(email);

      return res.status(400).json({
        error: "No active registration found. Please register again.",
      });
    }

    if (Date.now() < pending.resendAvailableAt) {
      return res.status(429).json({
        error: "Please wait 60 seconds before requesting another OTP.",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    pending.otpHash = hashOtp(otp);
    pending.expiresAt = Date.now() + OTP_EXPIRY_MS;
    pending.resendAvailableAt = Date.now() + RESEND_COOLDOWN_MS;
    pending.attempts = 0;

    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error("OTP resend email error:", emailError.message);

      return res.status(503).json({
        error: "Unable to resend OTP. Please try again later.",
      });
    }

    return res.status(200).json({
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);

    return res.status(500).json({
      error: "Unable to resend OTP right now.",
    });
  }
}



// POST /api/auth/login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    const passwordMatches = await verifyPassword(
      password,
      user?.password_hash || dummyHash
    );

    if (!user || !passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { sub: String(user.id) },
      JWT_SECRET,
      {
        expiresIn: ACCESS_TTL,
        algorithm: "HS256",
        jwtid: crypto.randomUUID(),
      }
    );

    res.cookie("at", token, cookieOptions);

    return res.status(200).json({
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      error: "Unable to process login right now.",
    });
  }
}

// POST /api/auth/logout
export function logout(req, res) {
  res.clearCookie("at", cookieOptions);

  return res.status(200).json({
    message: "Logged out.",
  });
}