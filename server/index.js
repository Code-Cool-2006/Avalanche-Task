// Auth backend (Postgres/Neon via DATABASE_URL). Run: npm run server
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { z } from "zod";
import crypto from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const env = process.env;
const PROD = env.NODE_ENV === "production";
const ORIGIN = env.CLIENT_ORIGIN || "http://localhost:5173";
const PORT = Number(env.PORT) || 4000;
if (PROD && !env.JWT_SECRET) throw new Error("JWT_SECRET required in production");
const SECRET = env.JWT_SECRET || crypto.randomBytes(32).toString("hex"); // dev: sessions reset on restart

const ACCESS_TTL = 15 * 60; // seconds
const REFRESH_TTL = 7 * 24 * 3600;
const OTP_TTL = 5 * 60 * 1000;
const OTP_MAX_TRIES = 5;
const OTP_RESEND_MS = 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

if (!env.DATABASE_URL) throw new Error("DATABASE_URL required (see .env.example)");
pg.types.setTypeParser(20, Number); // BIGINT (ms timestamps) -> number
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 5 });
await pool.query(`
-- extends the booking schema's existing users table (id, name, email, password_hash, role)
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, email VARCHAR UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role VARCHAR DEFAULT 'user');
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fails INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created BIGINT DEFAULT 0;CREATE TABLE IF NOT EXISTS otps(
  email TEXT, purpose TEXT, hash TEXT NOT NULL, expires BIGINT NOT NULL,
  tries INTEGER DEFAULT 0, sent BIGINT NOT NULL, PRIMARY KEY(email, purpose));
CREATE TABLE IF NOT EXISTS sessions(
  id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL, expires BIGINT NOT NULL, revoked INTEGER DEFAULT 0,
  ip TEXT, ua TEXT, created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(ts BIGINT, event TEXT, email TEXT, ip TEXT, detail TEXT);
`);
// SQL is written with ? placeholders; convert to $1..$n for pg
const pgSql = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };
const run = (sql, ...a) => pool.query(pgSql(sql), a);
const q = async (sql, ...a) => (await run(sql, ...a)).rows[0];
const log = (req, event, email = null, detail = null) =>
  run("INSERT INTO audit VALUES(?,?,?,?,?)", Date.now(), event, email, req.ip, detail);
/* ---------- crypto helpers ---------- */
const scrypt = promisify(crypto.scrypt);
const SC = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const hashPw = async (pw) => {
  const salt = crypto.randomBytes(16);
  return `${salt.toString("hex")}:${(await scrypt(pw, salt, 64, SC)).toString("hex")}`;
};
const DUMMY = await hashPw("dummy-password-for-timing"); // equalises timing for unknown emails
const checkPw = async (pw, stored) => {
  const [salt, hash] = stored.split(":");
  const got = await scrypt(pw, Buffer.from(salt, "hex"), 64, SC);
  return crypto.timingSafeEqual(got, Buffer.from(hash, "hex"));
};
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const otpHash = (email, code) => crypto.createHmac("sha256", SECRET).update(`${email}:${code}`).digest("hex");
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/* ---------- email ---------- */
const mailer = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure: env.SMTP_PORT === "465",
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;
async function sendOtp(email, purpose) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await run(
    `INSERT INTO otps VALUES(?,?,?,?,0,?) ON CONFLICT(email,purpose)
     DO UPDATE SET hash=EXCLUDED.hash, expires=EXCLUDED.expires, tries=0, sent=EXCLUDED.sent`,
    email, purpose, otpHash(email, code), Date.now() + OTP_TTL, Date.now()
  );
  const what = purpose === "verify" ? "verify your CineShow account" : "reset your CineShow password";
  if (!mailer) return console.log(`[dev] OTP for ${email} (${purpose}): ${code}`);
  await mailer.sendMail({
    from: env.MAIL_FROM || env.SMTP_USER,
    to: email,
    subject: `${code} is your CineShow code`,
    text: `Use this code to ${what}: ${code}\nIt expires in 5 minutes. If this wasn't you, ignore this email.`,
  });
}
// returns "ok" | "invalid" (never reveals whether the email exists)
async function checkOtp(email, purpose, code) {
  const row = await q("SELECT * FROM otps WHERE email=? AND purpose=?", email, purpose);
  if (!row || row.expires < Date.now() || row.tries >= OTP_MAX_TRIES) return "invalid";
  await run("UPDATE otps SET tries=tries+1 WHERE email=? AND purpose=?", email, purpose);
  if (!safeEq(row.hash, otpHash(email, code))) return "invalid";
  await run("DELETE FROM otps WHERE email=? AND purpose=?", email, purpose); // single use
  return "ok";
}

/* ---------- sessions ---------- */
const cookieOpts = (path, maxAge) => ({ httpOnly: true, secure: PROD, sameSite: "strict", path, maxAge: maxAge * 1000 });
async function startSession(req, res, user) {
  const refresh = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const { id: sid } = await q(
    "INSERT INTO sessions(user_id,token_hash,expires,ip,ua,created) VALUES(?,?,?,?,?,?) RETURNING id",
    user.id, sha(refresh), now + REFRESH_TTL * 1000, req.ip, (req.get("user-agent") || "").slice(0, 200), now
  );
  const access = jwt.sign({ sub: user.id, sid: Number(sid) }, SECRET, { expiresIn: ACCESS_TTL, algorithm: "HS256" });
  res.cookie("at", access, cookieOpts("/api", ACCESS_TTL));
  res.cookie("rt", refresh, cookieOpts("/api/auth", REFRESH_TTL));
}
const clearSession = (res) => {
  res.clearCookie("at", cookieOpts("/api", 0));
  res.clearCookie("rt", cookieOpts("/api/auth", 0));
};
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone });

/** Exported-style middleware: attaches req.user or 401. Use on any protected route. */
async function requireAuth(req, res, next) {
  try {
    const { sub, sid } = jwt.verify(req.cookies.at, SECRET, { algorithms: ["HS256"] });
    const s = await q("SELECT revoked FROM sessions WHERE id=?", sid);
    const user = await q("SELECT * FROM users WHERE id=?", sub);
    if (!s || s.revoked || !user) throw 0;
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Not authenticated" });
  }
}

/* ---------- validation ---------- */
const COMMON = new Set(["password123", "1234567890", "qwertyuiop", "iloveyou12", "admin12345", "welcome123", "letmein123", "password1234"]);
const email = z.string().trim().toLowerCase().email().max(254);
const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Use letters and numbers")
  .refine((p) => !COMMON.has(p.toLowerCase()), "That password is too common");
const code = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");
const schemas = {
  register: z.object({
    name: z.string().trim().min(2).max(60),
    email,
    phone: z.string().trim().regex(/^\+?[0-9 -]{7,15}$/, "Invalid phone").optional().or(z.literal("")),
    password,
  }),
  otp: z.object({ email, code }),
  email: z.object({ email }),
  login: z.object({ email, password: z.string().min(1).max(128) }),
  reset: z.object({ email, code, password }),
};
const parse = (name) => (req, res, next) => {
  const r = schemas[name].safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues[0].message });
  req.body = r.data;
  next();
};

/* ---------- app ---------- */
const app = express();
app.set("trust proxy", env.TRUST_PROXY ? 1 : false);
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
// CSRF: SameSite=Strict cookies + CORS allow-list + required custom header (not sendable cross-site without preflight)
app.use((req, res, next) =>
  req.method !== "GET" && req.get("x-requested-with") !== "fetch"
    ? res.status(403).json({ error: "Forbidden" })
    : next()
);
const limiter = (max, windowMin = 15) =>
  rateLimit({ windowMs: windowMin * 60_000, limit: max, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many attempts. Try again later." } });
app.use("/api/auth", limiter(100));

const auth = express.Router();
const GENERIC = { message: "If that email can be used, a code has been sent." };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const canSend = async (e, p) => {
  const row = await q("SELECT sent FROM otps WHERE email=? AND purpose=?", e, p);
  return !row || Date.now() - row.sent >= OTP_RESEND_MS;
};

auth.post("/register", limiter(10), parse("register"), async (req, res) => {
  const { name, email, phone, password } = req.body;
  const existing = await q("SELECT * FROM users WHERE email=?", email);
  if (!existing) {
    await run("INSERT INTO users(name,email,phone,password_hash,created) VALUES(?,?,?,?,?)", name, email, phone || null, await hashPw(password), Date.now());
    await log(req, "register", email);
  } else if (!existing.verified) {
    // allow retry of an unverified signup: refresh details + password
    await run("UPDATE users SET name=?,phone=?,password_hash=? WHERE id=?", name, phone || null, await hashPw(password), existing.id);
  } else await hashPw(password); // verified account: same response + timing, no enumeration
  if ((!existing || !existing.verified) && await canSend(email, "verify")) await sendOtp(email, "verify");
  res.json(GENERIC);
});

auth.post("/verify-otp", limiter(20), parse("otp"), async (req, res) => {
  const { email, code } = req.body;
  const user = await q("SELECT * FROM users WHERE email=? AND verified=0", email);
  if (!user || (await checkOtp(email, "verify", code)) !== "ok") {
    await log(req, "verify_fail", email);
    return res.status(400).json({ error: "Invalid or expired code" });
  }
  await run("UPDATE users SET verified=1 WHERE id=?", user.id);
  await log(req, "verify_ok", email);
  await startSession(req, res, user);
  res.json({ user: publicUser(user) });
});

auth.post("/resend-otp", limiter(5), parse("email"), async (req, res) => {
  const { email } = req.body;
  const user = await q("SELECT verified FROM users WHERE email=?", email);
  if (user && !user.verified && await canSend(email, "verify")) await sendOtp(email, "verify");
  res.json(GENERIC);
});

auth.post("/login", limiter(10), parse("login"), async (req, res) => {
  const { email, password } = req.body;
  const user = await q("SELECT * FROM users WHERE email=?", email);
  const locked = user && user.locked_until > Date.now();
  const ok = await checkPw(password, user ? user.password_hash : DUMMY);
  if (!user || locked || !ok) {
    if (user && !locked && !ok) {
      const fails = user.fails + 1;
      await run("UPDATE users SET fails=?, locked_until=? WHERE id=?", fails % MAX_FAILS, fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0, user.id);
    }
    await log(req, locked ? "login_locked" : "login_fail", email);
    return res.status(401).json({ error: locked ? "Account temporarily locked. Try again in 15 minutes." : "Invalid email or password" });
  }
  if (!user.verified) {
    if (await canSend(email, "verify")) await sendOtp(email, "verify");
    return res.status(403).json({ error: "Please verify your email", needsVerification: true });
  }
  await run("UPDATE users SET fails=0, locked_until=0 WHERE id=?", user.id);
  await log(req, "login_ok", email);
  await startSession(req, res, user);
  res.json({ user: publicUser(user) });
});

// Rotating refresh token. Re-use of an old token => assume theft, revoke every session of that user.
auth.post("/refresh", async (req, res) => {
  const rt = req.cookies.rt;
  const s = rt && await q("SELECT * FROM sessions WHERE token_hash=?", sha(rt));
  if (!s) return clearSession(res), res.status(401).json({ error: "Not authenticated" });
  if (s.revoked || s.expires < Date.now()) {
    if (s.revoked) await run("UPDATE sessions SET revoked=1 WHERE user_id=?", s.user_id);
    await log(req, "refresh_reuse", null, `user ${s.user_id}`);
    return clearSession(res), res.status(401).json({ error: "Session expired" });
  }
  await run("UPDATE sessions SET revoked=1 WHERE id=?", s.id);
  const user = await q("SELECT * FROM users WHERE id=?", s.user_id);
  await startSession(req, res, user);
  res.json({ user: publicUser(user) });
});

auth.post("/logout", async (req, res) => {
  if (req.cookies.rt) await run("UPDATE sessions SET revoked=1 WHERE token_hash=?", sha(req.cookies.rt));
  clearSession(res);
  res.json({ ok: true });
});

auth.post("/forgot", limiter(5), parse("email"), async (req, res) => {
  const { email } = req.body;
  const user = await q("SELECT verified FROM users WHERE email=?", email);
  if (user?.verified && await canSend(email, "reset")) await sendOtp(email, "reset");
  else await wait(150 + Math.random() * 100);
  res.json(GENERIC);
});

auth.post("/reset", limiter(10), parse("reset"), async (req, res) => {
  const { email, code, password } = req.body;
  const user = await q("SELECT * FROM users WHERE email=? AND verified=1", email);
  if (!user || (await checkOtp(email, "reset", code)) !== "ok") {
    await log(req, "reset_fail", email);
    return res.status(400).json({ error: "Invalid or expired code" });
  }
  await run("UPDATE users SET password_hash=?, fails=0, locked_until=0 WHERE id=?", await hashPw(password), user.id);
  await run("UPDATE sessions SET revoked=1 WHERE user_id=?", user.id); // kick all devices
  await log(req, "reset_ok", email);
  clearSession(res);
  res.json({ message: "Password updated. Please sign in." });
});

auth.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.use("/api/auth", auth);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

// housekeeping: purge expired OTPs/sessions hourly
setInterval(async () => {
  await run("DELETE FROM otps WHERE expires < ?", Date.now());
  await run("DELETE FROM sessions WHERE expires < ?", Date.now());
}, 3600_000).unref();

export { app, requireAuth };
if (import.meta.main) {
  app.listen(PORT, () => console.log(`Auth API on :${PORT}${mailer ? "" : " (no SMTP: OTPs print here)"}`));
}
