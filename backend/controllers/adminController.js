
import { pool } from "../config/db.js";

// GET admin dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const [
      users,
      movies,
      theatres,
      shows,
      bookings,
      revenue
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM movies"),
      pool.query("SELECT COUNT(*) FROM theatres"),
      pool.query("SELECT COUNT(*) FROM shows"),
      pool.query("SELECT COUNT(*) FROM bookings"),
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS total_revenue
        FROM payments
        WHERE status = 'SUCCESS'
      `)
    ]);

    res.status(200).json({
      totalUsers: Number(users.rows[0].count),
      totalMovies: Number(movies.rows[0].count),
      totalTheatres: Number(theatres.rows[0].count),
      totalShows: Number(shows.rows[0].count),
      totalBookings: Number(bookings.rows[0].count),
      totalRevenue: Number(revenue.rows[0].total_revenue)
    });
  } catch (error) {
    console.error("Admin dashboard error:", error.message);
    res.status(500).json({
      message: "Failed to fetch admin dashboard statistics."
    });
  }
};
