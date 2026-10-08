import { pool } from "../config/db.js";

// GET ALL MOVIES
export const getAllMovies = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM movies ORDER BY release_date DESC"
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching movies:", error.message);
    return res.status(500).json({
      message: "Failed to fetch movies",
    });
  }
};

// GET MOVIE BY ID
export const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM movies WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Movie not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching movie by ID:", error.message);
    return res.status(500).json({ message: "Failed to fetch movie by ID" });
  }
};

// ADD NEW MOVIE
export const createMovie = async (req, res) => {
  try {
    const {
      title,
      description,
      release_date,
      genre,
      language,
      duration_min,
      rating,
      poster_url,
      trailer_url,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Movie title is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO movies 
      (title, description, genre, language, duration_min, rating, poster_url, trailer_url, release_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        title,
        description,
        genre,
        language,
        duration_min,
        rating,
        poster_url,
        trailer_url,
        release_date,
      ]
    );

    return res.status(201).json({
      message: "Movie added successfully",
      movie: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating movie:", error.message);
    return res.status(500).json({
      message: "Failed to add movie",
    });
  }
};

// UPDATE MOVIE
export const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      genre,
      language,
      duration_min,
      rating,
      poster_url,
      trailer_url,
      release_date,
    } = req.body;

    const movieCheck = await pool.query("SELECT * FROM movies WHERE id = $1", [
      id,
    ]);

    if (movieCheck.rows.length === 0) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const result = await pool.query(
      `UPDATE movies
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           genre = COALESCE($3, genre),
           language = COALESCE($4, language),
           duration_min = COALESCE($5, duration_min),
           rating = COALESCE($6, rating),
           poster_url = COALESCE($7, poster_url),
           trailer_url = COALESCE($8, trailer_url),
           release_date = COALESCE($9, release_date)
       WHERE id = $10
       RETURNING *`,
      [
        title,
        description,
        genre,
        language,
        duration_min,
        rating,
        poster_url,
        trailer_url,
        release_date,
        id,
      ]
    );

    return res.json({
      message: "Movie updated successfully",
      movie: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating movie:", error.message);
    return res.status(500).json({
      message: "Failed to update movie",
    });
  }
};

// DELETE MOVIE
export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM movies WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }

    return res.json({
      message: "Movie deleted successfully",
      movie: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting movie:", error.message);
    return res.status(500).json({
      message: "Failed to delete movie",
    });
  }
};