
import express from "express";
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
} from "../controllers/bookingController.js";

import {
  requireAuth,
  requireAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createBooking);
router.get("/my", requireAuth, getMyBookings);
router.get("/", requireAuth, requireAdmin, getAllBookings);
router.get("/:id", requireAuth, getBookingById);
router.patch("/:id/cancel", requireAuth, cancelBooking);

export default router;
