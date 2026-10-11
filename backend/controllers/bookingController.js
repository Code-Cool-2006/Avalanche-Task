
import crypto from "node:crypto";
import { pool } from "../config/db.js";

// CREATE A BOOKING
export const createBooking = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const userId = req.user.id;
    const { show_id, seat_ids } = req.body;

    if (
      !Number.isInteger(Number(show_id)) ||
      Number(show_id) <= 0 ||
      !Array.isArray(seat_ids) ||
      seat_ids.length === 0 ||
      seat_ids.length > 10 ||
      !seat_ids.every(
        (id) => Number.isInteger(Number(id)) && Number(id) > 0
      )
    ) {
      return res.status(400).json({
        message: "Provide a valid show_id and between 1 and 10 seat_ids.",
      });
    }

    const showId = Number(show_id);
    const seatIds = seat_ids.map(Number);

    if (new Set(seatIds).size !== seatIds.length) {
      return res.status(400).json({
        message: "Duplicate seat IDs are not allowed.",
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    // Serialize booking attempts for the same show.
    const showResult = await client.query(
      `SELECT id, screen_id, start_time,
              price_regular, price_premium, price_recliner
       FROM shows
       WHERE id = $1
       FOR UPDATE`,
      [showId]
    );

    if (showResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({ message: "Show not found." });
    }

    const show = showResult.rows[0];

    if (new Date(show.start_time) <= new Date()) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({
        message: "Cannot book a show that has already started.",
      });
    }

    // Make sure every requested seat belongs to this show's screen.
    const seatsResult = await client.query(
      `SELECT id, row_label, seat_number, tier
       FROM seats
       WHERE id = ANY($1::int[]) AND screen_id = $2
       ORDER BY id
       FOR UPDATE`,
      [seatIds, show.screen_id]
    );

    if (seatsResult.rows.length !== seatIds.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({
        message: "One or more seats do not belong to this show's screen.",
      });
    }

    const seats = seatsResult.rows;
    let totalAmount = 0;

    const pricedSeats = seats.map((seat) => {
      const priceColumn = {
        regular: show.price_regular,
        premium: show.price_premium,
        recliner: show.price_recliner,
      };

      const unitPrice = Number(priceColumn[seat.tier]);

      if ( priceColumn[seat.tier] == null ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0) {
        throw new Error(`Invalid price configured for ${seat.tier} seats.`);
      }

      totalAmount += unitPrice;
      return { ...seat, unitPrice };
    });

    // Reserve each seat for 10 minutes. Expired locks can be reclaimed.
    for (const seatId of seatIds) {
      await client.query(
        `INSERT INTO show_seats
           (show_id, seat_id, status, locked_by, lock_expires_at)
         VALUES ($1, $2, 'LOCKED', $3, NOW() + INTERVAL '10 minutes')
         ON CONFLICT (show_id, seat_id) DO NOTHING`,
        [showId, seatId, userId]
      );

      const lockResult = await client.query(
        `SELECT status, locked_by, lock_expires_at, booking_id
         FROM show_seats
         WHERE show_id = $1 AND seat_id = $2
         FOR UPDATE`,
        [showId, seatId]
      );

      const lock = lockResult.rows[0];
      const isExpired =
        lock.status === "LOCKED" &&
        (!lock.lock_expires_at ||
          new Date(lock.lock_expires_at) <= new Date());

      if (lock.status === "BOOKED" || (!isExpired)) {
        throw Object.assign(new Error("A selected seat is unavailable."), {
          statusCode: 409,
        });
      }

      if (lock.booking_id) {
        await client.query(
          `UPDATE bookings
           SET status = 'EXPIRED'
           WHERE id = $1 AND status = 'PENDING'`,
          [lock.booking_id]
        );
      }

      await client.query(
        `UPDATE show_seats
         SET status = 'LOCKED',
             locked_by = $3,
             lock_expires_at = NOW() + INTERVAL '10 minutes',
             booking_id = NULL
         WHERE show_id = $1 AND seat_id = $2`,
        [showId, seatId, userId]
      );
    }

    const ticketCode = crypto.randomBytes(12).toString("hex").toUpperCase();

    const bookingResult = await client.query(
      `INSERT INTO bookings
         (user_id, show_id, status, total_amount, ticket_code)
       VALUES ($1, $2, 'PENDING', $3, $4)
       RETURNING *`,
      [userId, showId, totalAmount.toFixed(2), ticketCode]
    );

    const booking = bookingResult.rows[0];

    for (const seat of pricedSeats) {
      await client.query(
        `INSERT INTO booking_seats
           (booking_id, seat_id, row_label, seat_number, tier, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          booking.id,
          seat.id,
          seat.row_label,
          seat.seat_number,
          seat.tier,
          seat.unitPrice.toFixed(2),
        ]
      );

      await client.query(
        `UPDATE show_seats
         SET booking_id = $3
         WHERE show_id = $1 AND seat_id = $2`,
        [showId, seat.id, booking.id]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "Seats reserved. Complete payment before the lock expires.",
      booking,
      seats: pricedSeats,
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (error.statusCode === 409) {
      return res.status(409).json({ message: error.message });
    }

    console.error("Create booking error:", error.message);
    return res.status(500).json({ message: "Failed to create booking." });
  } finally {
    client.release();
  }
};

// GET THE LOGGED-IN USER'S BOOKINGS
export const getMyBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, m.title AS movie_title, s.start_time,
              t.name AS theatre_name, sc.name AS screen_name
       FROM bookings b
       JOIN shows s ON s.id = b.show_id
       JOIN movies m ON m.id = s.movie_id
       JOIN screens sc ON sc.id = s.screen_id
       JOIN theatres t ON t.id = sc.theatre_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Get my bookings error:", error.message);
    return res.status(500).json({ message: "Failed to fetch bookings." });
  }
};

// GET ONE BOOKING (OWNER OR ADMIN)
export const getBookingById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, m.title AS movie_title, s.start_time,
              t.name AS theatre_name, sc.name AS screen_name
       FROM bookings b
       JOIN shows s ON s.id = b.show_id
       JOIN movies m ON m.id = s.movie_id
       JOIN screens sc ON sc.id = s.screen_id
       JOIN theatres t ON t.id = sc.theatre_id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = result.rows[0];

    if (booking.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "You cannot access this booking." });
    }

    const seats = await pool.query(
      `SELECT seat_id, row_label, seat_number, tier, unit_price
       FROM booking_seats
       WHERE booking_id = $1
       ORDER BY row_label, seat_number`,
      [booking.id]
    );

    return res.json({ ...booking, seats: seats.rows });
  } catch (error) {
    console.error("Get booking error:", error.message);
    return res.status(500).json({ message: "Failed to fetch booking." });
  }
};

// CANCEL A PENDING BOOKING
export const cancelBooking = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = result.rows[0];

    if (booking.user_id !== req.user.id && req.user.role !== "admin") {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "You cannot cancel this booking." });
    }

    if (booking.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Only pending bookings can be cancelled through this endpoint.",
      });
    }

    await client.query(
      `UPDATE bookings SET status = 'CANCELLED' WHERE id = $1`,
      [booking.id]
    );

    await client.query(
      `DELETE FROM show_seats
       WHERE booking_id = $1 AND status = 'LOCKED'`,
      [booking.id]
    );

    await client.query("COMMIT");

    return res.json({ message: "Pending booking cancelled successfully." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Cancel booking error:", error.message);
    return res.status(500).json({ message: "Failed to cancel booking." });
  } finally {
    client.release();
  }
};

// ADMIN: GET ALL BOOKINGS
export const getAllBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, u.name AS customer_name, u.email AS customer_email,
              m.title AS movie_title, s.start_time,
              t.name AS theatre_name, sc.name AS screen_name
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN shows s ON s.id = b.show_id
       JOIN movies m ON m.id = s.movie_id
       JOIN screens sc ON sc.id = s.screen_id
       JOIN theatres t ON t.id = sc.theatre_id
       ORDER BY b.created_at DESC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Get all bookings error:", error.message);
    return res.status(500).json({ message: "Failed to fetch all bookings." });
  }
};
