import React, { useState, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ChevronRight,
  Film,
  Heart,
  Info,
  ShieldCheck,
  Utensils,
  Smartphone,
} from "lucide-react";
import { getShowsForMovie, getTheatres } from "../../services/customerBookingService";

const TIME_FILTERS = [
  { id: "ALL", label: "All Timings" },
  { id: "MORNING", label: "Morning (Before 12 PM)", startH: 0, endH: 12 },
  { id: "AFTERNOON", label: "Afternoon (12 PM - 4 PM)", startH: 12, endH: 16 },
  { id: "EVENING", label: "Evening (4 PM - 7 PM)", startH: 16, endH: 19 },
  { id: "NIGHT", label: "Night (After 7 PM)", startH: 19, endH: 24 },
];

export default function ShowtimeSelectorModal({
  movie,
  selectedCity,
  onClose,
  onSelectShow,
}) {
  // Generate 7 upcoming dates starting from today
  const dateOptions = useMemo(() => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const isoDateStr = d.toISOString().split("T")[0];
      const dayName =
        i === 0
          ? "Today"
          : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.toLocaleDateString("en-US", { day: "numeric" });
      const monthShort = d.toLocaleDateString("en-US", { month: "short" });
      list.push({
        dateStr: isoDateStr,
        dayName,
        dayNum,
        monthShort,
      });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState(dateOptions[0].dateStr);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("ALL");
  const [selectedFormatFilter, setSelectedFormatFilter] = useState("ALL");
  const [favTheatres, setFavTheatres] = useState({});

  // Toggle favorite theatre
  const toggleFav = (theatreId) => {
    setFavTheatres((prev) => ({
      ...prev,
      [theatreId]: !prev[theatreId],
    }));
  };

  // Retrieve shows grouped by theatre for selected movie, city, and date
  const groupedTheatresWithShows = useMemo(() => {
    if (!movie) return [];
    const baseGrouped = getShowsForMovie(movie.id, selectedCity, selectedDate);

    // Apply Time Filter & Format Filter
    return baseGrouped
      .map((item) => {
        const filteredShows = item.shows.filter((show) => {
          const showDate = new Date(show.start_time);
          const hour = showDate.getHours();

          // Time filter check
          if (selectedTimeFilter !== "ALL") {
            const tf = TIME_FILTERS.find((f) => f.id === selectedTimeFilter);
            if (tf && (hour < tf.startH || hour >= tf.endH)) {
              return false;
            }
          }

          // Format filter check
          if (selectedFormatFilter !== "ALL") {
            if (show.screen?.format !== selectedFormatFilter) {
              return false;
            }
          }

          return true;
        });

        return {
          ...item,
          shows: filteredShows,
        };
      })
      .filter((item) => item.shows.length > 0);
  }, [movie, selectedCity, selectedDate, selectedTimeFilter, selectedFormatFilter]);

  // Extract available formats for filter pills
  const availableFormats = useMemo(() => {
    const set = new Set();
    const baseGrouped = getShowsForMovie(movie?.id, selectedCity, selectedDate);
    baseGrouped.forEach((g) => {
      g.shows.forEach((s) => {
        if (s.screen?.format) set.add(s.screen.format);
      });
    });
    return ["ALL", ...Array.from(set)];
  }, [movie, selectedCity, selectedDate]);

  return (
    <div className="showtimes-modal-backdrop" onClick={onClose}>
      <div
        className="showtimes-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="showtimes-modal-header">
          <div className="movie-summary-compact">
            {movie.poster_url && (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="showtime-header-poster"
              />
            )}
            <div>
              <div className="showtime-title-line">
                <h2>{movie.title}</h2>
                <span className="badge-cert">{movie.certificate || "U/A"}</span>
                <span className="rating-pill">★ {movie.rating}/10</span>
              </div>
              <p className="showtime-movie-genres">
                {movie.genre?.join(" • ")} • {movie.duration_min} mins • {movie.language} • In {selectedCity}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close Showtimes"
          >
            <X size={20} />
          </button>
        </div>

        {/* Date Selector Row (BookMyShow 7-Day Pill Strip) */}
        <div className="showtimes-date-pills-bar">
          <div className="date-pills-scroll">
            {dateOptions.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              return (
                <button
                  key={item.dateStr}
                  type="button"
                  className={`date-pill ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedDate(item.dateStr)}
                >
                  <span className="date-pill-day">{item.dayName}</span>
                  <span className="date-pill-num">{item.dayNum}</span>
                  <span className="date-pill-month">{item.monthShort}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Controls Row: Timings and Screen Formats */}
        <div className="showtimes-filters-row">
          <div className="filter-group">
            <span className="filter-label">Time:</span>
            <div className="filter-pills-wrap">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`subfilter-pill ${selectedTimeFilter === f.id ? "active" : ""}`}
                  onClick={() => setSelectedTimeFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {availableFormats.length > 2 && (
            <div className="filter-group">
              <span className="filter-label">Format:</span>
              <div className="filter-pills-wrap">
                {availableFormats.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className={`subfilter-pill ${selectedFormatFilter === fmt ? "active" : ""}`}
                    onClick={() => setSelectedFormatFilter(fmt)}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend strip */}
        <div className="showtimes-legend-bar">
          <div className="legend-item">
            <span className="legend-dot dot-available" />
            <span>Available</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-filling" />
            <span>Filling Fast</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-full" />
            <span>Almost Full</span>
          </div>
          <div className="legend-item right-align">
            <Smartphone size={13} className="icon-cyan" />
            <span>M-Ticket</span>
            <Utensils size={13} className="icon-amber" />
            <span>F&B Available</span>
          </div>
        </div>

        {/* Theatres & Showtimes List */}
        <div className="showtimes-theatres-list">
          {groupedTheatresWithShows.length === 0 ? (
            <div className="no-shows-found-state">
              <Film size={44} className="empty-icon" />
              <h3>No showtimes available</h3>
              <p>
                There are no scheduled shows matching your filters in {selectedCity} for this date.
              </p>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={() => {
                  setSelectedTimeFilter("ALL");
                  setSelectedFormatFilter("ALL");
                  setSelectedDate(dateOptions[0].dateStr);
                }}
              >
                Reset Date & Filters
              </button>
            </div>
          ) : (
            groupedTheatresWithShows.map(({ theatre, shows }) => {
              const isFav = favTheatres[theatre.id];
              return (
                <div key={theatre.id} className="theatre-showtimes-card">
                  <div className="theatre-card-header">
                    <div className="theatre-meta-left">
                      <button
                        type="button"
                        className={`btn-theatre-fav ${isFav ? "favorited" : ""}`}
                        onClick={() => toggleFav(theatre.id)}
                        title={isFav ? "Remove from favorite cinemas" : "Save as favorite cinema"}
                        aria-label="Favorite cinema"
                      >
                        <Heart size={16} fill={isFav ? "#f84464" : "none"} />
                      </button>

                      <div>
                        <div className="theatre-name-row">
                          <h4 className="theatre-name">{theatre.name}</h4>
                          <span className="theatre-rating-pill">★ {theatre.rating || 4.7}</span>
                        </div>
                        <p className="theatre-address-line">
                          <MapPin size={12} /> {theatre.address}
                        </p>
                      </div>
                    </div>

                    <div className="theatre-amenities-tags">
                      {theatre.amenities?.map((amenity) => (
                        <span key={amenity} className="amenity-chip">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Showtimes Pills */}
                  <div className="showtimes-pills-grid">
                    {shows.map((show) => {
                      const startTimeObj = new Date(show.start_time);
                      const timeStr = startTimeObj.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      });

                      const fillingClass =
                        show.filling_status === "filling"
                          ? "status-filling"
                          : show.filling_status === "almost_full"
                          ? "status-full"
                          : "status-available";

                      return (
                        <div key={show.id} className="showtime-pill-wrapper">
                          <button
                            type="button"
                            className={`btn-showtime-pill ${fillingClass}`}
                            onClick={() => onSelectShow(show)}
                          >
                            <span className="showtime-time">{timeStr}</span>
                            <span className="showtime-format">
                              {show.screen?.format || "IMAX Laser"}
                            </span>
                          </button>

                          {/* Hover Tooltip / Price Preview */}
                          <div className="showtime-hover-popover">
                            <span className="pop-screen">{show.screen?.name}</span>
                            <span className="pop-sound">Sound: {show.sound_format || "Dolby Atmos"}</span>
                            <div className="pop-prices">
                              <span>Regular: ₹{show.price_regular}</span>
                              <span>Prime: ₹{show.price_premium}</span>
                              <span>Recliner: ₹{show.price_recliner}</span>
                            </div>
                            <span className="pop-cancellation">✓ Cancellation Available</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
