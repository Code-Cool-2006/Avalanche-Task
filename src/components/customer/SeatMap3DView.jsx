import React, { useEffect, useRef, useState } from "react";
import { SeatMap3D } from "../../three/SeatMap3D";
import { Eye, RotateCcw, Sparkles, Info } from "lucide-react";

export default function SeatMap3DView({
  rows,
  selectedIds,
  selectedSeatIds,
  onToggleSeat,
  lastSelectedSeatId,
}) {
  const activeSelected = selectedIds || selectedSeatIds || [];
  const containerRef = useRef(null);
  const seatMap3DRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, seat: null, x: 0, y: 0 });
  const [isSeatViewActive, setIsSeatViewActive] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new SeatMap3D(containerRef.current, {
      rows,
      selectedIds: activeSelected,
      onToggle: (seatId) => {
        onToggleSeat(seatId);
      },
      onHoverSeat: (info) => {
        setTooltip(info);
      },
    });

    seatMap3DRef.current = map;

    return () => {
      map.dispose();
      seatMap3DRef.current = null;
    };
  }, []); // Mount once

  // Update selected seats
  useEffect(() => {
    if (seatMap3DRef.current) {
      seatMap3DRef.current.setSelected(activeSelected);
    }
  }, [activeSelected]);

  // Update rows if data refreshed
  useEffect(() => {
    if (seatMap3DRef.current && rows) {
      seatMap3DRef.current.updateSeatsData(rows);
    }
  }, [rows]);

  const handleViewFromSeat = () => {
    if (!seatMap3DRef.current) return;
    const targetSeatId = lastSelectedSeatId || Array.from(activeSelected)[0];
    if (targetSeatId) {
      seatMap3DRef.current.viewFromSeat(targetSeatId);
      setIsSeatViewActive(true);
    }
  };

  const handleResetCamera = () => {
    if (!seatMap3DRef.current) return;
    seatMap3DRef.current.resetView();
    setIsSeatViewActive(false);
  };

  return (
    <div className="seat-map-3d-wrapper">
      {/* 3D Canvas Container */}
      <div className="seat-map-3d-canvas" ref={containerRef} />

      {/* 3D Viewport Floating Controls */}
      <div className="seat-map-3d-controls-bar">
        <div className="view-mode-indicator">
          <Sparkles size={14} className="icon-cyan" />
          <span>Interactive 3D Auditorium</span>
          <span className="control-tip">Click to select • Drag to orbit</span>
        </div>

        <div className="control-actions">
          {activeSelected.length > 0 && !isSeatViewActive && (
            <button
              className="btn-3d-action btn-seat-view"
              onClick={handleViewFromSeat}
              title="Fly camera to your chosen seat and check the sightline toward the screen"
            >
              <Eye size={15} />
              <span>
                View from Seat{" "}
                {(lastSelectedSeatId || activeSelected[0] || "")
                  .split("-")
                  .slice(1)
                  .join("-")}
              </span>
            </button>
          )}

          {isSeatViewActive && (
            <button
              className="btn-3d-action btn-reset-view"
              onClick={handleResetCamera}
              title="Return to auditorium overview"
            >
              <RotateCcw size={14} />
              <span>Auditorium Overview</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {tooltip.visible && tooltip.seat && (
        <div
          className="seat-tooltip-3d"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y - 15}px`,
          }}
        >
          <div className="tooltip-header">
            <span className="tooltip-row-seat">
              Row {tooltip.seat.row} • Seat {tooltip.seat.number}
            </span>
            <span className={`tooltip-tier-badge tier-${tooltip.seat.tier}`}>
              {tooltip.seat.tier.toUpperCase()}
            </span>
          </div>
          <div className="tooltip-details">
            <span className="tooltip-price">${tooltip.seat.price}</span>
            <span className={`tooltip-status status-${tooltip.seat.status}`}>
              {tooltip.seat.status === "available"
                ? "Available"
                : tooltip.seat.status === "booked"
                ? "Booked"
                : tooltip.seat.status === "my_locked"
                ? "Your Selection"
                : "Locked by patron"}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="seat-map-3d-footer-hint">
        <Info size={13} />
        <span>Drag with mouse to rotate auditorium • Scroll to zoom • Front screen curved for IMAX perspective</span>
      </div>
    </div>
  );
}
