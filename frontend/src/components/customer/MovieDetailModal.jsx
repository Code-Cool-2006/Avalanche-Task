import React from "react";
import {
  X,
  Play,
  Ticket,
  Star,
  Clock,
  Calendar,
  Globe,
  Award,
  Users,
  Clapperboard,
  Sparkles,
} from "lucide-react";

export default function MovieDetailModal({
  movie,
  onClose,
  onBookTickets,
  onWatchTrailer,
}) {
  if (!movie) return null;

  return (
    <div className="movie-detail-modal-backdrop" onClick={onClose}>
      <div
        className="movie-detail-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop Banner */}
        <div
          className="modal-backdrop-hero"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(11, 14, 20, 0.3) 0%, rgba(11, 14, 20, 0.98) 95%), url(${
              movie.backdrop_url || movie.poster_url
            })`,
          }}
        >
          <button
            type="button"
            className="btn-modal-close overlay-btn"
            onClick={onClose}
            aria-label="Close Movie Details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Box */}
        <div className="modal-content-inner">
          <div className="modal-poster-col">
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="modal-movie-poster"
            />
            {movie.formats && (
              <div className="poster-formats-box">
                <span className="formats-label">AVAILABLE FORMATS</span>
                <div className="formats-tags-list">
                  {movie.formats.map((fmt) => (
                    <span key={fmt} className="format-tag-pill">
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-info-col">
            <div className="modal-title-row">
              <h2>{movie.title}</h2>
              <div className="modal-badges-wrap">
                <span className="badge-cert">{movie.certificate || "U/A"}</span>
                <span className="rating-pill">
                  <Star size={14} className="star-icon-filled" />
                  <strong>{movie.rating}/10</strong>
                  <span className="votes-count">({movie.votes || "400K"} Votes)</span>
                </span>
              </div>
            </div>

            <div className="modal-meta-pills">
              <span className="meta-pill">
                <Clock size={13} /> {movie.duration_min} mins
              </span>
              <span className="meta-pill">
                <Globe size={13} />{" "}
                {movie.languagesAvailable ? movie.languagesAvailable.join(", ") : movie.language}
              </span>
              <span className="meta-pill">
                <Calendar size={13} /> Released {movie.release_date}
              </span>
            </div>

            <div className="modal-genre-tags">
              {movie.genre?.map((g) => (
                <span key={g} className="genre-pill">
                  {g}
                </span>
              ))}
            </div>

            <div className="modal-synopsis-section">
              <h4>About the Movie</h4>
              <p>{movie.description}</p>
            </div>

            {/* Cast & Crew Section */}
            {(movie.director || movie.cast) && (
              <div className="modal-crew-section">
                <div className="crew-section-header">
                  <Users size={16} className="icon-crimson" />
                  <h4>Cast & Crew</h4>
                </div>
                <div className="crew-members-grid">
                  {movie.director && (
                    <div className="crew-member-card">
                      <div className="crew-avatar">
                        <Clapperboard size={18} />
                      </div>
                      <div className="crew-meta">
                        <span className="crew-name">{movie.director}</span>
                        <span className="crew-role">Director</span>
                      </div>
                    </div>
                  )}

                  {movie.cast?.map((member) => (
                    <div key={member.name} className="crew-member-card">
                      <div className="crew-avatar initials">
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="crew-meta">
                        <span className="crew-name">{member.name}</span>
                        <span className="crew-role">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-modal-book-tickets"
                onClick={() => {
                  onClose();
                  onBookTickets(movie);
                }}
              >
                <Ticket size={18} />
                <span>Book Tickets</span>
              </button>

              {movie.trailer_url && (
                <button
                  type="button"
                  className="btn-modal-trailer"
                  onClick={() => onWatchTrailer(movie)}
                >
                  <Play size={16} />
                  <span>Watch Trailer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
