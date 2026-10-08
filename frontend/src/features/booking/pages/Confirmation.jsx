import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import './Confirmation.css';

export default function Confirmation() {
  const { id } = useParams();

  return (
    <div className="confirmation-container">
      <div className="success-header">
        <div className="check-circle">✓</div>
        <h1 className="success-title">Booking Confirmed</h1>
      </div>
      
      <div className="ticket-wrapper">
        <div className="ticket-card glass-panel">
          <div className="ticket-top">
            <h2 className="ticket-movie">Interstellar</h2>
            <p className="ticket-meta">Sun, 24 Oct • 06:15 PM</p>
            <p className="ticket-meta">PVR: Nexus Mall • IMAX 2D</p>
            <p className="ticket-meta">Seats: E5, E6</p>
          </div>
          
          <div className="ticket-divider"></div>
          
          <div className="ticket-bottom">
            <div className="qr-container">
              <QRCodeSVG value={`ticket-${id || 'BK123456'}`} size={120} bgColor="transparent" fgColor="#F5F5F5" />
            </div>
            <p className="booking-id">ID: {id || 'BK123456'}</p>
          </div>
        </div>
      </div>
      
      <div className="action-buttons">
        <button className="btn-outline">Download Ticket</button>
        <Link to="/" className="btn-filled">Back to Home</Link>
      </div>
    </div>
  );
}