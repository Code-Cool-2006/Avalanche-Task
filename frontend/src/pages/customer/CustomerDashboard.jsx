import React, { useState, useEffect, useMemo } from "react";
import CustomerNavbar from "../../components/customer/CustomerNavbar";
import HeroBanner from "../../components/customer/HeroBanner";
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

import {
  initializeStorage,
  getMovies,
  getSelectedCity,
  setSelectedCity,
  getMyBookings,
  getShowDetails,
  createPendingBooking,
  cleanupExpiredLocks,
} from "../../services/customerBookingService";
import { INITIAL_MOVIES } from "../../data/mockCinemaData";
import {
  Sparkles,
  Film,
  ShieldCheck,
  Armchair,
  QrCode,
  Flame,
  CalendarDays,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

const GENRES = [
  "ALL",
  "Action",
  "Sci-Fi",
  "Drama",
  "Adventure",
  "Animation",
  "Comedy",
  "Horror",
  "Thriller",
];

const LANGUAGES = ["ALL", "English", "Hindi", "Telugu", "Tamil"];
const FORMATS = ["ALL", "IMAX 2D", "IMAX 3D", "4DX", "2D", "3D"];

export default function CustomerDashboard() {
  // Storage initialization & periodic cleanup for expired 5-minute reservations
  useEffect(() => {
    initializeStorage();
    const interval = setInterval(() => {
      cleanupExpiredLocks();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [currentCity, setCurrentCity] = useState(() => getSelectedCity());
  const [showCityModal, setShowCityModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("NOW_SHOWING"); // "NOW_SHOWING" | "COMING_SOON"
  const [selectedGenre, setSelectedGenre] = useState("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState("ALL");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [sortBy, setSortBy] = useState("popular"); // "popular" | "rating" | "latest"
  const [bookingsList, setBookingsList] = useState([]);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'detail' | 'showtimes' | 'seats' | 'fnb' | 'payment' | 'ticket' | 'my_bookings' | 'trailer' | null
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

  useEffect(() => {
    refreshBookings();
  }, []);

  // Update city preference
  const handleCityChange = (city) => {
    setCurrentCity(city);
    setSelectedCity(city);
  };

  // Filtered movies
  const movies = useMemo(() => {
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
  }, [searchQuery, selectedGenre, selectedLanguage, selectedFormat, statusFilter, sortBy, currentCity]);

  // Featured movies for hero carousel
  const featuredMovies = useMemo(() => {
    return INITIAL_MOVIES.filter((m) => m.featured);
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

  // From Seat Selection -> to F&B snack bar
  const handleProceedToFnb = (seatSelectionData) => {
    setPendingSeatSelection(seatSelectionData);
    setActiveModal("fnb");
  };

  // From F&B -> to Payment Modal
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
      />

      {/* Hero Showcase Banner */}
      {!searchQuery && selectedGenre === "ALL" && statusFilter === "NOW_SHOWING" && (
        <HeroBanner
          featuredMovies={featuredMovies}
          onBookTickets={handleOpenShowtimes}
          onWatchTrailer={handleOpenTrailer}
          onOpenDetail={handleOpenDetail}
        />
      )}

      {/* Main Movies Catalog Section */}
      <main className="catalog-main-content">
        <div className="catalog-controls-container">
          {/* BookMyShow Tab Navigation: Now Showing vs Coming Soon */}
          <div className="bms-main-view-tabs">
            <button
              type="button"
              className={`bms-view-tab ${statusFilter === "NOW_SHOWING" ? "active" : ""}`}
              onClick={() => setStatusFilter("NOW_SHOWING")}
            >
              <Flame size={18} className="icon-crimson" />
              <span>Now Showing</span>
            </button>
            <button
              type="button"
              className={`bms-view-tab ${statusFilter === "COMING_SOON" ? "active" : ""}`}
              onClick={() => setStatusFilter("COMING_SOON")}
            >
              <CalendarDays size={18} className="icon-cyan" />
              <span>Coming Soon</span>
            </button>
          </div>

          <div className="catalog-header-row">
            <div className="catalog-title-group">
              <div className="section-badge">
                <Sparkles size={14} className="icon-crimson" />
                <span>
                  {statusFilter === "NOW_SHOWING" ? "EXPERIENCE IN THEATRES" : "UPCOMING CINEMA RELEASES"}
                </span>
              </div>
              <h2>
                {statusFilter === "NOW_SHOWING"
                  ? `Movies Screening in ${currentCity}`
                  : `Anticipated Movies Coming to ${currentCity}`}
              </h2>
            </div>

            <div className="catalog-right-controls">
              <span className="movies-count-indicator">
                {movies.length} {movies.length === 1 ? "Movie" : "Movies"} Available
              </span>

              {/* Sort By Dropdown */}
              <div className="sort-dropdown-wrap">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bms-sort-select"
                >
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="latest">Release Date</option>
                </select>
              </div>
            </div>
          </div>

          {/* Multi-tier Filter Bar */}
          <div className="bms-filter-strip-wrapper">
            {/* Languages Filter Pills */}
            <div className="filter-pill-row">
              <span className="filter-category-label">Languages:</span>
              <div className="filter-scroll-row">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`bms-filter-chip ${selectedLanguage === lang ? "active" : ""}`}
                    onClick={() => setSelectedLanguage(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Formats Filter Pills */}
            <div className="filter-pill-row">
              <span className="filter-category-label">Formats:</span>
              <div className="filter-scroll-row">
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className={`bms-filter-chip ${selectedFormat === fmt ? "active" : ""}`}
                    onClick={() => setSelectedFormat(fmt)}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre Filter Pills */}
            <div className="filter-pill-row">
              <span className="filter-category-label">Genres:</span>
              <div className="genre-filter-scroll-bar">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`genre-filter-pill ${selectedGenre === g ? "active" : ""}`}
                    onClick={() => setSelectedGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Movies Grid */}
        {movies.length === 0 ? (
          <div className="catalog-empty-search-state">
            <Film size={48} className="empty-icon" />
            <h3>No movies found</h3>
            <p>We couldn't find any movie matching your current filters.</p>
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setSearchQuery("");
                setSelectedGenre("ALL");
                setSelectedLanguage("ALL");
                setSelectedFormat("ALL");
                setStatusFilter("NOW_SHOWING");
              }}
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <div className="movies-showcase-grid">
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
        )}

        {/* Features / Benefits Strip */}
        <div className="cinema-perks-strip">
          <div className="perk-box">
            <div className="perk-icon-wrap">
              <Armchair size={22} className="icon-cyan" />
            </div>
            <div className="perk-text">
              <h4>3D Interactive Sightline Map</h4>
              <p>Preview the exact auditorium angle and screen perspective before picking your seat.</p>
            </div>
          </div>
          <div className="perk-box">
            <div className="perk-icon-wrap">
              <ShieldCheck size={22} className="icon-amber" />
            </div>
            <div className="perk-text">
              <h4>Real-Time 5-Min Seat Hold</h4>
              <p>Reserved seats are locked exclusively for you during checkout with zero double booking.</p>
            </div>
          </div>
          <div className="perk-box">
            <div className="perk-icon-wrap">
              <QrCode size={22} className="icon-crimson" />
            </div>
            <div className="perk-text">
              <h4>Instant Digital M-Ticket</h4>
              <p>Contactless door entry validation and concessions pickup pass right on your phone.</p>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 0. City Selector Dialog */}
      {showCityModal && (
        <CitySelectorModal
          currentCity={currentCity}
          onSelectCity={handleCityChange}
          onClose={() => setShowCityModal(false)}
        />
      )}

      {/* 1. Movie Details */}
      {activeModal === "detail" && selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={handleCloseModal}
          onBookTickets={handleOpenShowtimes}
          onWatchTrailer={handleOpenTrailer}
        />
      )}

      {/* 2. Showtime & Theatre Picker */}
      {activeModal === "showtimes" && selectedMovie && (
        <ShowtimeSelectorModal
          movie={selectedMovie}
          selectedCity={currentCity}
          onClose={handleCloseModal}
          onSelectShow={handleSelectShow}
        />
      )}

      {/* 3. 2D / 3D Seat Selection */}
      {activeModal === "seats" && activeShow && activeShowDetails && (
        <SeatSelectionModal
          showId={activeShow.id}
          showDetails={activeShowDetails}
          onClose={handleCloseModal}
          onProceedToFnb={handleProceedToFnb}
        />
      )}

      {/* 3b. BookMyShow Food & Beverage Concessions */}
      {activeModal === "fnb" && pendingSeatSelection && (
        <FoodAndBeverageModal
          pendingBookingData={pendingSeatSelection}
          onProceedWithFnb={handleProceedToPaymentWithFnb}
          onSkipFnb={handleSkipFnb}
          onClose={handleCloseModal}
          onReservationExpired={handleReservationExpired}
        />
      )}

      {/* 4. Mock Checkout & Payment */}
      {activeModal === "payment" && pendingBooking && (
        <PaymentModal
          pendingBooking={pendingBooking}
          onBack={() => setActiveModal("fnb")}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={handleCloseModal}
          onReservationExpired={handleReservationExpired}
        />
      )}

      {/* 5. Ticket Confirmation */}
      {activeModal === "ticket" && confirmedBooking && (
        <TicketConfirmationModal
          booking={confirmedBooking}
          onClose={handleCloseModal}
          onViewMyBookings={handleOpenMyBookings}
        />
      )}

      {/* 6. My Bookings Drawer/Modal */}
      {activeModal === "my_bookings" && (
        <MyBookingsModal
          onClose={handleCloseModal}
          onBookingCancelled={refreshBookings}
        />
      )}

      {/* 7. Trailer Video Embed Modal */}
      {activeModal === "trailer" && selectedMovie && (
        <TrailerModal
          movie={selectedMovie}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
