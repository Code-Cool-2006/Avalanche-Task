import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const MOCK_MOVIES = [
  { id: 1, title: 'Interstellar', genre: 'Sci-Fi • Adventure', rating: '★ 8.7' },
  { id: 2, title: 'Oppenheimer', genre: 'Drama • History', rating: '★ 8.6' },
  { id: 3, title: 'Dune Part Two', genre: 'Sci-Fi • Action', rating: '★ 8.8' },
  { id: 4, title: 'The Dark Knight', genre: 'Action • Crime', rating: '★ 9.0' },
  { id: 5, title: 'Inception', genre: 'Sci-Fi • Thriller', rating: '★ 8.8' },
  { id: 6, title: 'Tenet', genre: 'Sci-Fi • Action', rating: '★ 7.3' }
];

export default function Home() {
  return (
    <div className="home-container">
      <section className="hero-section">
        <h1 className="hero-title">Experience Cinema Like Never Before</h1>
        <p className="hero-subtitle">Premium screening, immersive sound, unforgettable moments.</p>
        <span className="now-showing-label">NOW SHOWING</span>
      </section>
      
      <section className="movie-grid">
        {MOCK_MOVIES.map(movie => (
          <Link key={movie.id} to={`/movie/${movie.id}`} className="movie-card">
            <div className="poster-placeholder">
              <div className="poster-overlay">
                <span className="rating">{movie.rating}</span>
                <div className="hover-action">Book Now &rarr;</div>
              </div>
            </div>
            <div className="movie-info">
              <h3 className="movie-title">{movie.title}</h3>
              <span className="genre-chip">{movie.genre}</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}