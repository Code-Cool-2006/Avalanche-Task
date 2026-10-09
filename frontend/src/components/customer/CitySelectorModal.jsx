import React, { useState } from "react";
import { X, Search, MapPin, Check, Building2 } from "lucide-react";
import { CITIES, POPULAR_CITIES } from "../../data/mockCinemaData";

export default function CitySelectorModal({
  currentCity,
  onSelectCity,
  onClose,
}) {
  const [citySearch, setCitySearch] = useState("");

  const filteredPopular = POPULAR_CITIES.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  const filteredAllCities = CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <div className="city-modal-backdrop" onClick={onClose}>
      <div
        className="city-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="city-modal-header">
          <div className="city-modal-header-left">
            <div className="city-modal-pin-badge">
              <MapPin size={20} className="icon-crimson" />
            </div>
            <div>
              <h3>Select Your City</h3>
              <p>Discover movies, showtimes & exclusive theatre screens</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close City Selector"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Search Bar */}
        <div className="city-modal-search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search for your city (e.g. Mumbai, Bengaluru, Delhi)..."
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            className="city-modal-search-input"
            autoFocus
          />
          {citySearch && (
            <button
              type="button"
              className="city-clear-search-btn"
              onClick={() => setCitySearch("")}
            >
              ×
            </button>
          )}
        </div>

        {/* Popular Cities Grid */}
        <div className="popular-cities-section">
          <div className="popular-cities-label">
            <Building2 size={15} />
            <span>POPULAR METRO CITIES</span>
          </div>
          <div className="popular-cities-grid">
            {filteredPopular.map((city) => {
              const isSelected = currentCity === city.name;
              return (
                <button
                  key={city.name}
                  type="button"
                  className={`popular-city-card ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onSelectCity(city.name);
                    onClose();
                  }}
                >
                  <span className="city-icon-avatar">{city.icon}</span>
                  <div className="city-card-text">
                    <span className="city-name">{city.name}</span>
                    <span className="city-landmark">{city.landmark}</span>
                  </div>
                  {isSelected && (
                    <span className="selected-check-badge">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* All Other Cities Alphabetical list */}
        <div className="other-cities-section">
          <span className="other-cities-label">ALL REGIONS & CITIES</span>
          <div className="other-cities-tags-wrap">
            {filteredAllCities.map((cityName) => {
              const isSelected = currentCity === cityName;
              return (
                <button
                  key={cityName}
                  type="button"
                  className={`other-city-pill ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onSelectCity(cityName);
                    onClose();
                  }}
                >
                  <MapPin size={12} className="pin-tiny" />
                  <span>{cityName}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
