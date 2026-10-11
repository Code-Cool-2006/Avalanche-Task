
import express from "express";
import {
  createPayment,
  verifyPayment,
  getPaymentByBooking,
} from "../controllers/paymentController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createPayment);
router.post("/verify", requireAuth, verifyPayment);
router.get("/booking/:bookingId", requireAuth, getPaymentByBooking);

export default router;
