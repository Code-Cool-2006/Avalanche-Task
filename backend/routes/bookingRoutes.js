import express from "express";
import {
  reserveSeats,
  confirmBooking,
  cancelBooking,
  getMyBookings,
} from "../controllers/bookingController.js";

export function createBookingRouter(requireAuth) {
  const router = express.Router();

  // POST /api/bookings/reserve (Atomic 5-min seat hold lock)
  router.post("/bookings/reserve", requireAuth, reserveSeats);

  // POST /api/bookings/:id/confirm (Confirm booking, finalize seats, issue ticket)
  router.post("/bookings/:id/confirm", requireAuth, confirmBooking);

  // POST /api/bookings/:id/cancel (Cancel booking, release seats)
  router.post("/bookings/:id/cancel", requireAuth, cancelBooking);

  // GET /api/bookings/my-bookings (Fetch authenticated user's bookings)
  router.get("/bookings/my-bookings", requireAuth, getMyBookings);

  return router;
}

export default createBookingRouter;
