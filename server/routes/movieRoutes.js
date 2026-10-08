import express from "express";
import {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../controllers/movieController.js";

const router = express.Router();

// MOVIES
router.get("/movies", getAllMovies);
router.get("/movies/:id", getMovieById);
router.post("/movies/create", createMovie);
router.put("/movies/update/:id", updateMovie);
router.delete("/movies/delete/:id", deleteMovie);

export default router;