import { pool } from "../config/db.js";

// GET ALL SEATS FOR A SCREEN
export const getSeatsByScreen = async (req, res) => {
  try {
    const { screenId } = req.params;

    const result = await pool.query(
      `SELECT * FROM seats
       WHERE screen_id = $1
       ORDER BY row_label, seat_number`,
      [screenId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching seats:", error.message);
    return res.status(500).json({ message: "Failed to fetch seats" });
  }
};

// CREATE SEAT FOR A SCREEN
export const createSeatForScreen = async (req, res) => {
  try {
    const { screenId } = req.params;
    const { row_label, seat_number, tier } = req.body;

    if (!row_label || !seat_number) {
      return res.status(400).json({
        message: "Row label and Seat number are required",
      });
    }

    const result = await pool.query(
      "INSERT INTO seats (screen_id, row_label, seat_number, tier) VALUES ($1, $2, $3, $4) RETURNING *",
      [screenId, row_label, seat_number, tier || "regular"]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating seat:", error.message);
    return res.status(500).json({ message: "Failed to create seat" });
  }
};

// UPDATE SEAT
export const updateSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { row_label, seat_number, tier } = req.body;

    if (!row_label || !seat_number) {
      return res.status(400).json({
        message: "Row label and Seat number are required",
      });
    }

    const result = await pool.query(
      `UPDATE seats
       SET row_label = $1, seat_number = $2, tier = $3
       WHERE id = $4
       RETURNING *`,
      [row_label, seat_number, tier || "regular", id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Seat not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating seat:", error.message);
    return res.status(500).json({ message: "Failed to update seat" });
  }
};

// DELETE SEAT
export const deleteSeat = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM seats WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Seat not found" });
    }

    return res.json({
      message: "Seat deleted successfully",
      seat: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting seat:", error.message);
    return res.status(500).json({ message: "Failed to delete seat" });
  }
};