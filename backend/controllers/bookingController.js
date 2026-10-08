import { pool } from "../config/db.js";
import crypto from "node:crypto";

/**
 * Generate unique human-readable booking code
 */
function generateBookingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BMS-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += "-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/**
 * POST /api/bookings/reserve
 * Transactional seat reservation with 5-minute hold lock
 */
export const reserveSeats = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { showId, seatIds, fnbItems = [] } = req.body;

    if (!showId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ message: "showId and seatIds array are required" });
    }

    const numShowId = parseInt(showId, 10);
    const parsedSeatIds = seatIds.map((id) => parseInt(id, 10)).filter(Boolean);

    await client.query("BEGIN");

    // 1. Verify show exists and retrieve details
    const showRes = await client.query(
      `SELECT s.*, sc.theatre_id 
       FROM shows s 
       JOIN screens sc ON s.screen_id = sc.id 
       WHERE s.id = $1`,
      [numShowId]
    );

    if (showRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Show not found" });
    }
    const show = showRes.rows[0];

    // 2. Fetch requested seats with row-level locks
    const seatsRes = await client.query(
      `SELECT 
         st.id AS seat_id,
         st.row_label,
         st.seat_number,
         st.tier,
         ss.id AS show_seat_id,
         ss.status AS current_status,
         ss.locked_by,
         ss.locked_until,
         CASE 
           WHEN st.tier = 'premium' THEN $3
           WHEN st.tier = 'recliner' THEN $4
           ELSE $5
         END AS unit_price
       FROM seats st
       LEFT JOIN show_seats ss ON ss.show_id = $1 AND ss.seat_id = st.id
       WHERE st.screen_id = $2 AND st.id = ANY($6::int[])
       FOR UPDATE OF ss`,
      [
        numShowId,
        show.screen_id,
        show.price_premium,
        show.price_recliner,
        show.price_regular,
        parsedSeatIds,
      ]
    );

    if (seatsRes.rows.length !== parsedSeatIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "One or more selected seats do not belong to this auditorium screen" });
    }

    const now = new Date();
    const lockDurationMs = 5 * 60 * 1000;
    const lockExpiresAt = new Date(now.getTime() + lockDurationMs);

    let subtotal = 0;
    const seatsToHold = [];

    // 3. Validate seat availability and lock status
    for (const seat of seatsRes.rows) {
      const isBooked = seat.current_status === "BOOKED";
      const isLockedByOther =
        seat.current_status === "LOCKED" &&
        seat.locked_by !== userId &&
        seat.locked_until &&
        new Date(seat.locked_until) > now;

      if (isBooked) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: `Seat ${seat.row_label}${seat.seat_number} is already booked`,
        });
      }

      if (isLockedByOther) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: `Seat ${seat.row_label}${seat.seat_number} is currently held by another user`,
        });
      }

      subtotal += parseFloat(seat.unit_price);
      seatsToHold.push(seat);
    }

    // 4. Update or Insert show_seats records to LOCKED
    for (const seat of seatsToHold) {
      if (seat.show_seat_id) {
        await client.query(
          `UPDATE show_seats 
           SET status = 'LOCKED', locked_by = $1, locked_until = $2, updated_at = NOW() 
           WHERE id = $3`,
          [userId, lockExpiresAt.toISOString(), seat.show_seat_id]
        );
      } else {
        await client.query(
          `INSERT INTO show_seats (show_id, seat_id, status, locked_by, locked_until)
           VALUES ($1, $2, 'LOCKED', $3, $4)
           ON CONFLICT (show_id, seat_id)
           DO UPDATE SET status = 'LOCKED', locked_by = $3, locked_until = $4, updated_at = NOW()`,
          [numShowId, seat.seat_id, userId, lockExpiresAt.toISOString()]
        );
      }
    }

    // 5. Calculate Food total if concessions selected
    let foodTotal = 0;
    const validatedFnb = [];
    if (Array.isArray(fnbItems) && fnbItems.length > 0) {
      for (const item of fnbItems) {
        if (item.food_item_id && item.quantity > 0) {
          const foodRes = await client.query(
            "SELECT id, name, price, available FROM food_items WHERE id = $1",
            [item.food_item_id]
          );
          if (foodRes.rows.length > 0 && foodRes.rows[0].available) {
            const fi = foodRes.rows[0];
            const itemPrice = parseFloat(fi.price);
            foodTotal += itemPrice * item.quantity;
            validatedFnb.push({
              food_item_id: fi.id,
              quantity: item.quantity,
              unit_price: itemPrice,
            });
          }
        }
      }
    }

    // 6. Convenience fee (8% of ticket subtotal) and Total amount
    const convenienceFee = Math.round(subtotal * 0.08);
    const totalAmount = subtotal + foodTotal + convenienceFee;
    const bookingCode = generateBookingCode();

    // 7. Insert Header into bookings table
    const bookingRes = await client.query(
      `INSERT INTO bookings 
         (user_id, show_id, booking_code, status, subtotal, food_total, convenience_fee, total_amount)
       VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7)
       RETURNING *`,
      [userId, numShowId, bookingCode, subtotal, foodTotal, convenienceFee, totalAmount]
    );
    const booking = bookingRes.rows[0];

    // 8. Insert Snapshot rows into booking_seats
    for (const seat of seatsToHold) {
      await client.query(
        `INSERT INTO booking_seats (booking_id, seat_id, unit_price, row_label, seat_number, tier)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [booking.id, seat.seat_id, seat.unit_price, seat.row_label, seat.seat_number, seat.tier]
      );
    }

    // 9. Insert Food snapshot into booking_food
    for (const fi of validatedFnb) {
      await client.query(
        `INSERT INTO booking_food (booking_id, food_item_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [booking.id, fi.food_item_id, fi.quantity, fi.unit_price]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Seats reserved successfully for 5 minutes",
      booking: {
        id: booking.id,
        booking_code: booking.booking_code,
        show_id: booking.show_id,
        user_id: booking.user_id,
        status: booking.status,
        subtotal: parseFloat(booking.subtotal),
        food_total: parseFloat(booking.food_total),
        convenience_fee: parseFloat(booking.convenience_fee),
        total_amount: parseFloat(booking.total_amount),
        seat_ids: parsedSeatIds,
        seats: seatsToHold.map((s) => ({
          seat_id: s.seat_id,
          row_label: s.row_label,
          seat_number: s.seat_number,
          tier: s.tier,
          price: parseFloat(s.unit_price),
        })),
        locked_until: lockExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error during seat reservation:", error);
    return res.status(500).json({ message: "Failed to reserve seats: " + error.message });
  } finally {
    client.release();
  }
};

/**
 * POST /api/bookings/:id/confirm
 * Atomically confirms booking, finalizes BOOKED status on seats, logs payment, and issues ticket
 */
export const confirmBooking = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { paymentMethod = "Credit Card", providerPaymentId = null } = req.body;

    await client.query("BEGIN");

    // 1. Fetch booking with lock
    const bookingRes = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingRes.rows[0];

    if (booking.user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Unauthorized to confirm this booking" });
    }

    if (booking.status === "CONFIRMED") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Booking is already confirmed" });
    }

    if (booking.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Cannot confirm booking in ${booking.status} status` });
    }

    // 2. Fetch associated seats
    const bSeatsRes = await client.query(
      `SELECT bs.*, ss.id as show_seat_id, ss.status as seat_status, ss.locked_until, ss.locked_by
       FROM booking_seats bs
       LEFT JOIN show_seats ss ON ss.show_id = $1 AND ss.seat_id = bs.seat_id
       WHERE bs.booking_id = $2
       FOR UPDATE OF ss`,
      [booking.show_id, booking.id]
    );

    const now = new Date();

    // 3. Verify seat locks have not expired
    for (const s of bSeatsRes.rows) {
      const isExpired = !s.locked_until || new Date(s.locked_until) <= now;
      const isWrongOwner = s.locked_by !== userId;

      if (isExpired || isWrongOwner) {
        // Mark booking EXPIRED
        await client.query(
          "UPDATE bookings SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1",
          [booking.id]
        );
        await client.query("COMMIT");
        return res.status(400).json({
          message: "Your 5-minute seat lock has expired. Please select seats again.",
        });
      }
    }

    // 4. Mark show_seats permanently BOOKED
    for (const s of bSeatsRes.rows) {
      await client.query(
        `UPDATE show_seats 
         SET status = 'BOOKED', locked_by = NULL, locked_until = NULL, updated_at = NOW() 
         WHERE show_id = $1 AND seat_id = $2`,
        [booking.show_id, s.seat_id]
      );
    }

    // 5. Update booking status to CONFIRMED
    await client.query(
      "UPDATE bookings SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1",
      [booking.id]
    );

    // 6. Record Payment
    const paymentRes = await client.query(
      `INSERT INTO payments (booking_id, user_id, amount, currency, provider, provider_payment_id, status)
       VALUES ($1, $2, $3, 'INR', $4, $5, 'SUCCESS')
       RETURNING *`,
      [booking.id, userId, booking.total_amount, paymentMethod, providerPaymentId || "TXN-" + Date.now()]
    );

    // 7. Issue Digital Ticket
    const ticketNumber = "TKT-" + generateBookingCode();
    const ticketRes = await client.query(
      `INSERT INTO tickets (booking_id, ticket_number, status)
       VALUES ($1, $2, 'ISSUED')
       RETURNING *`,
      [booking.id, ticketNumber]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Booking confirmed successfully",
      booking: {
        id: booking.id,
        booking_code: booking.booking_code,
        status: "CONFIRMED",
        total_amount: parseFloat(booking.total_amount),
        payment: paymentRes.rows[0],
        ticket: ticketRes.rows[0],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error during booking confirmation:", error);
    return res.status(500).json({ message: "Failed to confirm booking: " + error.message });
  } finally {
    client.release();
  }
};

/**
 * POST /api/bookings/:id/cancel
 * Cancels a booking and releases locked/booked seats
 */
export const cancelBooking = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await client.query("BEGIN");

    const bookingRes = await client.query(
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (bookingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingRes.rows[0];

    if (booking.user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Unauthorized to cancel this booking" });
    }

    if (booking.status === "CANCELLED") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    // Fetch seats attached to this booking
    const seatsRes = await client.query(
      "SELECT seat_id FROM booking_seats WHERE booking_id = $1",
      [booking.id]
    );

    // Release show_seats
    for (const row of seatsRes.rows) {
      await client.query(
        `UPDATE show_seats 
         SET status = 'AVAILABLE', locked_by = NULL, locked_until = NULL, updated_at = NOW() 
         WHERE show_id = $1 AND seat_id = $2`,
        [booking.show_id, row.seat_id]
      );
    }

    // Update booking status
    await client.query(
      "UPDATE bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1",
      [booking.id]
    );

    // Update tickets if issued
    await client.query(
      "UPDATE tickets SET status = 'CANCELLED' WHERE booking_id = $1",
      [booking.id]
    );

    // Update payments if exists
    await client.query(
      "UPDATE payments SET status = 'REFUNDED', updated_at = NOW() WHERE booking_id = $1",
      [booking.id]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Booking cancelled successfully. Seats have been freed.",
      bookingId: booking.id,
      status: "CANCELLED",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error cancelling booking:", error);
    return res.status(500).json({ message: "Failed to cancel booking: " + error.message });
  } finally {
    client.release();
  }
};

/**
 * GET /api/bookings/my-bookings
 * Returns all bookings for the authenticated user with joined movie, theatre, show, and ticket details
 */
export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        b.id,
        b.booking_code,
        b.status,
        b.subtotal,
        b.food_total,
        b.convenience_fee,
        b.discount,
        b.total_amount,
        b.created_at,
        s.id AS show_id,
        s.start_time AS show_time,
        s.format AS screen_format,
        s.language AS show_language,
        m.id AS movie_id,
        m.title AS movie_title,
        m.poster_url AS movie_poster,
        m.rating AS movie_rating,
        t.name AS theatre_name,
        t.city AS theatre_city,
        t.address AS theatre_address,
        sc.name AS screen_name,
        tk.ticket_number,
        tk.status AS ticket_status,
        p.status AS payment_status,
        p.provider AS payment_method
      FROM bookings b
      JOIN shows s ON b.show_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN theatres t ON s.theatre_id = t.id
      JOIN screens sc ON s.screen_id = sc.id
      LEFT JOIN tickets tk ON tk.booking_id = b.id
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `;

    const bookingsRes = await pool.query(query, [userId]);
    const bookings = bookingsRes.rows;

    // Attach seats summary and food items for each booking
    const enrichedBookings = await Promise.all(
      bookings.map(async (b) => {
        const seatsRes = await pool.query(
          `SELECT seat_id, row_label, seat_number, tier, unit_price
           FROM booking_seats 
           WHERE booking_id = $1
           ORDER BY row_label, seat_number`,
          [b.id]
        );

        const foodRes = await pool.query(
          `SELECT bf.quantity, bf.unit_price, fi.name, fi.category
           FROM booking_food bf
           JOIN food_items fi ON bf.food_item_id = fi.id
           WHERE bf.booking_id = $1`,
          [b.id]
        );

        return {
          ...b,
          subtotal: parseFloat(b.subtotal),
          food_total: parseFloat(b.food_total),
          convenience_fee: parseFloat(b.convenience_fee),
          discount: parseFloat(b.discount),
          total_amount: parseFloat(b.total_amount),
          ticket_code: b.ticket_number || b.booking_code,
          seats: seatsRes.rows.map((s) => ({
            seat_id: s.seat_id,
            row: s.row_label,
            number: s.seat_number,
            tier: s.tier,
            price: parseFloat(s.unit_price),
          })),
          food_items: foodRes.rows.map((f) => ({
            name: f.name,
            category: f.category,
            quantity: f.quantity,
            price: parseFloat(f.unit_price),
          })),
        };
      })
    );

    return res.json(enrichedBookings);
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return res.status(500).json({ message: "Failed to fetch bookings: " + error.message });
  }
};
