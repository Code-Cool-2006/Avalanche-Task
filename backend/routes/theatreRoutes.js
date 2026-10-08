import express from "express";
import {
  getAllTheatres,
  getTheatreById,
  createTheatre,
  updateTheatre,
  deleteTheatre,
} from "../controllers/theatreController.js";

const router = express.Router();

// THEATRES
router.get("/theatres", getAllTheatres);
router.get("/theatres/:id", getTheatreById);
router.post("/theatres/create", createTheatre);
router.put("/theatres/update/:id", updateTheatre);
router.delete("/theatres/delete/:id", deleteTheatre);

export default router;