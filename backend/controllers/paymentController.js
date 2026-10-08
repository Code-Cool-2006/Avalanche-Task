import { pool } from "../config/db.js";

/**
 * POST /api/payments/process
 * Records a payment transaction linked to an authenticated user's booking
 */
export const processPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId, amount, paymentMethod = "UPI" } = req.body;

    if (!bookingId || amount === undefined) {
      return res.status(400).json({ message: "bookingId and amount are required" });
    }

    const bookingRes = await pool.query(
      "SELECT id, user_id, total_amount, status FROM bookings WHERE id = $1",
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingRes.rows[0];

    if (booking.user_id !== userId) {
      return res.status(403).json({ message: "Unauthorized: booking does not belong to current user" });
    }

    const txnId = "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 10000);

    const paymentRes = await pool.query(
      `INSERT INTO payments (booking_id, user_id, amount, currency, provider, provider_payment_id, status)
       VALUES ($1, $2, $3, 'INR', $4, $5, 'SUCCESS')
       RETURNING *`,
      [booking.id, userId, parseFloat(amount), paymentMethod, txnId]
    );

    return res.status(201).json({
      message: "Payment processed successfully",
      payment: paymentRes.rows[0],
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({ message: "Payment processing failed: " + error.message });
  }
};
