import React, { useState } from "react";
import {
  Film,
  MapPin,
  Search,
  Ticket,
  User,
  ChevronDown,
  Sparkles,
  Star,
  ExternalLink,
} from "lucide-react";
import { INITIAL_MOVIES } from "../../data/mockCinemaData";

export default function CustomerNavbar({
  selectedCity,
  onOpenCityModal,
  searchQuery,
  onSearchChange,
  bookingsCount,
  onOpenMyBookings,
  onSelectMovieDirect,
}) {
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Suggestions for live search dropdown
  const searchSuggestions = searchQuery.trim().length >= 1
    ? INITIAL_MOVIES.filter((m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.genre.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 4)
    : [];

  return (
    <header className="customer-navbar-header">
      {/* Top Primary Navigation */}
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="navbar-brand">
          <div className="brand-logo-icon">
            <Film size={22} className="logo-reel" />
          </div>
          <div className="brand-text-wrap">
            <div className="brand-title-row">
              <span className="brand-title">CINESHOW</span>
              <span className="bms-indicator-badge">BMS</span>
            </div>
            <span className="brand-subtitle">CINEMA TICKETS & EXPERIENCES</span>
          </div>
        </div>

        {/* Live Search Bar with Instant Autocomplete */}
        <div className="navbar-search-bar-wrapper">
          <div className="navbar-search-bar">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Search for Movies, Events, Plays, Sports and Activities..."
              className="search-input-field"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => {
                  onSearchChange("");
                  setShowSearchDropdown(false);
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showSearchDropdown && searchSuggestions.length > 0 && (
            <div
              className="search-suggestions-dropdown"
              onMouseLeave={() => setShowSearchDropdown(false)}
            >
              <div className="suggestions-header">Quick Movie Matches</div>
              {searchSuggestions.map((movie) => (
                <div
                  key={movie.id}
                  className="suggestion-item"
                  onClick={() => {
                    setShowSearchDropdown(false);
                    if (onSelectMovieDirect) onSelectMovieDirect(movie);
                  }}
                >
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="suggestion-poster"
                  />
                  <div className="suggestion-info">
                    <span className="suggestion-title">{movie.title}</span>
                    <div className="suggestion-meta">
                      <span className="meta-rating">
                        <Star size={11} className="star-filled" /> {movie.rating}
                      </span>
                      <span>•</span>
                      <span>{movie.genre.slice(0, 2).join(", ")}</span>
                      <span>•</span>
                      <span className="suggestion-cert">{movie.certificate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Controls: City Selector, My Bookings, Profile */}
        <div className="navbar-actions-right">
          {/* City Selector Button */}
          <button
            type="button"
            className="btn-city-trigger"
            onClick={onOpenCityModal}
            title="Change Location"
          >
            <MapPin size={16} className="icon-crimson" />
            <span className="city-name-label">{selectedCity}</span>
            <ChevronDown size={14} className="dropdown-arrow" />
          </button>

          {/* My Bookings Button */}
          <button
            type="button"
            className="btn-nav-my-bookings"
            onClick={onOpenMyBookings}
            title="View booked movie tickets & QR passes"
          >
            <Ticket size={16} className="icon-crimson" />
            <span className="btn-label">My Bookings</span>
            {bookingsCount > 0 && (
              <span className="bookings-count-pill">{bookingsCount}</span>
            )}
          </button>

          {/* User Profile */}
          <div className="nav-user-profile" title="CinePass Club Member">
            <div className="user-avatar-circle">
              <User size={15} />
            </div>
            <div className="user-info-text">
              <span className="user-name">Alex Mercer</span>
              <span className="user-tier">Superstar VIP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary BookMyShow Navigation Tier */}
      <nav className="navbar-secondary-tier">
        <div className="secondary-nav-container">
          <div className="secondary-nav-left">
            <a href="#movies" className="secondary-nav-link active">
              Movies
            </a>
            <a href="#stream" className="secondary-nav-link">
              Stream
              <span className="tag-new">NEW</span>
            </a>
            <a href="#events" className="secondary-nav-link">
              Events
            </a>
            <a href="#plays" className="secondary-nav-link">
              Plays
            </a>
            <a href="#sports" className="secondary-nav-link">
              Sports
            </a>
            <a href="#activities" className="secondary-nav-link">
              Activities
            </a>
            <a href="#buzz" className="secondary-nav-link">
              Buzz
            </a>
          </div>

          <div className="secondary-nav-right">
            <span className="secondary-link-item">
              <Sparkles size={13} className="icon-amber" />
              Offers
            </span>
            <span className="secondary-link-item">Gift Cards</span>
            <span className="secondary-link-item">Corporates</span>
          </div>
        </div>
      </nav>
    </header>
  );
}
