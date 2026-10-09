import React, { useState, useEffect } from "react";
import {
  Star,
  Play,
  Ticket,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

export default function HeroBanner({
  featuredMovies = [],
  onBookTickets,
  onWatchTrailer,
  onOpenDetail,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto rotate carousel every 8 seconds
  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  if (!featuredMovies || featuredMovies.length === 0) return null;

  const currentMovie = featuredMovies[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? featuredMovies.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
  };

  return (
    <div className="hero-banner-container">
      {/* Dynamic Cinematic Backdrop with Smooth BookMyShow Vignette */}
      <div
        className="hero-backdrop-img"
        key={currentMovie.id}
        style={{
          backgroundImage: `linear-gradient(to right, rgba(11, 14, 20, 0.98) 20%, rgba(11, 14, 20, 0.75) 55%, rgba(11, 14, 20, 0.25) 100%), linear-gradient(to top, rgba(11, 14, 20, 1) 0%, rgba(11, 14, 20, 0) 45%), url(${
            currentMovie.backdrop_url || currentMovie.poster_url
          })`,
        }}
      />

      {/* Hero Content Overlay */}
      <div className="hero-content-inner">
        <div className="hero-featured-tag">
          <Sparkles size={14} className="icon-amber" />
          <span>NOW SCREENING IN THEATRES</span>
        </div>

        <h1 className="hero-title">{currentMovie.title}</h1>

        <div className="hero-meta-row">
          <span className="rating-pill">
            <Star size={15} className="star-icon" />
            <strong>{currentMovie.rating}/10</strong>
            <span className="votes">({currentMovie.votes || "400K+"} Votes)</span>
          </span>
          <span className="badge-cert">{currentMovie.certificate || "U/A"}</span>
          <span className="hero-duration">
            <Clock size={13} /> {currentMovie.duration_min} mins
          </span>
          <span className="badge-format">
            {currentMovie.formats?.[0] || "IMAX Laser"} & Dolby
          </span>
        </div>

        {/* Languages Available */}
        {currentMovie.languagesAvailable && (
          <div className="hero-languages-row">
            <span className="lang-label">Languages:</span>
            <div className="lang-pills">
              {currentMovie.languagesAvailable.map((lang) => (
                <span key={lang} className="lang-pill">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Genre Tags */}
        <div className="hero-genre-tags">
          {currentMovie.genre?.map((g) => (
            <span key={g} className="genre-pill">
              {g}
            </span>
          ))}
        </div>

        <p className="hero-synopsis">{currentMovie.description}</p>

        {/* Action Buttons */}
        <div className="hero-actions-row">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => onBookTickets(currentMovie)}
          >
            <Ticket size={18} />
            <span>Book Tickets</span>
          </button>

          {currentMovie.trailer_url && (
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => onWatchTrailer(currentMovie)}
            >
              <Play size={16} />
              <span>Watch Trailer</span>
            </button>
          )}

          <button
            type="button"
            className="btn-hero-tertiary"
            onClick={() => onOpenDetail(currentMovie)}
          >
            <Info size={16} />
            <span>Cast & Info</span>
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {featuredMovies.length > 1 && (
        <>
          <button
            type="button"
            className="hero-nav-arrow arrow-left"
            onClick={handlePrev}
            aria-label="Previous Featured Movie"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            className="hero-nav-arrow arrow-right"
            onClick={handleNext}
            aria-label="Next Featured Movie"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      <div className="hero-indicators-bar">
        {featuredMovies.map((m, idx) => (
          <button
            key={m.id}
            type="button"
            className={`indicator-dot ${idx === currentIndex ? "active" : ""}`}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Slide to ${m.title}`}
          />
        ))}
      </div>
    </div>
  );
}
