import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeatSelection } from '../../seats/hooks/useSeatSelection';
import { TheatreRenderer } from '../../../components/cinema/TheatreRenderer';
import './SeatSelection.css';

const SeatSelection = () => {
  const { showId } = useParams();
  const navigate = useNavigate();

  const { seats, booked, locked, selected, toggleSeat } = useSeatSelection(showId);
  const [viewFromSeat, setViewFromSeat] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleViewFromSeat = () => {
    if (selected.size > 0) {
      setViewFromSeat(true);
    }
  };

  const handleBackToMap = () => {
    setViewFromSeat(false);
  };

  const totalPrice = Array.from(selected).reduce((sum, id) => {
    const seat = seats.find(s => s.id === id);
    return sum + (seat ? seat.price : 0);
  }, 0);

  const selectedSeatLabels = Array.from(selected)
    .map(id => {
      const seat = seats.find(s => s.id === id);
      return seat ? `${seat.row_label || seat.row}${seat.seat_number || seat.number}` : '';
    })
    .filter(Boolean)
    .join(', ');

  return (
    <div className="seat-selection-page">
      {/* Top Header */}
      <header className="seat-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <span className="back-arrow">←</span> BACK
          </button>
          <div className="show-meta">
            <h1 className="movie-title">INTERSTELLAR</h1>
            <div className="screen-time">IMAX 70MM • SCREEN 01 • 06:15 PM</div>
          </div>
        </div>

        <div className="header-tips">
          {isMobile ? (
            <>
              <span className="tip-badge">DRAG TO MOVE</span>
              <span className="tip-badge">PINCH TO ZOOM</span>
              <span className="tip-badge">TAP TO SELECT</span>
            </>
          ) : (
            <>
              <span className="tip-badge">DRAG TO ORBIT</span>
              <span className="tip-badge">SCROLL TO ZOOM</span>
              <span className="tip-badge">CLICK TO SELECT</span>
            </>
          )}
        </div>
      </header>

      {/* 3D WebGL Canvas Container */}
      <div className="map-container">
        {seats.length > 0 && (
          <TheatreRenderer 
            activeSeats={seats}
            selected={selected}
            booked={booked}
            locked={locked}
            toggleSeat={toggleSeat}
            viewFromSeat={viewFromSeat}
          />
        )}
        
        {viewFromSeat && (
          <div className="view-overlay">
            <div className="view-pill">
              <span className="view-dot"></span>
              AUDIENCE PERSPECTIVE • {selectedSeatLabels}
            </div>
            <button className="back-to-map-btn" onClick={handleBackToMap}>
              [ RETURN TO AUDITORIUM OVERVIEW ]
            </button>
          </div>
        )}
      </div>

      {/* Bottom Floating Bar */}
      <aside className="bottom-bar">
        <div className="legend">
          <div className="legend-item">
            <span className="dot available"></span>
            <span>AVAILABLE</span>
          </div>
          <div className="legend-item">
            <span className="dot selected"></span>
            <span>SELECTED</span>
          </div>
          <div className="legend-item">
            <span className="dot booked"></span>
            <span>UNAVAILABLE</span>
          </div>
        </div>

        <div className="booking-actions">
          {selected.size > 0 ? (
            <div className="booking-actions-active">
              <div className="selected-seats-info">
                <div className="seats-tag">
                  <span className="label">SEATS</span>
                  <span className="value">{selectedSeatLabels}</span>
                </div>
                <div className="divider-v" />
                <div className="price-tag">
                  <span className="label">TOTAL</span>
                  <span className="value">₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="action-buttons">
                {!viewFromSeat && selected.size === 1 && !isMobile && (
                  <button className="view-from-seat-btn" onClick={handleViewFromSeat}>
                    VIEW PERSPECTIVE
                  </button>
                )}
                <button
                  className="continue-btn"
                  onClick={() => navigate('/payment/mock-booking-id')}
                >
                  PROCEED →
                </button>
              </div>
            </div>
          ) : (
            <div className="select-prompt">
              <span className="prompt-dot"></span>
              {isMobile ? 'Tap any seat to select' : 'Select a seat to begin booking'}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default SeatSelection;
