
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { pool } from "../config/db.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Fetch confirmed booking and its ticket details.
async function getTicketData(bookingId) {
  const result = await pool.query(
    `SELECT
       b.id AS booking_id,
       b.user_id,
       b.status,
       b.total_amount,
       b.ticket_code,
       u.name AS customer_name,
       u.email AS customer_email,
       m.title AS movie_title,
       m.language,
       m.duration_min,
       s.start_time,
       t.name AS theatre_name,
       t.address AS theatre_address,
       t.city,
       sc.name AS screen_name
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     JOIN shows s ON s.id = b.show_id
     JOIN movies m ON m.id = s.movie_id
     JOIN screens sc ON sc.id = s.screen_id
     JOIN theatres t ON t.id = sc.theatre_id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Booking not found.");
    error.statusCode = 404;
    throw error;
  }

  const booking = result.rows[0];

  if (booking.status !== "CONFIRMED") {
    const error = new Error(
      "A ticket is available only after payment is confirmed."
    );
    error.statusCode = 409;
    throw error;
  }

  const seatsResult = await pool.query(
    `SELECT row_label, seat_number, tier, unit_price
     FROM booking_seats
     WHERE booking_id = $1
     ORDER BY row_label, seat_number`,
    [bookingId]
  );

  if (seatsResult.rows.length === 0) {
    throw new Error("No seats found for this booking.");
  }

  return { booking, seats: seatsResult.rows };
}

// Generate a PDF buffer. This can be emailed or downloaded.
export async function generateTicketPdf(bookingId) {
  const { booking, seats } = await getTicketData(bookingId);

  const qrCode = await QRCode.toDataURL(booking.ticket_code);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(24).text("MOVIEBOOKING", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).text("MOVIE TICKET", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Movie: ${booking.movie_title}`);
    doc.fontSize(11).text(`Language: ${booking.language || "N/A"}`);
    doc.text(
      `Duration: ${
        booking.duration_min
          ? `${booking.duration_min} minutes`
          : "N/A"
      }`
    );

    doc.moveDown();
    doc.fontSize(14).text(`Theatre: ${booking.theatre_name}`);
    doc.fontSize(11).text(
      `Address: ${booking.theatre_address || "N/A"}, ${booking.city || ""}`
    );
    doc.text(`Screen: ${booking.screen_name}`);
    doc.text(
      `Showtime: ${new Date(booking.start_time).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })}`
    );

    doc.moveDown();
    doc.fontSize(12).text(`Booking ID: ${booking.booking_id}`);
    doc.text(`Customer: ${booking.customer_name}`);
    doc.text(`Seats: ${seats
      .map((seat) => `${seat.row_label}${seat.seat_number} (${seat.tier})`)
      .join(", ")}`);
    doc.text(`Total paid: INR ${Number(booking.total_amount).toFixed(2)}`);
    doc.text(`Ticket code: ${booking.ticket_code}`);

    doc.moveDown();
    doc.fontSize(10).text(
      "Present this ticket at the theatre. Keep your ticket code private."
    );

    const base64 = qrCode.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(base64, "base64");

    doc.moveDown();
    doc.image(qrBuffer, {
      fit: [140, 140],
      align: "center",
    });

    doc.end();
  });
}

// Email the ticket PDF to the registered customer.
export async function sendTicketEmail(bookingId) {
  const { booking } = await getTicketData(bookingId);
  const pdfBuffer = await generateTicketPdf(bookingId);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are not configured.");
  }

  await transporter.sendMail({
    from: `"MovieBooking" <${process.env.SMTP_USER}>`,
    to: booking.customer_email,
    subject: `Your movie ticket - ${booking.movie_title}`,
    text: [
      `Hello ${booking.customer_name},`,
      "",
      "Your payment was successful and your movie booking is confirmed.",
      `Movie: ${booking.movie_title}`,
      `Booking ID: ${booking.booking_id}`,
      `Ticket code: ${booking.ticket_code}`,
      "",
      "Your ticket PDF is attached. Please present it at the theatre.",
    ].join("\n"),
    attachments: [
      {
        filename: `MovieBooking-Ticket-${booking.booking_id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

