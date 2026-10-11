import { useState, useEffect, useMemo } from "react";
import CustomerNavbar from "../../components/customer/CustomerNavbar";
import MovieCard from "../../components/customer/MovieCard";
import MovieDetailModal from "../../components/customer/MovieDetailModal";
import ShowtimeSelectorModal from "../../components/customer/ShowtimeSelectorModal";
import SeatSelectionModal from "../../components/customer/SeatSelectionModal";
import FoodAndBeverageModal from "../../components/customer/FoodAndBeverageModal";
import PaymentModal from "../../components/customer/PaymentModal";
import TicketConfirmationModal from "../../components/customer/TicketConfirmationModal";
import MyBookingsModal from "../../components/customer/MyBookingsModal";
import TrailerModal from "../../components/customer/TrailerModal";
import CitySelectorModal from "../../components/customer/CitySelectorModal";
import OffersModal from "../../components/customer/OffersModal";

import {
  initializeStorage,
  getMovies,
  getSelectedCity,
  setSelectedCity,
  getMyBookings,
  getShowDetails,
  createPendingBooking,
  cleanupExpiredLocks,
  syncFromBackend,
  getWatchlist,
} from "../../services/customerBookingService";
import { INITIAL_MOVIES } from "../../data/mockCinemaData";
import {
  Film,
  CalendarDays,
  Heart,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

const SIDEBAR_LANGUAGES = ["ALL", "English", "Hindi", "Telugu", "Tamil", "Malayalam", "Kannada"];
const SIDEBAR_FORMATS = ["ALL", "IMAX 2D", "IMAX 3D", "4DX", "2D", "3D"];
const SIDEBAR_GENRES = ["ALL", "Action", "Drama", "Comedy", "Thriller", "Horror", "Sci-Fi"];
const QUICK_GENRES = ["ALL", "Action", "Drama", "Comedy", "Thriller", "Horror"];

export default function CustomerDashboard() {
  // Storage initialization, backend synchronization & periodic cleanup
  useEffect(() => {
    initializeStorage();
    syncFromBackend().catch(() => {});
    const interval = setInterval(() => {
      cleanupExpiredLocks();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [currentCity, setCurrentCity] = useState(() => getSelectedCity());
  const [showCityModal, setShowCityModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("NOW_SHOWING"); // "NOW_SHOWING" | "COMING_SOON" | "WATCHLIST" | "ALL"
  const [selectedGenre, setSelectedGenre] = useState("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState("ALL");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [sortBy, setSortBy] = useState("popular"); // "popular" | "rating" | "latest"
  const [bookingsList, setBookingsList] = useState(() => getMyBookings());
  const [watchlistCount, setWatchlistCount] = useState(() => getWatchlist().length);
  const [watchlistVersion, setWatchlistVersion] = useState(0);

  // Sync watchlist live across actions
  useEffect(() => {
    const handleWatchlistChange = () => {
      setWatchlistCount(getWatchlist().length);
      setWatchlistVersion((v) => v + 1);
    };
    window.addEventListener("cine_watchlist_updated", handleWatchlistChange);
    return () => window.removeEventListener("cine_watchlist_updated", handleWatchlistChange);
  }, []);

  // Modals state
  const [activeModal, setActiveModal] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [activeShow, setActiveShow] = useState(null);
  const [activeShowDetails, setActiveShowDetails] = useState(null);
  const [pendingSeatSelection, setPendingSeatSelection] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Sync Bookings count
  const refreshBookings = () => {
    const b = getMyBookings();
    setBookingsList(b);
  };

  // Update city preference
  const handleCityChange = (city) => {
    setCurrentCity(city);
    setSelectedCity(city);
  };

  // Filtered movies
  const movies = useMemo(() => {
    if (watchlistVersion < 0) return [];
    let list = getMovies({
      query: searchQuery,
      genre: selectedGenre,
      language: selectedLanguage,
      format: selectedFormat,
      status: statusFilter,
      city: currentCity,
    });

    if (sortBy === "rating") {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "latest") {
      list = [...list].sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    }

    return list;
  }, [searchQuery, selectedGenre, selectedLanguage, selectedFormat, statusFilter, sortBy, currentCity, watchlistVersion]);

  // Separate coming soon movies for the lower section
  const comingSoonMovies = useMemo(() => {
    return INITIAL_MOVIES.filter((m) => m.status === "COMING_SOON").slice(0, 5);
  }, []);

  // Modal Launchers
  const handleOpenDetail = (movie) => {
    setSelectedMovie(movie);
    setActiveModal("detail");
  };

  const handleOpenShowtimes = (movie) => {
    setSelectedMovie(movie);
    setActiveModal("showtimes");
  };

  const handleOpenTrailer = (movie) => {
    setSelectedMovie(movie);
    setActiveModal("trailer");
  };

  const handleSelectShow = (show) => {
    const details = getShowDetails(show.id);
    setActiveShow(show);
    setActiveShowDetails(details);
    setActiveModal("seats");
  };

  const handleProceedToFnb = (seatSelectionData) => {
    setPendingSeatSelection(seatSelectionData);
    setActiveModal("fnb");
  };

  const handleProceedToPaymentWithFnb = (fnbItems) => {
    try {
      if (!pendingSeatSelection) return;
      const { showId, seatIds, lockExpiresAt } = pendingSeatSelection;
      const newPendingBooking = createPendingBooking(
        showId,
        seatIds,
        fnbItems,
        null,
        1,
        lockExpiresAt
      );
      setPendingBooking(newPendingBooking);
      setActiveModal("payment");
    } catch (err) {
      console.error("Booking creation error:", err);
      alert(err.message || "Failed to create booking reservation.");
    }
  };

  const handleSkipFnb = () => {
    handleProceedToPaymentWithFnb([]);
  };

  const handleReservationExpired = () => {
    setPendingBooking(null);
    setPendingSeatSelection(null);
    setActiveModal("seats");
  };

  const handlePaymentSuccess = (cBooking) => {
    setConfirmedBooking(cBooking);
    refreshBookings();
    setActiveModal("ticket");
  };

  const handleOpenMyBookings = () => {
    refreshBookings();
    setActiveModal("my_bookings");
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    refreshBookings();
  };

  const confirmedCount = bookingsList.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="customer-dashboard-root">
      {/* Top Navbar */}
      <CustomerNavbar
        selectedCity={currentCity}
        onOpenCityModal={() => setShowCityModal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        bookingsCount={confirmedCount}
        onOpenMyBookings={handleOpenMyBookings}
        onSelectMovieDirect={handleOpenDetail}
        onSelectFilter={() => {
          setStatusFilter("NOW_SHOWING");
          setSelectedFormat("ALL");
          setSelectedGenre("ALL");
          setSelectedLanguage("ALL");
          setSearchQuery("");
        }}
        onOpenOffers={() => setActiveModal("offers")}
      />

      {/* Main Two-Column Layout (Sidebar + Content) */}
      <div className="cine-layout-container">
        {/* Left Filter Sidebar */}
        <aside className="cine-sidebar">
          {/* Browse Group */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Browse</span>
            <div className="sidebar-browse-list">
              <button
                type="button"
                className={`sidebar-browse-btn ${statusFilter === "NOW_SHOWING" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("NOW_SHOWING");
                  setSelectedFormat("ALL");
                }}
              >
                <Film size={16} />
                <span>Now Showing</span>
              </button>
              <button
                type="button"
                className={`sidebar-browse-btn ${statusFilter === "COMING_SOON" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("COMING_SOON");
                  setSelectedFormat("ALL");
                }}
              >
                <CalendarDays size={16} />
                <span>Coming Soon</span>
              </button>
              <button
                type="button"
                className={`sidebar-browse-btn ${statusFilter === "WATCHLIST" ? "active" : ""}`}
                onClick={() => setStatusFilter("WATCHLIST")}
              >
                <Heart size={16} fill={statusFilter === "WATCHLIST" ? "currentColor" : "none"} />
                <span>Watchlist</span>
                {watchlistCount > 0 && (
                  <span className="sidebar-badge-count">{watchlistCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Languages Filter */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Languages</span>
            <div className="sidebar-pill-list">
              {SIDEBAR_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`sidebar-pill-btn ${selectedLanguage === lang ? "active" : ""}`}
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {lang === "ALL" ? "All" : lang}
                </button>
              ))}
            </div>
          </div>

          {/* Formats Filter */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Formats</span>
            <div className="sidebar-pill-list">
              {SIDEBAR_FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className={`sidebar-pill-btn ${selectedFormat === fmt ? "active" : ""}`}
                  onClick={() => setSelectedFormat(fmt)}
                >
                  {fmt === "ALL" ? "All" : fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Genres Filter */}
          <div className="sidebar-group">
            <span className="sidebar-group-title">Genres</span>
            <div className="sidebar-pill-list">
              {SIDEBAR_GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`sidebar-pill-btn ${selectedGenre === g ? "active" : ""}`}
                  onClick={() => setSelectedGenre(g)}
                >
                  {g === "ALL" ? "All" : g}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Cinema Content Area */}
        <main className="cine-main-content">
          {/* Hero Header Area */}
          <section className="cine-hero-header">
            <div className="cine-hero-overlay" />
            <div className="cine-hero-content">
              <span className="cine-hero-tracker">
                {statusFilter === "NOW_SHOWING"
                  ? "NOW SHOWING"
                  : statusFilter === "COMING_SOON"
                  ? "COMING SOON"
                  : statusFilter === "WATCHLIST"
                  ? "MY WATCHLIST"
                  : "ALL MOVIES"}
              </span>
              <h1 className="cine-hero-headline">
                {statusFilter === "COMING_SOON"
                  ? "Anticipated releases on the horizon."
                  : statusFilter === "WATCHLIST"
                  ? "Your saved movies and favorites."
                  : "Movies worth leaving home for."}
              </h1>
            </div>
          </section>

          {/* Quick Filter Bar & Sort Controls */}
          <div className="cine-quick-filter-bar">
            {/* Quick Horizontal Genre Pills */}
            <div className="quick-genres-list">
              {QUICK_GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`quick-genre-pill ${selectedGenre === g ? "active" : ""}`}
                  onClick={() => setSelectedGenre(g)}
                >
                  {g === "ALL" ? "All" : g}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="cine-sort-wrapper">
              <label htmlFor="sort-select" className="sort-label">Sort by</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-dropdown-select"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="latest">Release Date</option>
              </select>
            </div>
          </div>

          {/* Active Filter Indicators */}
          {(selectedGenre !== "ALL" || selectedLanguage !== "ALL" || selectedFormat !== "ALL" || searchQuery) && (
            <div className="active-filters-strip">
              <span className="filters-strip-label">
                <SlidersHorizontal size={13} /> Active Filters:
              </span>
              {selectedGenre !== "ALL" && (
                <span className="active-tag-bubble">
                  Genre: {selectedGenre}
                  <button type="button" onClick={() => setSelectedGenre("ALL")}>×</button>
                </span>
              )}
              {selectedLanguage !== "ALL" && (
                <span className="active-tag-bubble">
                  Language: {selectedLanguage}
                  <button type="button" onClick={() => setSelectedLanguage("ALL")}>×</button>
                </span>
              )}
              {selectedFormat !== "ALL" && (
                <span className="active-tag-bubble">
                  Format: {selectedFormat}
                  <button type="button" onClick={() => setSelectedFormat("ALL")}>×</button>
                </span>
              )}
              {searchQuery && (
                <span className="active-tag-bubble">
                  Search: "{searchQuery}"
                  <button type="button" onClick={() => setSearchQuery("")}>×</button>
                </span>
              )}
              <button
                type="button"
                className="btn-clear-all-filters"
                onClick={() => {
                  setSelectedGenre("ALL");
                  setSelectedLanguage("ALL");
                  setSelectedFormat("ALL");
                  setSearchQuery("");
                }}
              >
                Reset All
              </button>
            </div>
          )}

          {/* Movie Grid */}
          <section className="cine-grid-section">
            {movies.length > 0 ? (
              <div className="cine-movie-grid">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onOpenDetail={handleOpenDetail}
                    onBookTickets={handleOpenShowtimes}
                    onWatchTrailer={handleOpenTrailer}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-catalog-state">
                <p className="empty-title">No movies match your current filters</p>
                <p className="empty-subtitle">
                  {statusFilter === "WATCHLIST"
                    ? "Click the heart icon on any movie poster to save it to your watchlist."
                    : "Try selecting 'All' in the filters or clearing your search query."}
                </p>
                <button
                  type="button"
                  className="btn-empty-reset"
                  onClick={() => {
                    setSelectedGenre("ALL");
                    setSelectedLanguage("ALL");
                    setSelectedFormat("ALL");
                    setSearchQuery("");
                    setStatusFilter("NOW_SHOWING");
                  }}
                >
                  View All Now Showing
                </button>
              </div>
            )}
          </section>

          {/* "Coming Soon" Section (Rendered when viewing Now Showing) */}
          {statusFilter === "NOW_SHOWING" && !searchQuery && comingSoonMovies.length > 0 && (
            <section className="cine-coming-soon-section">
              <div className="section-header-row">
                <h2 className="section-title-serif">Coming Soon</h2>
                <button
                  type="button"
                  className="link-view-all"
                  onClick={() => setStatusFilter("COMING_SOON")}
                >
                  <span>View all</span>
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="cine-movie-grid">
                {comingSoonMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onOpenDetail={handleOpenDetail}
                    onBookTickets={handleOpenShowtimes}
                    onWatchTrailer={handleOpenTrailer}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      {showCityModal && (
        <CitySelectorModal
          currentCity={currentCity}
          onSelectCity={handleCityChange}
          onClose={() => setShowCityModal(false)}
        />
      )}

      {activeModal === "detail" && selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={handleCloseModal}
          onBookTickets={handleOpenShowtimes}
          onWatchTrailer={handleOpenTrailer}
        />
      )}

      {activeModal === "showtimes" && selectedMovie && (
        <ShowtimeSelectorModal
          movie={selectedMovie}
          selectedCity={currentCity}
          onClose={handleCloseModal}
          onSelectShow={handleSelectShow}
        />
      )}

      {activeModal === "seats" && activeShow && activeShowDetails && (
        <SeatSelectionModal
          showId={activeShow.id}
          show={activeShow}
          showDetails={activeShowDetails}
          onClose={handleCloseModal}
          onProceedToFnb={handleProceedToFnb}
        />
      )}

      {activeModal === "fnb" && pendingSeatSelection && (
        <FoodAndBeverageModal
          pendingBookingData={pendingSeatSelection}
          onProceedWithFnb={handleProceedToPaymentWithFnb}
          onSkipFnb={handleSkipFnb}
          onClose={handleCloseModal}
          onReservationExpired={handleReservationExpired}
        />
      )}

      {activeModal === "payment" && pendingBooking && (
        <PaymentModal
          pendingBooking={pendingBooking}
          onBack={() => setActiveModal("fnb")}
          onClose={handleCloseModal}
          onPaymentSuccess={handlePaymentSuccess}
          onReservationExpired={handleReservationExpired}
        />
      )}

      {activeModal === "ticket" && confirmedBooking && (
        <TicketConfirmationModal
          booking={confirmedBooking}
          onClose={handleCloseModal}
          onViewMyBookings={handleOpenMyBookings}
        />
      )}

      {activeModal === "my_bookings" && (
        <MyBookingsModal
          onClose={handleCloseModal}
          onBookingCancelled={refreshBookings}
        />
      )}

      {activeModal === "trailer" && selectedMovie && (
        <TrailerModal
          movie={selectedMovie}
          onClose={handleCloseModal}
        />
      )}

      {activeModal === "offers" && (
        <OffersModal onClose={handleCloseModal} />
      )}
    </div>
  );
}
