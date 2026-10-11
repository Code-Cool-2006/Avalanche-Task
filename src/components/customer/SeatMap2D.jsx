import React, { useState } from "react";
import { Sparkles, Award, ZoomIn, ZoomOut, Accessibility } from "lucide-react";

/**
 * Vintage Theatre Armchair SVG Component
 * Faithfully matches the classic Scandinavian cinema armchair in the reference UI.
 */
function ArmchairSeatGraphic({ seatNumber }) {
  return (
    <svg viewBox="0 0 32 30" className="armchair-svg-icon" aria-hidden="true">
      {/* Rounded top backrest cushion */}
      <rect className="seat-backrest" x="5" y="2" width="22" height="14" rx="3.5" />
      {/* Main seat cushion */}
      <rect className="seat-cushion" x="6" y="13" width="20" height="14" rx="2.5" />
      {/* Left armrest wing */}
      <rect className="seat-armrest" x="1.5" y="9" width="4.5" height="18" rx="2" />
      {/* Right armrest wing */}
      <rect className="seat-armrest" x="26" y="9" width="4.5" height="18" rx="2" />
      {/* Center seat number */}
      <text className="seat-number-text" x="16" y="23" textAnchor="middle">
        {seatNumber}
      </text>
    </svg>
  );
}

export default function SeatMap2D({
  rows = [],
  selectedSeatIds = [],
  selectedIds = [],
  onToggleSeat,
  pricing = {},
}) {
  const [zoomScale, setZoomScale] = useState(1);
  const activeIds = selectedSeatIds.length > 0 ? selectedSeatIds : selectedIds;
  const selectedSet = new Set(activeIds);

  // Compute live seat metrics for the legend
  const allSeats = rows.flatMap((r) => r.seats || []);
  const availableCount = allSeats.filter(
    (s) => s.status === "available" && !selectedSet.has(s.id)
  ).length;
  const selectedCount = activeIds.length;
  const bookedCount = allSeats.filter(
    (s) => s.status === "booked" || s.status === "locked_by_other"
  ).length;

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(1.3, Number((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.75, Number((prev - 0.1).toFixed(2))));
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case "recliner":
        return <Sparkles size={14} className="tier-icon icon-amber" />;
      case "premium":
        return <Award size={14} className="tier-icon icon-purple" />;
      default:
        return null;
    }
  };

  const getTierLabel = (tier) => {
    switch (tier) {
      case "recliner":
        return "VIP Recliner Experience";
      case "premium":
        return "Prime Executive Club";
      default:
        return "Classic Normal";
    }
  };

  return (
    <div className="seat-map-2d-container">
      {/* Curved Screen Indicator */}
      <div className="cinema-screen-2d-wrap">
        <div className="screen-curve-beam" />
        <div className="screen-curved-bar">
          <span className="screen-label">ALL EYES THIS WAY • CINEMA SCREEN</span>
        </div>
      </div>

      {/* Floating Zoom & Accessibility Bar */}
      <div className="seat-map-quick-toolbar">
        <div className="zoom-controls-cluster">
          <button
            type="button"
            className="btn-seat-zoom"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in on seats"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="btn-seat-zoom"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out on seats"
          >
            <ZoomOut size={14} />
          </button>
        </div>
        <div className="accessibility-pill" title="Wheelchair accessible seating available">
          <Accessibility size={14} />
          <span>Wheelchair Accessible</span>
        </div>
      </div>

      {/* Club Amphitheater Arc Seating Viewport */}
      <div
        className="amphitheater-arc-wrapper"
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: "top center",
          transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {rows.map((rowObj, rIndex) => {
          const isTierHeader =
            rIndex === 0 || rows[rIndex - 1].tier !== rowObj.tier;
          const seatsCount = rowObj.seats.length;
          const centerIndex = (seatsCount - 1) / 2;

          return (
            <React.Fragment key={rowObj.row}>
              {isTierHeader && (
                <div className={`tier-section-divider tier-${rowObj.tier}`}>
                  <div className="tier-divider-line" />
                  <div className="tier-divider-badge">
                    {getTierIcon(rowObj.tier)}
                    <span className="tier-name">{getTierLabel(rowObj.tier)}</span>
                    <span className="tier-price-tag">
                      ₹{pricing?.[rowObj.tier] || rowObj.seats[0]?.price || 250}
                    </span>
                  </div>
                  <div className="tier-divider-line" />
                </div>
              )}

              <div className="seat-row-arc">
                {/* Left Row Letter */}
                <div className="row-letter-badge">{rowObj.row}</div>

                {/* Curved Seats in Row */}
                <div className="seats-in-arc-row">
                  {rowObj.seats.map((seat, sIndex) => {
                    const isSelected = selectedSet.has(seat.id);
                    const isBooked = seat.status === "booked";
                    const isLockedByOther =
                      seat.status === "locked_by_other" ||
                      (seat.status === "LOCKED" && !isSelected);

                    let seatStateClass = "available";
                    if (isSelected) seatStateClass = "selected";
                    else if (isBooked) seatStateClass = "booked";
                    else if (isLockedByOther) seatStateClass = "locked-other";

                    // Club Amphitheater curvature geometry
                    const normalizedOffset =
                      centerIndex > 0 ? (sIndex - centerIndex) / centerIndex : 0;
                    const curveY = Math.pow(normalizedOffset, 2) * 12; // gentle drop towards outer edges
                    const curveRot = normalizedOffset * 7; // gentle inward rotation

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={isBooked || isLockedByOther}
                        className={`armchair-seat-btn tier-${seat.tier} state-${seatStateClass}`}
                        style={{
                          transform: `translateY(${curveY}px) rotate(${curveRot}deg)`,
                        }}
                        onClick={() => onToggleSeat(seat.id)}
                        title={`Row ${seat.row}, Seat ${seat.number} • ${seat.tier.toUpperCase()} • ₹${
                          seat.price
                        } (${
                          isSelected
                            ? "Selected"
                            : isBooked
                            ? "Booked"
                            : isLockedByOther
                            ? "Held by another customer"
                            : "Available"
                        })`}
                      >
                        <ArmchairSeatGraphic seatNumber={seat.number} />
                      </button>
                    );
                  })}
                </div>

                {/* Right Row Letter */}
                <div className="row-letter-badge">{rowObj.row}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Status Alert Prompt Banner (Soft Blush Pink in Reference UI) */}
      <div className="seat-status-prompt-banner">
        <span>
          {selectedCount > 0
            ? `${selectedCount} seat${selectedCount > 1 ? "s" : ""} selected • Click on a seat to select or change`
            : "Click above to select your seats"}
        </span>
      </div>

      {/* Tally Legend Strip at Bottom */}
      <div className="seat-matrix-legend-row">
        <div className="legend-chip-box available">
          <span className="legend-count-badge">{availableCount}</span>
          <span>Available</span>
        </div>
        <div className="legend-chip-box selected">
          <span className="legend-count-badge">{selectedCount}</span>
          <span>Selected</span>
        </div>
        <div className="legend-chip-box booked">
          <span className="legend-count-badge">{bookedCount}</span>
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}
