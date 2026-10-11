import { useState } from "react";
import {
  Film,
  MapPin,
  Search,
  Ticket,
  User,
  ChevronDown,
  Sparkles,
  Star,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { INITIAL_MOVIES } from "../../data/mockCinemaData";

export default function CustomerNavbar({
  selectedCity,
  onOpenCityModal,
  searchQuery,
  onSearchChange,
  bookingsCount,
  onOpenMyBookings,
  onSelectMovieDirect,
  onSelectFilter,
  onOpenOffers,
}) {
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const { user, logout } = useAuth();

  // Suggestions for live search dropdown matching title, genre, director, or cast
  const searchSuggestions = searchQuery.trim().length >= 1
    ? INITIAL_MOVIES.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.genre?.some((g) => g.toLowerCase().includes(q)) ||
          m.director?.toLowerCase().includes(q) ||
          m.cast?.some((c) => c.name.toLowerCase().includes(q))
        );
      }).slice(0, 4)
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
              placeholder="Search for Movies by title, genre, director, or cast..."
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
          <div className="nav-user-profile" title={user?.email}>
            <div className="user-avatar-circle">
              <User size={15} />
            </div>
            <div className="user-info-text">
              <span className="user-name">{user?.name}</span>
              <span className="user-tier">CinePass Member</span>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              style={{ background: "none", border: 0, color: "#94a3b8", cursor: "pointer", padding: 6, marginLeft: 4 }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Cinema Category Navigation Tier */}
      <nav className="navbar-secondary-tier">
        <div className="secondary-nav-container">
          <div className="secondary-nav-left">
            <button
              type="button"
              className="secondary-nav-btn active"
              onClick={() => onSelectFilter && onSelectFilter("NOW_SHOWING")}
            >
              Movies
            </button>
          </div>

          <div className="secondary-nav-right">
            <button
              type="button"
              className="secondary-offers-btn"
              onClick={onOpenOffers}
              title="View available discount coupon codes"
            >
              <Sparkles size={14} className="icon-amber" />
              <span>Offers & Promos</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
