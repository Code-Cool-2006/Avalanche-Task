import { useState } from "react";
import {
  MapPin,
  Search,
  Ticket,
  ChevronDown,
  Star,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import BackendStatusWidget from "../common/BackendStatusWidget";

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
  movies = [],
}) {
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const { user, logout } = useAuth();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "V";

  const searchSuggestions = searchQuery.trim().length >= 1
    ? movies.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          m.title?.toLowerCase().includes(q) ||
          (Array.isArray(m.genre)
            ? m.genre.some((g) => g.toLowerCase().includes(q))
            : String(m.genre).toLowerCase().includes(q)) ||
          m.director?.toLowerCase().includes(q) ||
          m.cast?.some((c) => c.name?.toLowerCase().includes(q))
        );
      }).slice(0, 4)
    : [];

  return (
    <header className="customer-navbar-header">
      <div className="navbar-container">
        {/* Brand Logo: BIO CINESHOW in Heritage Nordic Style */}
        <div className="navbar-brand" onClick={() => onSelectFilter && onSelectFilter("NOW_SHOWING")}>
          <span className="brand-logo-text">BIO CINESHOW</span>
          <span className="brand-sub-badge">1926</span>
        </div>

        {/* Center Navigation Links & Integrated Search */}
        <nav className="navbar-center-nav">
          <button
            type="button"
            className="nav-link-item active"
            onClick={() => onSelectFilter && onSelectFilter("NOW_SHOWING")}
          >
            Movies
          </button>
          {onOpenOffers && (
            <button
              type="button"
              className="nav-link-item nav-offers-link"
              onClick={onOpenOffers}
              title="View Offers & Promos"
            >
              <Sparkles size={13} className="text-amber" />
              <span>Offers</span>
            </button>
          )}

          {/* Sleek inline search bar */}
          <div className="navbar-search-bar-wrapper">
            <div className="navbar-search-bar">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Search movies, genres, cast..."
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

            {/* Live Autocomplete Dropdown */}
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
                          <Star size={11} fill="#f59e0b" color="#f59e0b" /> {movie.rating}
                        </span>
                        <span>•</span>
                        <span>{movie.genre?.slice(0, 2).join(", ")}</span>
                        <span>•</span>
                        <span className="suggestion-cert">{movie.certificate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right Section: Location, My Bookings, Profile Avatar */}
        <div className="navbar-actions-right">
          {/* Live Backend Status & Wake Widget */}
          <BackendStatusWidget compact={true} />

          {/* Location Trigger */}
          <button
            type="button"
            className="btn-city-trigger"
            onClick={onOpenCityModal}
            title="Change City"
          >
            <MapPin size={15} className="city-pin-icon" />
            <span className="city-name-label">{selectedCity}</span>
            <ChevronDown size={13} className="city-chevron" />
          </button>

          {/* My Bookings Button */}
          <button
            type="button"
            className="btn-nav-my-bookings"
            onClick={onOpenMyBookings}
            title="My Bookings"
          >
            <Ticket size={15} className="ticket-icon-red" />
            <span className="bookings-label">My Bookings</span>
            {bookingsCount > 0 && (
              <span className="bookings-badge-count">{bookingsCount}</span>
            )}
          </button>

          {/* User Avatar Circle */}
          <div className="nav-user-profile-badge" title={user?.name || user?.email || "User"}>
            <div className="user-avatar-initial">{userInitial}</div>
            {logout && (
              <button
                type="button"
                className="btn-nav-logout"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
