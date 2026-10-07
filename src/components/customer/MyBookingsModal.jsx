import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  X,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  QrCode,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { getMyBookings, cancelBooking } from "../../services/customerBookingService";

export default function MyBookingsModal({
  onClose,
  onOpenTicketPass,
  onBookingCancelled,
}) {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("ALL"); // "ALL" | "CONFIRMED" | "CANCELLED"
  const [selectedBookingForQr, setSelectedBookingForQr] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const refreshBookings = () => {
    const list = getMyBookings();
    setBookings(list);
  };

  useEffect(() => {
    refreshBookings();
  }, []);

  const handleShowQr = (b) => {
    setSelectedBookingForQr(b);
    if (b.ticket_code) {
      QRCode.toDataURL(b.ticket_code, { width: 220, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((e) => console.error(e));
    }
  };

  const handleCancelBooking = (bookingId) => {
    try {
      cancelBooking(bookingId);
      setConfirmCancelId(null);
      setFeedbackMsg("Booking cancelled successfully. Reserved seats have been freed.");
      refreshBookings();
      if (onBookingCancelled) onBookingCancelled();
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err) {
      setFeedbackMsg(err.message || "Failed to cancel booking.");
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === "CONFIRMED") return b.status === "CONFIRMED";
    if (filter === "CANCELLED") return b.status === "CANCELLED";
    return true;
  });

  return (
    <div className="bookings-modal-backdrop">
      <div className="bookings-modal-container">
        {/* Header */}
        <div className="bookings-modal-header">
          <div className="bookings-header-title">
            <Ticket size={22} className="icon-cyan" />
            <div>
              <h2>My Movie Tickets</h2>
              <p>Manage your reservations, view gate passes, or cancel bookings</p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {feedbackMsg && (
          <div className="bookings-feedback-banner">
            <CheckCircle size={16} />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bookings-tabs-bar">
          <button
            className={`tab-btn ${filter === "ALL" ? "active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            className={`tab-btn ${filter === "CONFIRMED" ? "active" : ""}`}
            onClick={() => setFilter("CONFIRMED")}
          >
            Active & Confirmed ({bookings.filter((b) => b.status === "CONFIRMED").length})
          </button>
          <button
            className={`tab-btn ${filter === "CANCELLED" ? "active" : ""}`}
            onClick={() => setFilter("CANCELLED")}
          >
            Cancelled ({bookings.filter((b) => b.status === "CANCELLED").length})
          </button>
        </div>

        {/* Bookings List */}
        <div className="bookings-scroll-area">
          {filteredBookings.length === 0 ? (
            <div className="no-bookings-empty-state">
              <Ticket size={48} className="empty-icon" />
              <h3>No bookings found</h3>
              <p>
                {filter === "ALL"
                  ? "You haven't reserved any movies yet. Browse the catalog and pick your seats!"
                  : `No ${filter.toLowerCase()} bookings found.`}
              </p>
            </div>
          ) : (
            <div className="bookings-cards-grid">
              {filteredBookings.map((b) => {
                const isConfirmed = b.status === "CONFIRMED";
                const isCancelled = b.status === "CANCELLED";
                const dateStr = b.show_time
                  ? new Date(b.show_time).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                const timeStr = b.show_time
                  ? new Date(b.show_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "";

                return (
                  <div key={b.id} className={`booking-record-card ${b.status.toLowerCase()}`}>
                    <div className="card-top-header">
                      <div className="booking-ref-id mono">ID #{b.id}</div>
                      <span className={`status-pill ${b.status.toLowerCase()}`}>
                        {isConfirmed && <CheckCircle size={12} />}
                        {isCancelled && <XCircle size={12} />}
                        {b.status}
                      </span>
                    </div>

                    <div className="booking-card-main">
                      {b.movie_poster && (
                        <img
                          src={b.movie_poster}
                          alt={b.movie_title}
                          className="booking-card-poster"
                        />
                      )}
                      <div className="booking-card-details">
                        <h4>{b.movie_title}</h4>
                        <div className="booking-sub-meta">
                          <span className="badge-format">{b.screen_format}</span>
                          <span className="badge-cert">{b.theatre_city}</span>
                        </div>
                        <div className="meta-line">
                          <MapPin size={13} className="icon-cyan" />
                          <span>{b.theatre_name} • {b.screen_name}</span>
                        </div>
                        <div className="meta-line">
                          <Calendar size={13} className="icon-cyan" />
                          <span>{dateStr} • {timeStr}</span>
                        </div>
                        <div className="meta-line">
                          <Ticket size={13} className="icon-amber" />
                          <span>
                            Seats: <strong>{b.seats_summary?.map((s) => `${s.row}${s.number}`).join(", ")}</strong> ({b.seat_ids?.length} Seats)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="booking-card-footer">
                      <div className="total-paid-tag">
                        <span>Paid: </span>
                        <strong>₹{b.total_amount}</strong>
                      </div>

                      <div className="action-buttons-group">
                        {isConfirmed && (
                          <>
                            <button
                              type="button"
                              className="btn-qr-pass"
                              onClick={() => handleShowQr(b)}
                              title="Show entry QR barcode"
                            >
                              <QrCode size={15} />
                              <span>QR Pass</span>
                            </button>

                            {confirmCancelId === b.id ? (
                              <div className="confirm-cancel-box">
                                <span>Cancel & refund?</span>
                                <button
                                  className="btn-confirm-yes"
                                  onClick={() => handleCancelBooking(b.id)}
                                >
                                  Yes
                                </button>
                                <button
                                  className="btn-confirm-no"
                                  onClick={() => setConfirmCancelId(null)}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn-cancel-ticket"
                                onClick={() => setConfirmCancelId(b.id)}
                                title="Cancel this reservation and release seats"
                              >
                                <Trash2 size={14} />
                                <span>Cancel</span>
                              </button>
                            )}
                          </>
                        )}
                        {isCancelled && (
                          <span className="cancelled-note">Reservation released</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* QR Code Quick Modal Overlay */}
        {selectedBookingForQr && (
          <div
            className="qr-popup-backdrop"
            onClick={() => setSelectedBookingForQr(null)}
          >
            <div className="qr-popup-box" onClick={(e) => e.stopPropagation()}>
              <div className="qr-popup-header">
                <h3>Door Gate Pass</h3>
                <button
                  className="btn-modal-close"
                  onClick={() => setSelectedBookingForQr(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="qr-popup-body">
                <div className="qr-img-wrapper">
                  {qrDataUrl && <img src={qrDataUrl} alt="QR Code" />}
                </div>
                <div className="qr-code-text mono">{selectedBookingForQr.ticket_code}</div>
                <p className="qr-movie-title">{selectedBookingForQr.movie_title}</p>
                <p className="qr-seats-text">
                  Seats: {selectedBookingForQr.seats_summary?.map((s) => `${s.row}${s.number}`).join(", ")}
                </p>
                <div className="qr-scan-instruction">
                  Scan at cinema entry gate for instant admission
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
