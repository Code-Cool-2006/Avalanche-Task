import React from "react";
import { Armchair, Sparkles, Award } from "lucide-react";

export default function SeatMap2D({
  rows = [],
  selectedSeatIds = [],
  selectedIds = [],
  onToggleSeat,
  pricing = {},
}) {
  const activeIds = selectedSeatIds.length > 0 ? selectedSeatIds : selectedIds;
  const selectedSet = new Set(activeIds);

  const getTierIcon = (tier) => {
    switch (tier) {
      case "recliner":
        return <Sparkles size={14} className="tier-icon icon-amber" />;
      case "premium":
        return <Award size={14} className="tier-icon icon-purple" />;
      default:
        return <Armchair size={14} className="tier-icon icon-cyan" />;
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

      {/* Seating Grid by Tier */}
      <div className="seating-rows-list">
        {rows.map((rowObj, rIndex) => {
          // Check if previous row had different tier to insert header
          const isTierHeader =
            rIndex === 0 || rows[rIndex - 1].tier !== rowObj.tier;

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

              <div className="seat-row-row">
                {/* Left Row Letter */}
                <div className="row-letter-badge">{rowObj.row}</div>

                {/* Seats in Row */}
                <div className="seats-in-row">
                  {rowObj.seats.map((seat) => {
                    const isSelected =
                      selectedSet.has(seat.id) || seat.status === "my_locked";
                    const isBooked = seat.status === "booked";
                    const isLockedByOther =
                      seat.status === "locked_by_other" ||
                      (seat.status === "LOCKED" && !isSelected);

                    let seatStateClass = "available";
                    if (isSelected) seatStateClass = "selected";
                    else if (isBooked) seatStateClass = "booked";
                    else if (isLockedByOther) seatStateClass = "locked-other";

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={isBooked || isLockedByOther}
                        className={`seat-button tier-${seat.tier} state-${seatStateClass}`}
                        onClick={() => onToggleSeat(seat.id)}
                        title={`Row ${seat.row}, Seat ${seat.number} • ${seat.tier.toUpperCase()} • ₹${seat.price} (${
                          isSelected
                            ? "Selected"
                            : isBooked
                            ? "Booked"
                            : isLockedByOther
                            ? "Held by another customer"
                            : "Available"
                        })`}
                      >
                        <span className="seat-num">{seat.number}</span>
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
    </div>
  );
}
