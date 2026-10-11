
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { pool } from "../config/db.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// STEP 1: CREATE RAZORPAY ORDER
export const createPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const bookingId = Number(req.body.booking_id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ message: "Valid booking_id is required." });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT * FROM bookings
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [bookingId, req.user.id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = result.rows[0];

    if (booking.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Only pending bookings can be paid for.",
      });
    }

    const seats = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (
                WHERE status = 'LOCKED'
                  AND locked_by = $2
                  AND lock_expires_at > NOW()
              )::int AS valid
       FROM show_seats
       WHERE booking_id = $1`,
      [booking.id, req.user.id]
    );

    if (
      seats.rows[0].total === 0 ||
      seats.rows[0].total !== seats.rows[0].valid
    ) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Seat reservation expired. Please book again.",
      });
    }

    const existing = await client.query(
      `SELECT id FROM payments
       WHERE booking_id = $1 AND status = 'PENDING'
       LIMIT 1`,
      [booking.id]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "A payment order already exists for this booking.",
      });
    }

    const amountPaise = Math.round(Number(booking.total_amount) * 100);

    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid booking amount." });
    }

    // Create the order with Razorpay while the booking is locked.
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `booking_${booking.id}`,
      notes: {
        booking_id: String(booking.id),
        user_id: String(req.user.id),
      },
    });

    const payment = await client.query(
      `INSERT INTO payments
         (booking_id, amount, status, payment_reference, razorpay_order_id)
       VALUES ($1, $2, 'PENDING', $3, $4)
       RETURNING id, booking_id, amount, status, razorpay_order_id`,
      [booking.id, booking.total_amount, order.id, order.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Razorpay order created.",
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      payment: payment.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create Razorpay order error:", error.message);
    return res.status(500).json({ message: "Failed to create payment order." });
  } finally {
    client.release();
  }
};

// STEP 2: VERIFY PAYMENT AND CONFIRM BOOKING
export const verifyPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return res.status(400).json({
        message: "Order ID, payment ID, and signature are required.",
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT p.id AS payment_id, p.booking_id, p.amount,
              p.status AS payment_status, p.razorpay_order_id,
              b.user_id, b.status AS booking_status, b.show_id
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE p.razorpay_order_id = $1
       FOR UPDATE OF p, b`,
      [razorpay_order_id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payment order not found." });
    }

    const payment = result.rows[0];

    if (payment.user_id !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "You cannot verify this payment." });
    }

    if (
      payment.payment_status === "SUCCESS" &&
      payment.booking_status === "CONFIRMED"
    ) {
      await client.query("ROLLBACK");
      return res.json({ message: "Payment already verified." });
    }

    if (
      payment.payment_status !== "PENDING" ||
      payment.booking_status !== "PENDING"
    ) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Booking is not payable." });
    }

    // Verify the signature using the order ID stored by the server.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${payment.razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const supplied = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      supplied.length !== expected.length ||
      !crypto.timingSafeEqual(supplied, expected)
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid payment signature." });
    }

    // Verify with Razorpay that this payment belongs to this order
    // and that the captured amount/currency match the booking.
    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

    const expectedAmount = Math.round(Number(payment.amount) * 100);

    if (
      razorpayPayment.order_id !== payment.razorpay_order_id ||
      razorpayPayment.status !== "captured" ||
      razorpayPayment.amount !== expectedAmount ||
      razorpayPayment.currency !== "INR"
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Payment is not captured or does not match the booking amount.",
      });
    }

    const reservation = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (
                WHERE status = 'LOCKED'
                  AND locked_by = $2
                  AND lock_expires_at > NOW()
              )::int AS valid
       FROM show_seats
       WHERE booking_id = $1
       FOR UPDATE`,
      [payment.booking_id, req.user.id]
    );

    if (
      reservation.rows[0].total === 0 ||
      reservation.rows[0].total !== reservation.rows[0].valid
    ) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Payment received but seat reservation has expired. Contact support.",
      });
    }

    await client.query(
      `UPDATE payments
       SET status = 'SUCCESS', payment_reference = $2
       WHERE id = $1`,
      [payment.payment_id, razorpay_payment_id]
    );

    await client.query(
      `UPDATE bookings SET status = 'CONFIRMED'
       WHERE id = $1`,
      [payment.booking_id]
    );

    await client.query(
      `UPDATE show_seats
       SET status = 'BOOKED',
           locked_by = NULL,
           lock_expires_at = NULL
       WHERE booking_id = $1`,
      [payment.booking_id]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Payment verified. Booking confirmed.",
      booking_id: payment.booking_id,
      status: "CONFIRMED",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Verify Razorpay payment error:", error.message);
    return res.status(500).json({ message: "Failed to verify payment." });
  } finally {
    client.release();
  }
};

// GET PAYMENT DETAILS FOR A BOOKING
export const getPaymentByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await pool.query(
      `SELECT p.id, p.booking_id, p.amount, p.status,
              p.payment_reference, p.razorpay_order_id, p.created_at,
              b.user_id
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE p.booking_id = $1
       ORDER BY p.created_at DESC`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Payment not found." });
    }

    if (
      result.rows[0].user_id !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "You cannot view this payment." });
    }

    return res.json(
      result.rows.map(({ user_id, ...payment }) => payment)
    );
  } catch (error) {
    console.error("Get payment error:", error.message);
    return res.status(500).json({ message: "Failed to fetch payment." });
  }
};
