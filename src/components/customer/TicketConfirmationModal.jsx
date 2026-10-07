import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  CheckCircle,
  Download,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Ticket,
  X,
  Share2,
  Utensils,
  Printer,
  Smartphone,
} from "lucide-react";

export default function TicketConfirmationModal({
  booking,
  onClose,
  onViewMyBookings,
}) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (booking?.ticket_code) {
      QRCode.toDataURL(booking.ticket_code, {
        width: 240,
        margin: 1,
        color: {
          dark: "#0b0e14",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("Error generating ticket QR:", err));
    }
  }, [booking?.ticket_code]);

  const showDateFormatted = booking.show_time
    ? new Date(booking.show_time).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const showTimeFormatted = booking.show_time
    ? new Date(booking.show_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ticket-modal-backdrop">
      <div className="ticket-modal-container">
        {/* Top Success Banner */}
        <div className="ticket-success-top-banner">
          <div className="success-badge-circle">
            <CheckCircle size={32} className="icon-emerald" />
          </div>
          <h2>Booking Confirmed!</h2>
          <p>Your M-Ticket has been issued. An SMS & Email confirmation was sent.</p>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close Ticket"
          >
            <X size={20} />
          </button>
        </div>

        {/* BookMyShow Perforated Cinema Ticket Pass */}
        <div className="cinema-ticket-pass">
          {/* Main Ticket Body */}
          <div className="ticket-main-section">
            <div className="ticket-top-brand">
              <div className="brand-logo-text">
                <Sparkles size={16} className="icon-crimson" />
                <span>CINESHOW DIGITAL M-TICKET</span>
              </div>
              <span className="ticket-status-pill">CONFIRMED</span>
            </div>

            <div className="ticket-movie-row">
              {booking.movie_poster && (
                <img
                  src={booking.movie_poster}
                  alt={booking.movie_title}
                  className="ticket-movie-poster"
                />
              )}
              <div className="ticket-movie-info">
                <h3>{booking.movie_title}</h3>
                <div className="ticket-tags-row">
                  <span className="badge-cert">{booking.movie_certificate || "U/A"}</span>
                  <span className="badge-format">{booking.screen_format || "IMAX Laser"}</span>
                  <span className="badge-lang">{booking.theatre_city}</span>
                </div>
                <div className="ticket-detail-item">
                  <MapPin size={13} className="icon-cyan" />
                  <span>{booking.theatre_name}</span>
                </div>
                <div className="ticket-detail-item">
                  <Calendar size={13} className="icon-cyan" />
                  <span>{showDateFormatted} • {showTimeFormatted}</span>
                </div>
              </div>
            </div>

            {/* Seating & Audi details */}
            <div className="ticket-meta-grid">
              <div className="ticket-meta-cell">
                <span className="cell-lbl">AUDITORIUM</span>
                <span className="cell-val highlight">{booking.screen_name || "Audi 1"}</span>
              </div>
              <div className="ticket-meta-cell">
                <span className="cell-lbl">SEATS</span>
                <span className="cell-val highlight">
                  {booking.seats_summary?.map((s) => `${s.row}${s.number}`).join(", ") ||
                    booking.seat_ids?.join(", ")}
                </span>
              </div>
              <div className="ticket-meta-cell">
                <span className="cell-lbl">TICKETS</span>
                <span className="cell-val">{booking.seat_ids?.length} Seats</span>
              </div>
              <div className="ticket-meta-cell">
                <span className="cell-lbl">PAID AMOUNT</span>
                <span className="cell-val">₹{booking.total_amount}</span>
              </div>
            </div>

            {/* Food & Beverage Add-ons on Ticket */}
            {booking.fnb_items && booking.fnb_items.length > 0 && (
              <div className="ticket-fnb-token-bar">
                <div className="token-left">
                  <Utensils size={14} className="icon-amber" />
                  <span>F&B Pickup Token:</span>
                </div>
                <div className="token-items">
                  {booking.fnb_items.map((item) => (
                    <span key={item.id} className="fnb-pickup-item">
                      {item.name} (x{item.quantity})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ticket Perforation Rip Line */}
          <div className="ticket-perforation-divider">
            <div className="perforation-notch notch-left" />
            <div className="perforation-dashed-line" />
            <div className="perforation-notch notch-right" />
          </div>

          {/* QR Code Gate Pass Stub */}
          <div className="ticket-stub-section">
            <div className="qr-box">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Gate Pass ${booking.ticket_code}`}
                  className="ticket-qr-img"
                />
              ) : (
                <div className="qr-placeholder">Generating Gate Pass...</div>
              )}
              <span className="ticket-code-display">{booking.ticket_code}</span>
              <span className="qr-scan-hint">Scan at Cinema Door Gate</span>
            </div>

            <div className="entry-gate-badge">
              <Smartphone size={13} className="icon-emerald" />
              <span>Contactless M-Ticket Entry</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="ticket-modal-actions-footer">
          <button
            type="button"
            className="btn-ticket-action"
            onClick={handlePrint}
          >
            <Printer size={16} />
            <span>Print Pass</span>
          </button>

          <button
            type="button"
            className="btn-ticket-action primary"
            onClick={onViewMyBookings}
          >
            <Ticket size={16} />
            <span>View in My Bookings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
