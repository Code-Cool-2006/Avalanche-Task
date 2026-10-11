import express from "express";
import {
  getSeatsByScreen,
  createSeatForScreen,
  updateSeat,
  deleteSeat,
} from "../controllers/seatController.js";

import {
  requireAuth,
  requireAdmin
} from "../middleware/authMiddleware.js";

const router = express.Router();


 // GET ALL SEATS FOR A SCREEN — public
router.get("/screens/:screenId/seats", getSeatsByScreen);

// CREATE SEAT FOR A SCREEN — admin only
router.post(
  "/screens/:screenId/seats/create",
  requireAuth,
  requireAdmin,
  createSeatForScreen
);

// UPDATE SEAT — admin only
router.put(
  "/seats/update/:id",
  requireAuth,
  requireAdmin,
  updateSeat
);

// DELETE SEAT — admin only
router.delete(
  "/seats/delete/:id",
  requireAuth,
  requireAdmin,
  deleteSeat
);

export default router;
