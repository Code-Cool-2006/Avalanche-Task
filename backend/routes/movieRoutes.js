
import express from "express";

import {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../controllers/movieController.js";

import {
  requireAuth,
  requireAdmin
} from "../middleware/authMiddleware.js";

const router = express.Router();


 // MOVIES

// Public: view movies
router.get("/movies", getAllMovies);
router.get("/movies/:id", getMovieById);

// Admin only: manage movies
router.post(
  "/movies/create",
  requireAuth,
  requireAdmin,
  createMovie
);

router.put(
  "/movies/update/:id",
  requireAuth,
  requireAdmin,
  updateMovie
);

router.delete(
  "/movies/delete/:id",
  requireAuth,
  requireAdmin,
  deleteMovie
);


export default router;