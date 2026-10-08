import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Clock,
  Box,
  LayoutGrid,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";
import SeatMap2D from "./SeatMap2D";
import SeatMap3DView from "./SeatMap3DView";
import {
  fetchShowSeatsFromApi,
} from "../../services/customerBookingService";
import { useAuth } from "../../auth/AuthContext";

const SEAT_COUNTS = [
  { count: 1, icon: "🚲", vehicle: "Cycle" },
  { count: 2, icon: "🛵", vehicle: "Scooter" },
  { count: 3, icon: "🛺", vehicle: "Auto" },
  { count: 4, icon: "🚗", vehicle: "Mini" },
  { count: 5, icon: "🚙", vehicle: "Sedan" },
  { count: 6, icon: "🚐", vehicle: "SUV" },
  { count: 8, icon: "🚌", vehicle: "Van" },
  { count: 10, icon: "🚆", vehicle: "Coach" },
];

export default function SeatSelectionModal({
  showId,
  showDetails,
  onClose,
  onProceedToFnb,
}) {
  const { user } = useAuth();

  // Step 1: "How many seats?" BookMyShow pre-selector
  const [hasChosenSeatCount, setHasChosenSeatCount] = useState(false);
  const [desiredSeatCount, setDesiredSeatCount] = useState(2);

  const [viewMode, setViewMode] = useState("2d"); // "2d" | "3d"
  const [seatsData, setSeatsData] = useState({ rows: [], allSeats: [], pricing: {} });
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [lastSelectedSeatId, setLastSelectedSeatId] = useState(null);
  const [isLoadingSeats, setIsLoadingSeats] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Load backend show seat availability on mount and poll
  const refreshSeats = useCallback(async () => {
    if (!showId) return;
    try {
      const state = await fetchShowSeatsFromApi(showId);
      setSeatsData(state);
      setErrorMessage("");
    } catch (err) {
      console.error("Error fetching show seats from backend:", err);
      setErrorMessage(err.message || "Failed to load seat availability from server");
    } finally {
      setIsLoadingSeats(false);
    }
  }, [showId]);

  useEffect(() => {
    setIsLoadingSeats(true);
    refreshSeats();
    const interval = setInterval(refreshSeats, 8000);
    return () => clearInterval(interval);
  }, [refreshSeats]);

  // Toggle seat selection (UI state only - authoritative lock happens on backend reserve)
  const handleToggleSeat = (seatId) => {
    setErrorMessage("");
    const seatObj = seatsData.allSeats.find((s) => String(s.id) === String(seatId) || String(s.seat_id) === String(seatId));

    if (seatObj && (seatObj.status === "booked" || seatObj.status === "locked_other")) {
      setErrorMessage(
        seatObj.status === "booked"
          ? `Seat ${seatObj.row}${seatObj.number} is already booked.`
          : `Seat ${seatObj.row}${seatObj.number} is currently held by another user.`
      );
      return;
    }

    const strSeatId = String(seatId);
    const isCurrentlySelected = selectedSeatIds.includes(strSeatId);

    if (isCurrentlySelected) {
      const updated = selectedSeatIds.filter((id) => id !== strSeatId);
      setSelectedSeatIds(updated);
    } else {
      if (selectedSeatIds.length >= desiredSeatCount) {
        setErrorMessage(
          `You selected ${desiredSeatCount} ${desiredSeatCount === 1 ? "seat" : "seats"} earlier. Deselect one or change party size.`
        );
        return;
      }
      setSelectedSeatIds([...selectedSeatIds, strSeatId]);
      setLastSelectedSeatId(strSeatId);
    }
  };

  // Pricing calculation
  const physicalMap = new Map(seatsData.allSeats.map((s) => [String(s.id), s]));
  const selectedSeatsList = selectedSeatIds
    .map((id) => physicalMap.get(id))
    .filter(Boolean);

  const subtotal = selectedSeatsList.reduce((sum, s) => sum + (s.price || 0), 0);
  const convenienceFee = selectedSeatsList.length > 0 ? Math.round(subtotal * 0.08) : 0;
  const grandTotal = subtotal + convenienceFee;

  // Proceed to F&B snack bar
  const handleProceed = () => {
    if (selectedSeatIds.length === 0) {
      setErrorMessage("Please pick your seats to proceed.");
      return;
    }
    if (selectedSeatIds.length < desiredSeatCount) {
      setErrorMessage(`Please pick ${desiredSeatCount} ${desiredSeatCount === 1 ? "seat" : "seats"} as selected.`);
      return;
    }
    onProceedToFnb({
      showId,
      seatIds: selectedSeatIds,
      seatsList: selectedSeatsList,
      subtotal,
      convenienceFee,
      showDetails,
    });
  };

  const handleClose = () => {
    onClose();
  };

  const { movie, screen, theatre, show } = showDetails || {};
  const showDateFormatted = show?.start_time
    ? new Date(show.start_time).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";
  const showTimeFormatted = show?.start_time
    ? new Date(show.start_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <div className="seat-modal-backdrop">
      <div className="seat-modal-container">
        {/* Step 1: BookMyShow "How Many Seats?" Modal Prompt */}
        {!hasChosenSeatCount ? (
          <div className="how-many-seats-overlay">
            <div className="how-many-seats-dialog">
              <div className="dialog-header">
                <h3>How Many Seats?</h3>
                <p>Select your party size to customize seat picking</p>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Vehicle Icon representation */}
              <div className="vehicle-illustration-area">
                <span className="vehicle-big-icon">
                  {SEAT_COUNTS.find((c) => c.count === desiredSeatCount)?.icon || "🚗"}
                </span>
                <span className="vehicle-label">
                  {SEAT_COUNTS.find((c) => c.count === desiredSeatCount)?.vehicle} ({desiredSeatCount} {desiredSeatCount === 1 ? "Person" : "People"})
                </span>
              </div>

              {/* Numbers Strip */}
              <div className="seat-count-buttons-grid">
                {SEAT_COUNTS.map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    className={`seat-count-pill ${desiredSeatCount === item.count ? "active" : ""}`}
                    onClick={() => setDesiredSeatCount(item.count)}
                  >
                    <span className="seat-num">{item.count}</span>
                    <span className="seat-veh-name">{item.vehicle}</span>
                  </button>
                ))}
              </div>

              {/* Ticket Price Tiers Preview */}
              <div className="seat-tiers-price-preview">
                <div className="tier-preview-col">
                  <span className="tier-name">VIP Recliner</span>
                  <span className="tier-price">₹{show?.price_recliner || 550}</span>
                  <span className="tier-avail">Plush Comfort</span>
                </div>
                <div className="tier-preview-col">
                  <span className="tier-name">Prime Executive</span>
                  <span className="tier-price">₹{show?.price_premium || 380}</span>
                  <span className="tier-avail">Optimal Sightline</span>
                </div>
                <div className="tier-preview-col">
                  <span className="tier-name">Classic Normal</span>
                  <span className="tier-price">₹{show?.price_regular || 250}</span>
                  <span className="tier-avail">Standard View</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-select-seats-cta"
                onClick={() => setHasChosenSeatCount(true)}
              >
                <span>Select Seats ({desiredSeatCount})</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ) : null}

        {/* Modal Top Header */}
        <div className="seat-modal-header">
          <div className="seat-modal-movie-info">
            {movie?.poster_url && (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="seat-modal-poster-thumb"
              />
            )}
            <div>
              <div className="seat-modal-title-row">
                <h2>{movie?.title || "Movie Selection"}</h2>
                <span className="badge-cert">{movie?.certificate || "U/A"}</span>
                <span className="badge-format">{screen?.format || "IMAX Laser"}</span>
              </div>
              <p className="seat-modal-cinema-meta">
                <span>{theatre?.name}</span> • <span>{screen?.name}</span> •{" "}
                <span className="highlight-time">{showDateFormatted} at {showTimeFormatted}</span>
              </p>
            </div>
          </div>

          <div className="seat-modal-header-actions">
            {/* Desired seats pill */}
            <button
              type="button"
              className="btn-change-party-size"
              onClick={() => setHasChosenSeatCount(false)}
              title="Change number of tickets"
            >
              <Users size={14} />
              <span>{desiredSeatCount} {desiredSeatCount === 1 ? "Ticket" : "Tickets"}</span>
              <span className="edit-link">Edit</span>
            </button>

            {/* 5-Minute Hold Timer */}
            {timerActive && (
              <div className={`countdown-timer-badge ${timeLeft < 60 ? "urgent" : ""}`}>
                <Clock size={16} className="timer-icon" />
                <div className="timer-text">
                  <span className="timer-label">Seat Lock:</span>
                  <span className="timer-digits">{formatTimer(timeLeft)}</span>
                </div>
              </div>
            )}

            {/* 2D / 3D Dual-View Switch */}
            <div className="view-mode-toggle-group">
              <button
                type="button"
                className={`btn-view-toggle ${viewMode === "2d" ? "active" : ""}`}
                onClick={() => setViewMode("2d")}
              >
                <LayoutGrid size={15} />
                <span>2D Chart</span>
              </button>
              <button
                type="button"
                className={`btn-view-toggle ${viewMode === "3d" ? "active" : ""}`}
                onClick={() => setViewMode("3d")}
              >
                <Box size={15} />
                <span>3D Cinema</span>
              </button>
            </div>

            <button
              type="button"
              className="btn-modal-close"
              onClick={handleClose}
              aria-label="Close Seat Map"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Error / Alert Message Banner */}
        {errorMessage && (
          <div className="seat-error-banner">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Seat Map Viewport */}
        <div className="seat-modal-body-viewport">
          {isLoadingSeats ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "350px", color: "#94a3b8" }}>
              <Loader2 size={40} className="auth-spin" style={{ color: "var(--crimson-500, #f84464)", marginBottom: "16px" }} />
              <h3>Loading Auditorium Layout & Real-time Seats...</h3>
              <p>Checking latest seat availability</p>
            </div>
          ) : viewMode === "2d" ? (
            <SeatMap2D
              rows={seatsData.rows}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={handleToggleSeat}
              pricing={seatsData.pricing}
            />
          ) : (
            <SeatMap3DView
              rows={seatsData.rows}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={handleToggleSeat}
              lastSelectedSeatId={lastSelectedSeatId}
            />
          )}
        </div>

        {/* Bottom Booking Summary & Proceed to Concessions Strip */}
        <div className="seat-modal-bottom-bar">
          <div className="selected-seats-summary-info">
            {selectedSeatIds.length === 0 ? (
              <div className="no-seats-picked-prompt">
                <span className="prompt-dot" />
                <span>
                  Please select {desiredSeatCount} {desiredSeatCount === 1 ? "seat" : "seats"} on the map above.
                </span>
              </div>
            ) : (
              <div className="seats-bill-preview">
                <div className="seats-chips-list">
                  <span className="seats-count-badge">
                    {selectedSeatIds.length} / {desiredSeatCount} Selected:
                  </span>
                  {selectedSeatsList.map((s) => (
                    <span key={s.id} className={`seat-token-pill tier-${s.tier}`}>
                      {s.row}{s.number} (₹{s.price})
                    </span>
                  ))}
                </div>
                <div className="bill-subtotal-info">
                  <span className="total-amount-display">₹{grandTotal}</span>
                  <span className="convenience-note">
                    (₹{subtotal} + ₹{convenienceFee} Conv. fee)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bottom-bar-actions">
            <button
              type="button"
              className="btn-proceed-checkout"
              disabled={selectedSeatIds.length === 0}
              onClick={handleProceed}
            >
              <span>Grab Food & Beverages</span>
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
