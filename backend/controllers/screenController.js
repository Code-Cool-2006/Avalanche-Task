import { pool } from "../config/db.js";

// GET ALL SCREENS
export const getAllScreens = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM screens ORDER BY id");
    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching screens:", error.message);
    return res.status(500).json({
      message: "Failed to fetch screens",
    });
  }
};

// GET SCREEN BY ID
export const getScreenById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM screens WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Screen not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching screen by ID:", error.message);
    return res.status(500).json({
      message: "Failed to fetch screen by ID",
    });
  }
};

// CREATE SCREEN

export const createScreen = async (req, res) => {
  const { name, theatre_id } = req.body;

  if (!name || !theatre_id) {
    return res.status(400).json({
      message: "Screen name and theatre_id are required",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check whether the theatre exists
    const theatreResult = await client.query(
      "SELECT id FROM theatres WHERE id = $1",
      [theatre_id]
    );

    if (theatreResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Theatre not found",
      });
    }

    // Create the screen
    const screenResult = await client.query(
      `INSERT INTO screens (name, theatre_id)
       VALUES ($1, $2)
       RETURNING *`,
      [name, theatre_id]
    );

    const screen = screenResult.rows[0];

    // Fixed layout: 8 rows, 10 seats per row
    const rows = [
      { label: "A", tier: "regular" },
      { label: "B", tier: "regular" },
      { label: "C", tier: "regular" },
      { label: "D", tier: "regular" },
      { label: "E", tier: "premium" },
      { label: "F", tier: "premium" },
      { label: "G", tier: "recliner" },
      { label: "H", tier: "recliner" },
    ];

    // Prepare all 80 seats for insertion
    const values = [];
    const placeholders = [];
    let index = 1;

    for (const row of rows) {
      for (let seatNumber = 1; seatNumber <= 10; seatNumber++) {
        placeholders.push(
          `($${index++}, $${index++}, $${index++}, $${index++})`
        );

        values.push(
          screen.id,
          row.label,
          seatNumber,
          row.tier
        );
      }
    }

    // Insert all seats in one query
    await client.query(
      `INSERT INTO seats
        (screen_id, row_label, seat_number, tier)
       VALUES ${placeholders.join(", ")}`,
      values
    );

    // Save the screen and its seats together
    await client.query("COMMIT");

    return res.status(201).json({
      message: "Screen created successfully with 80 seats",
      screen,
      seatsCreated: 80,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create screen error:", error);

    return res.status(500).json({
      message: "Failed to create screen",
    });
  } finally {
    client.release();
  }
};

// UPDATE SCREEN
export const updateScreen = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, theatre_id } = req.body;

    const screenCheck = await pool.query("SELECT * FROM screens WHERE id = $1", [
      id,
    ]);

    if (screenCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Screen not found",
      });
    }

    if (theatre_id) {
      const theatreCheck = await pool.query(
        "SELECT * FROM theatres WHERE id = $1",
        [theatre_id]
      );

      if (theatreCheck.rows.length === 0) {
        return res.status(404).json({
          message: "Theatre not found with the provided theatre_id",
        });
      }
    }

    const result = await pool.query(
      `UPDATE screens
       SET name = COALESCE($1, name),
           theatre_id = COALESCE($2, theatre_id)
       WHERE id = $3
       RETURNING *`,
      [name, theatre_id, id]
    );

    return res.json({
      message: "Screen updated successfully",
      screen: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating screen:", error.message);
    return res.status(500).json({
      message: "Failed to update screen",
    });
  }
};

// DELETE SCREEN
export const deleteScreen = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM screens WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Screen not found",
      });
    }

    return res.json({
      message: "Screen deleted successfully",
      screen: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting screen:", error.message);
    return res.status(500).json({
      message: "Failed to delete screen",
    });
  }
};