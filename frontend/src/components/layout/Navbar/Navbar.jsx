import React, { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-left">
        <a href="/" className="navbar-logo">
          CINEVAULT<span className="logo-accent"></span>
        </a>
      </div>
      
      <div className="navbar-center">
        <a href="/movies" className="nav-link active">Movies</a>
        <a href="/theatres" className="nav-link">Theatres</a>
      </div>
      
      <div className="navbar-right">
        <button className="nav-icon-btn" aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
        <a href="/bookings" className="nav-link">My Bookings</a>
        <button className="nav-login-btn">Log In</button>
      </div>
    </nav>
  );
};

export default Navbar;