import { useState, useEffect } from "react";
import { Star, Ticket, Play, Info, Heart } from "lucide-react";
import {
  isMovieInWatchlist,
  toggleWatchlistMovie,
} from "../../services/customerBookingService";

export default function MovieCard({
  movie,
  onOpenDetail,
  onBookTickets,
  onWatchTrailer,
}) {
  const [isLiked, setIsLiked] = useState(() => isMovieInWatchlist(movie.id));

  useEffect(() => {
    const handleSync = () => {
      setIsLiked(isMovieInWatchlist(movie.id));
    };
    window.addEventListener("cine_watchlist_updated", handleSync);
    return () => window.removeEventListener("cine_watchlist_updated", handleSync);
  }, [movie.id]);

  const handleToggleLike = (e) => {
    e.stopPropagation();
    const nextState = toggleWatchlistMovie(movie.id);
    setIsLiked(nextState);
  };

  const isImax = movie.formats?.some((f) => f.toUpperCase().includes("IMAX"));

  return (
    <div className="movie-card-container">
      {/* Poster Wrap with badges & hover overlay */}
      <div className="movie-poster-wrap" onClick={() => onOpenDetail(movie)}>
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="movie-poster-image"
          loading="lazy"
        />

        {/* Top Badges: Certificate on left, IMAX on right */}
        <div className="poster-top-badges">
          <span className="badge-cert">{movie.certificate || "U/A 13+"}</span>
          {isImax && <span className="badge-imax">IMAX</span>}
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          className={`btn-poster-heart ${isLiked ? "liked" : ""}`}
          onClick={handleToggleLike}
          title={isLiked ? "Remove from Watchlist" : "Add to Watchlist"}
          aria-label="Wishlist movie"
        >
          <Heart size={14} fill={isLiked ? "#dc2626" : "none"} />
        </button>

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
              <Play size={18} fill="#fff" />
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
        {/* Rating row: Star 8.8/10 + 412K votes */}
        <div className="card-rating-row">
          <span className="rating-star-group">
            <Star size={13} className="star-gold" fill="#f59e0b" />
            <strong className="rating-score">{movie.rating || "8.5"}/10</strong>
          </span>
          <span className="rating-vote-count">{movie.votes || "250K"} votes</span>
        </div>

        {/* Title */}
        <h3 className="movie-card-title" onClick={() => onOpenDetail(movie)}>
          {movie.title}
        </h3>

        {/* Genre line: Action • Drama • Sci-Fi */}
        <p className="movie-card-genres">
          {movie.genre?.join(" • ") || "Action • Drama"}
        </p>

        {/* Book Tickets CTA Button */}
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
