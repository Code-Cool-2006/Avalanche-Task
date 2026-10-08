import { useState, useEffect, useCallback } from 'react';
import { IMAX_01 } from '../../../config/theatreLayouts';

// Mock hook for now to provide state to SeatSelection
export const useSeatSelection = (showId) => {
  const [seats, setSeats] = useState([]);
  const [booked, setBooked] = useState(new Set());
  const [locked, setLocked] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  
  // Mock data fetching
  useEffect(() => {
    // Flatten layout seats to API format
    const dummySeats = [];
    IMAX_01.rows.forEach(row => {
      row.seats.forEach(seat => {
        dummySeats.push({
          id: seat.id,
          row_label: seat.row_label,
          seat_number: seat.seat_number,
          tier: row.id === 'E' || row.id === 'F' ? 'premium' : 'regular',
          price: row.id === 'E' || row.id === 'F' ? 1200 : 840,
          position: { x: seat.x, y: seat.y, z: seat.z }
        });
      });
    });
    setSeats(dummySeats);
    
    // Mock some booked/locked seats
    setBooked(new Set(['seat-B-5', 'seat-B-6', 'seat-C-7']));
    setLocked(new Set(['seat-D-8']));
  }, [showId]);

  const toggleSeat = useCallback((seatId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        // Can't select if booked or locked
        if (!booked.has(seatId) && !locked.has(seatId)) {
          next.add(seatId);
        }
      }
      return next;
    });
  }, [booked, locked]);

  return {
    seats,
    booked,
    locked,
    selected,
    toggleSeat
  };
};
