import express from "express";
import {
  getSeatsByScreen,
  createSeatForScreen,
  updateSeat,
  deleteSeat,
} from "../controllers/seatController.js";

const router = express.Router();

// GET ALL SEATS FOR A SCREEN
router.get("/screens/:screenId/seats", getSeatsByScreen);

// CREATE SEAT FOR A SCREEN
router.post("/screens/:screenId/seats/create", createSeatForScreen);

// UPDATE SEAT
router.put("/seats/update/:id", updateSeat);

// DELETE SEAT
router.delete("/seats/delete/:id", deleteSeat);

export default router;