
import express from "express";
import { z } from "zod";

import {
  register,
  verifyOtp,
  resendOtp,
  login,
  logout,
} from "../controllers/authController.js";

const router = express.Router();

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: z
    .string()
    .min(10)
    .max(128)
    .refine((value) => /[a-z]/i.test(value) && /\d/.test(value), {
      message: "Password must contain letters and numbers.",
    }),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits."),
});

const resendOtpSchema = z.object({
  email: emailSchema,
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues[0].message,
      });
    }

    req.body = result.data;
    next();
  };
}

router.post("/register", validate(registerSchema), register);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);

export default router;