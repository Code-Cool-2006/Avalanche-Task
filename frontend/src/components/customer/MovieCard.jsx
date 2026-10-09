import React, { useState } from "react";
import { Star, Clock, Ticket, Play, Info, Heart } from "lucide-react";

export default function MovieCard({
  movie,
  onOpenDetail,
  onBookTickets,
  onWatchTrailer,
}) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div className="movie-card-container">
      {/* Poster with hover overlay */}
      <div className="movie-poster-wrap" onClick={() => onOpenDetail(movie)}>
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="movie-poster-image"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="poster-top-badges">
          <span className="badge-cert">{movie.certificate || "U/A"}</span>
          {movie.formats && movie.formats.length > 0 && (
            <span className="badge-format-pill">{movie.formats[0]}</span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          className={`btn-poster-heart ${isLiked ? "liked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          title={isLiked ? "Remove from Watchlist" : "Add to Watchlist"}
          aria-label="Wishlist movie"
        >
          <Heart size={15} fill={isLiked ? "#f84464" : "none"} />
        </button>

        {/* BookMyShow Rating Strip on Poster */}
        <div className="poster-rating-strip">
          <div className="rating-left">
            <Star size={13} className="star-icon-filled" />
            <span className="rating-num">{movie.rating}/10</span>
          </div>
          <span className="rating-votes">{movie.votes || "100K"} Votes</span>
        </div>

        {/* Hover action overlay */}
        <div className="poster-hover-overlay">
          {movie.trailer_url && (
            <button
              type="button"
              className="btn-overlay-circle btn-play-trailer"
              onClick={(e) => {
                e.stopPropagation();
                onWatchTrailer(movie);
              }}
              title="Watch Trailer"
              aria-label="Play trailer"
            >
              <Play size={18} />
            </button>
          )}

          <button
            type="button"
            className="btn-overlay-pill"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(movie);
            }}
          >
            <Info size={14} />
            <span>Overview</span>
          </button>
        </div>
      </div>

      {/* Card Info */}
      <div className="movie-card-info">
        <h3 className="movie-card-title" onClick={() => onOpenDetail(movie)}>
          {movie.title}
        </h3>

        <div className="movie-card-meta-line">
          <span className="meta-genre">{movie.genre?.slice(0, 2).join(", ")}</span>
          <span className="meta-bullet">•</span>
          <span className="meta-duration">
            <Clock size={11} /> {movie.duration_min}m
          </span>
        </div>

        {/* Language list */}
        <div className="movie-card-languages">
          <span>{movie.languagesAvailable ? movie.languagesAvailable.slice(0, 3).join(", ") : movie.language}</span>
        </div>

        {/* Book Tickets CTA */}
        <button
          type="button"
          className="btn-card-book-action"
          onClick={() => onBookTickets(movie)}
        >
          <Ticket size={15} />
          <span>{movie.status === "COMING_SOON" ? "Check Showtimes" : "Book Tickets"}</span>
        </button>
      </div>
    </div>
  );
}
