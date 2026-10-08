import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './MyBookings.css';

const MOCK_BOOKINGS = [
  { id: 'BK1001', movie: 'Interstellar', date: 'Sun, 24 Oct', time: '06:15 PM', seats: 'E5, E6', theatre: 'PVR: Nexus Mall', status: 'Confirmed' },
  { id: 'BK0992', movie: 'Oppenheimer', date: 'Fri, 15 Oct', time: '08:30 PM', seats: 'H12, H13', theatre: 'Cinepolis: Orion', status: 'Used' }
];

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState('upcoming');

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h1 className="bookings-title">My Bookings</h1>
        <p className="bookings-subtitle">Manage your tickets and past history</p>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button 
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
      </div>

      <div className="bookings-list">
        {MOCK_BOOKINGS.filter(b => activeTab === 'upcoming' ? b.status === 'Confirmed' : b.status === 'Used').map(booking => (
          <div key={booking.id} className="booking-card glass-panel">
            <div className="booking-poster"></div>
            <div className="booking-info">
              <h3 className="booking-movie">{booking.movie}</h3>
              <p className="booking-detail">{booking.date} • {booking.time}</p>
              <p className="booking-detail">{booking.theatre}</p>
              <p className="booking-detail mono-text">Seats: {booking.seats}</p>
            </div>
            <div className="booking-actions">
              <span className={`status-badge ${booking.status.toLowerCase()}`}>{booking.status}</span>
              {booking.status === 'Confirmed' && (
                <Link to={`/confirmation/${booking.id}`} className="view-ticket-btn">View Ticket</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}