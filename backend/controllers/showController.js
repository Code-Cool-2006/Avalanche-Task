
import { pool } from "../config/db.js";

export const getShows = async (req, res) => {
  try {
    const { movie_id, screen_id, date } = req.query;

    const conditions = [];
    const values = [];

    if (movie_id) {
      values.push(movie_id);
      conditions.push(`s.movie_id = $${values.length}`);
    }

    if (screen_id) {
      values.push(screen_id);
      conditions.push(`s.screen_id = $${values.length}`);
    }

    if (date) {
      values.push(date);
      conditions.push(`s.start_time::date = $${values.length}::date`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `SELECT
         s.id,
         s.movie_id,
         m.title AS movie_title,
         s.screen_id,
         sc.name AS screen_name,
         t.id AS theatre_id,
         t.name AS theatre_name,
         t.city,
         s.start_time,
         s.price_regular,
         s.price_premium,
         s.price_recliner
       FROM shows s
       JOIN movies m ON m.id = s.movie_id
       JOIN screens sc ON sc.id = s.screen_id
       JOIN theatres t ON t.id = sc.theatre_id
       ${whereClause}
       ORDER BY s.start_time ASC`,
      values
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      shows: result.rows,
    });
  } catch (error) {
    console.error("Get shows error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch shows" });
  }
};

export const getShowById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || Number(id) < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid show ID",
      });
    }

    const result = await pool.query(
      `SELECT
         s.id,
         s.movie_id,
         m.title AS movie_title,
         m.duration_min,
         s.screen_id,
         sc.name AS screen_name,
         t.id AS theatre_id,
         t.name AS theatre_name,
         t.city,
         t.address,
         s.start_time,
         s.price_regular,
         s.price_premium,
         s.price_recliner
       FROM shows s
       JOIN movies m ON m.id = s.movie_id
       JOIN screens sc ON sc.id = s.screen_id
       JOIN theatres t ON t.id = sc.theatre_id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    res.status(200).json({
      success: true,
      show: result.rows[0],
    });
  } catch (error) {
    console.error("Get show error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch show" });
  }
};

export const createShow = async (req, res) => {
  try {
    const {
      movie_id,
      screen_id,
      start_time,
      price_regular,
      price_premium,
      price_recliner,
    } = req.body;

    if (
      !Number.isInteger(movie_id) ||
      movie_id < 1 ||
      !Number.isInteger(screen_id) ||
      screen_id < 1 ||
      typeof start_time !== "string" ||
      !Number.isFinite(Date.parse(start_time)) ||
      [price_regular, price_premium, price_recliner].some(
        (price) => typeof price !== "number" || !Number.isFinite(price) || price < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide valid movie_id, screen_id, start_time and non-negative numeric prices",
      });
    }

    const result = await pool.query(
      `INSERT INTO shows
        (movie_id, screen_id, start_time,
         price_regular, price_premium, price_recliner)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        movie_id,
        screen_id,
        start_time,
        price_regular,
        price_premium,
        price_recliner,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Show created successfully",
      show: result.rows[0],
    });
  } catch (error) {
    console.error("Create show error:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "The specified movie or screen does not exist",
      });
    }

    res.status(500).json({ success: false, message: "Failed to create show" });
  }
};

export const updateShow = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [
      "movie_id",
      "screen_id",
      "start_time",
      "price_regular",
      "price_premium",
      "price_recliner",
    ];

    if (!/^\d+$/.test(id) || Number(id) < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid show ID",
      });
    }

    const updates = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] === undefined) continue;

      const value = req.body[field];

      if (
        ["movie_id", "screen_id"].includes(field) &&
        (!Number.isInteger(value) || value < 1)
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a positive integer`,
        });
      }

      if (
        field.startsWith("price_") &&
        (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a non-negative number`,
        });
      }

      if (
        field === "start_time" &&
        (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid start_time",
        });
      }

      values.push(value);
      updates.push(`${field} = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE shows
       SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Show updated successfully",
      show: result.rows[0],
    });
  } catch (error) {
    console.error("Update show error:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "The specified movie or screen does not exist",
      });
    }

    res.status(500).json({ success: false, message: "Failed to update show" });
  }
};

export const deleteShow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || Number(id) < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid show ID",
      });
    }

    const result = await pool.query(
      "DELETE FROM shows WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Show deleted successfully",
    });
  } catch (error) {
    console.error("Delete show error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete show" });
  }
};
