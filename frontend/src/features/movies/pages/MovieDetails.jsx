import React from 'react';
import { Link, useParams } from 'react-router-dom';
import './MovieDetails.css';

const MOCK_DATES = ['TODAY', 'TUE 10', 'WED 11', 'THU 12', 'FRI 13'];

export default function MovieDetails() {
  const { id } = useParams();

  return (
    <div className="movie-details-container">
      <div className="backdrop-header">
        <div className="backdrop-gradient"></div>
        <div className="header-content">
          <div className="poster-side">
            <div className="main-poster"></div>
          </div>
          <div className="info-side">
            <h1 className="movie-display-title">Interstellar</h1>
            <div className="meta-info">
              <span className="meta-rating">★ 8.7</span>
              <span className="meta-item">2h 49m</span>
              <span className="meta-item">Sci-Fi • Adventure</span>
              <span className="meta-item">English</span>
              <span className="meta-item">2014</span>
            </div>
            <p className="synopsis">
              A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.
            </p>
          </div>
        </div>
      </div>

      <section className="cast-section">
        <h2 className="section-title">Cast</h2>
        <div className="cast-row">
          {['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine', 'Matt Damon'].map(name => (
            <div key={name} className="cast-member">
              <div className="cast-avatar"></div>
              <span className="cast-name">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="showtimes-section">
        <h2 className="section-title">Showtimes</h2>
        <div className="date-picker">
          {MOCK_DATES.map((date, idx) => (
            <button key={date} className={`date-btn ${idx === 0 ? 'active' : ''}`}>{date}</button>
          ))}
        </div>

        <div className="theatres-list">
          {[
            { name: 'PVR: Nexus Mall', format: 'IMAX 2D', times: ['10:30 AM', '02:00 PM', '06:15 PM'] },
            { name: 'Cinepolis: Orion', format: 'DOLBY ATMOS', times: ['11:00 AM', '03:45 PM', '08:30 PM'] }
          ].map((theatre, tIdx) => (
            <div key={tIdx} className="theatre-card">
              <div className="theatre-header">
                <h3 className="theatre-name">{theatre.name}</h3>
                <span className="format-badge">{theatre.format}</span>
              </div>
              <div className="times-row">
                {theatre.times.map((time, idx) => (
                  <Link key={idx} to="/show/1/seats" className="time-btn">{time}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}