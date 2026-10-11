import crypto from "node:crypto";
import { pool } from "../config/db.js";
import { sendTicketEmail } from "../services/ticketService.js";

// DEMO PAYMENT: No real money is charged.
export const createPayment = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const bookingId = Number(req.body.booking_id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        message: "Valid booking_id is required.",
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `SELECT *
       FROM bookings
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [bookingId, req.user.id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    const booking = result.rows[0];

    if (booking.status !== "PENDING") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        message: "Only pending bookings can be paid for.",
      });
    }

    // Verify that all seats are still locked by this user.
    const seatResult = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (
                WHERE status = 'LOCKED'
                  AND locked_by = $2
                  AND lock_expires_at > NOW()
              )::int AS valid
       FROM show_seats
       WHERE booking_id = $1`,
      [bookingId, req.user.id]
    );

    const { total, valid } = seatResult.rows[0];

    if (total === 0 || total !== valid) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        message: "Seat reservation expired. Please book again.",
      });
    }

    const amount = Number(booking.total_amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: "Invalid booking amount.",
      });
    }

    // Generate a unique demo reference.
    const demoReference = `DEMO-${crypto.randomUUID()}`;

    // Save the simulated payment as successful.
    // razorpay_order_id is populated to support schemas
    // where this existing column is required.
    await client.query(
      `INSERT INTO payments
         (booking_id, amount, status, payment_reference,
          razorpay_order_id)
       VALUES ($1, $2, 'SUCCESS', $3, $4)`,
      [bookingId, amount, demoReference, demoReference]
    );

    await client.query(
      `UPDATE bookings
       SET status = 'CONFIRMED'
       WHERE id = $1`,
      [bookingId]
    );

    await client.query(
      `UPDATE show_seats
       SET status = 'BOOKED',
           locked_by = NULL,
           lock_expires_at = NULL
       WHERE booking_id = $1`,
      [bookingId]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    // Send the ticket only after the database transaction commits.
    sendTicketEmail(bookingId).catch((error) => {
      console.error(
        `Ticket email failed for booking ${bookingId}:`,
        error.message
      );
    });

    return res.status(200).json({
      message: "Demo payment successful. Booking confirmed.",
      payment_mode: "DEMO",
      booking_id: bookingId,
      status: "CONFIRMED",
      payment_status: "SUCCESS",
      ticket_email: "Sending",
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Demo payment error:", error.message);

    return res.status(500).json({
      message: "Failed to process demo payment.",
    });
  } finally {
    client.release();
  }
};

// Razorpay verification is no longer used.
export const verifyPayment = async (req, res) => {
  return res.status(410).json({
    message:
      "Razorpay verification is disabled. Use the demo payment endpoint instead.",
  });
};

// Get payment details for a booking.
export const getPaymentByBooking = async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        message: "Invalid booking ID.",
      });
    }

    const result = await pool.query(
      `SELECT p.id, p.booking_id, p.amount, p.status,
              p.payment_reference, p.created_at, b.user_id
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE p.booking_id = $1
       ORDER BY p.created_at DESC`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    if (
      Number(result.rows[0].user_id) !== Number(req.user.id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "You cannot view this payment.",
      });
    }

    return res.json(
      result.rows.map(({ user_id, ...payment }) => payment)
    );
  } catch (error) {
    console.error("Get payment error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch payment.",
    });
  }
};
