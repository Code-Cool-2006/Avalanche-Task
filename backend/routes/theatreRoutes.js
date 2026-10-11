import express from "express";
import {
  getAllTheatres,
  getTheatreById,
  createTheatre,
  updateTheatre,
  deleteTheatre,
} from "../controllers/theatreController.js";

import {
  requireAuth,
  requireAdmin
} from "../middleware/authMiddleware.js";

const router = express.Router();

 // THEATRES

// GET ALL THEATRES — public
router.get("/theatres", getAllTheatres);

// GET THEATRE BY ID — public
router.get("/theatres/:id", getTheatreById);

// CREATE THEATRE — admin only
router.post(
  "/theatres/create",
  requireAuth,
  requireAdmin,
  createTheatre
);

// UPDATE THEATRE — admin only
router.put(
  "/theatres/update/:id",
  requireAuth,
  requireAdmin,
  updateTheatre
);

// DELETE THEATRE — admin only
router.delete(
  "/theatres/delete/:id",
  requireAuth,
  requireAdmin,
  deleteTheatre
);

export default router;
