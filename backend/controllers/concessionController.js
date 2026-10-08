import { pool } from "../config/db.js";

/**
 * GET ALL ACTIVE CONCESSIONS / FOOD ITEMS
 */
export const getAllConcessions = async (req, res) => {
  try {
    const { category } = req.query;
    let query = "SELECT * FROM food_items WHERE available = true";
    const params = [];

    if (category && category !== "ALL") {
      params.push(category);
      query += " AND category = $1";
    }

    query += " ORDER BY category ASC, price ASC";

    const result = await pool.query(query, params);
    return res.json(
      result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        price: parseFloat(r.price),
        image_url: r.image_url,
        available: r.available,
      }))
    );
  } catch (error) {
    console.error("Error fetching concessions:", error.message);
    return res.status(500).json({ message: "Failed to fetch concessions menu" });
  }
};
