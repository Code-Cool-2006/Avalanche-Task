import { pool } from "../config/db.js";

/**
 * GET ALL SHOWS (with optional filters: movieId, city, date, theatreId, screenId)
 */
export const getAllShows = async (req, res) => {
  try {
    const { movieId, movie_id, city, date, theatreId, theatre_id, screenId, screen_id } = req.query;

    const targetMovieId = movieId || movie_id;
    const targetTheatreId = theatreId || theatre_id;
    const targetScreenId = screenId || screen_id;

    const conditions = [];
    const params = [];

    if (targetMovieId) {
      params.push(parseInt(targetMovieId, 10));
      conditions.push(`s.movie_id = $${params.length}`);
    }

    if (city) {
      params.push(`%${city.toLowerCase().trim()}%`);
      conditions.push(`LOWER(t.city) LIKE $${params.length}`);
    }

    if (date) {
      params.push(date);
      conditions.push(`s.start_time::date = $${params.length}::date`);
    }

    if (targetTheatreId) {
      params.push(parseInt(targetTheatreId, 10));
      conditions.push(`s.theatre_id = $${params.length}`);
    }

    if (targetScreenId) {
      params.push(parseInt(targetScreenId, 10));
      conditions.push(`s.screen_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        s.id,
        s.movie_id,
        s.theatre_id,
        s.screen_id,
        s.start_time,
        s.end_time,
        s.language,
        s.format,
        s.price_regular,
        s.price_premium,
        s.price_recliner,
        s.status,
        s.created_at,
        m.title AS movie_title,
        m.poster_url AS movie_poster,
        m.rating AS movie_rating,
        m.genre AS movie_genre,
        m.duration_min AS movie_duration,
        t.name AS theatre_name,
        t.city AS theatre_city,
        t.address AS theatre_address,
        sc.name AS screen_name
      FROM shows s
      JOIN movies m ON s.movie_id = m.id
      JOIN theatres t ON s.theatre_id = t.id
      JOIN screens sc ON s.screen_id = sc.id
      ${whereClause}
      ORDER BY s.start_time ASC
    `;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching shows:", error.message);
    return res.status(500).json({ message: "Failed to fetch shows" });
  }
};

/**
 * GET SHOW BY ID
 */
export const getShowById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        s.id,
        s.movie_id,
        s.theatre_id,
        s.screen_id,
        s.start_time,
        s.end_time,
        s.language,
        s.format,
        s.price_regular,
        s.price_premium,
        s.price_recliner,
        s.status,
        s.created_at,
        m.title AS movie_title,
        m.description AS movie_description,
        m.poster_url AS movie_poster,
        m.trailer_url AS movie_trailer,
        m.rating AS movie_rating,
        m.genre AS movie_genre,
        m.duration_min AS movie_duration,
        t.name AS theatre_name,
        t.city AS theatre_city,
        t.address AS theatre_address,
        sc.name AS screen_name
      FROM shows s
      JOIN movies m ON s.movie_id = m.id
      JOIN theatres t ON s.theatre_id = t.id
      JOIN screens sc ON s.screen_id = sc.id
      WHERE s.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Show not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching show by ID:", error.message);
    return res.status(500).json({ message: "Failed to fetch show by ID" });
  }
};

/**
 * GET SEATS FOR A SPECIFIC SHOW (Show-specific availability + expired lock normalization)
 */
export const getSeatsByShow = async (req, res) => {
  try {
    const { showId } = req.params;

    // Verify show exists
    const showRes = await pool.query(
      `SELECT s.*, sc.theatre_id, sc.name as screen_name 
       FROM shows s 
       JOIN screens sc ON s.screen_id = sc.id 
       WHERE s.id = $1`,
      [showId]
    );

    if (showRes.rows.length === 0) {
      return res.status(404).json({ message: "Show not found" });
    }

    const show = showRes.rows[0];

    // Fetch physical seats joined with show_seats status
    const seatsQuery = `
      SELECT 
        st.id AS seat_id,
        st.row_label,
        st.seat_number,
        st.tier,
        ss.id AS show_seat_id,
        COALESCE(
          CASE 
            WHEN ss.status = 'LOCKED' AND ss.locked_until <= NOW() THEN 'AVAILABLE'
            ELSE ss.status 
          END, 
          'AVAILABLE'
        ) AS status,
        CASE 
          WHEN ss.status = 'LOCKED' AND ss.locked_until > NOW() THEN ss.locked_until
          ELSE NULL 
        END AS locked_until,
        CASE 
          WHEN st.tier = 'premium' THEN $2
          WHEN st.tier = 'recliner' THEN $3
          ELSE $4
        END AS price
      FROM seats st
      LEFT JOIN show_seats ss ON ss.show_id = $1 AND ss.seat_id = st.id
      WHERE st.screen_id = $5
      ORDER BY st.row_label ASC, st.seat_number ASC
    `;

    const result = await pool.query(seatsQuery, [
      show.id,
      show.price_premium,
      show.price_recliner,
      show.price_regular,
      show.screen_id,
    ]);

    return res.json({
      show: {
        id: show.id,
        movie_id: show.movie_id,
        theatre_id: show.theatre_id,
        screen_id: show.screen_id,
        screen_name: show.screen_name,
        start_time: show.start_time,
        format: show.format,
        pricing: {
          regular: Number(show.price_regular),
          premium: Number(show.price_premium),
          recliner: Number(show.price_recliner),
        },
      },
      seats: result.rows,
    });
  } catch (error) {
    console.error("Error fetching show seats:", error.message);
    return res.status(500).json({ message: "Failed to fetch show seats" });
  }
};
