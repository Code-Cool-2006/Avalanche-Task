const express = require("express");
const router = express.Router();
const { getAllMovies, getMovieById, createMovie, updateMovie, deleteMovie } = require("../controllers/movieController.js");



//MOVIES
router.get("/movies", getAllMovies);
router.get("/movies/:id", getMovieById)
router.post("/movies/create", createMovie);
router.put("/movies/update/:id", updateMovie);
router.delete("/movies/delete/:id", deleteMovie);

module.exports = router;