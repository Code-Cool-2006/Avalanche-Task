import express from "express";
import {
  getAllShows,
  getShowById,
  getSeatsByShow,
} from "../controllers/showController.js";

const router = express.Router();

// GET ALL SHOWS (with optional filters)
router.get("/shows", getAllShows);

// GET SHOW BY ID
router.get("/shows/:id", getShowById);

// GET SEATS FOR SPECIFIC SHOW (Availability & pricing)
router.get("/shows/:showId/seats", getSeatsByShow);

export default router;
