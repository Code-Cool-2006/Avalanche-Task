import {
  INITIAL_MOVIES,
  INITIAL_THEATRES,
  INITIAL_SCREENS,
  INITIAL_SHOWS,
  INITIAL_SHOW_SEATS,
  CITIES,
  FOOD_AND_BEVERAGES,
  PROMO_CODES,
} from "../data/mockCinemaData";
import {
  moviesApi,
  theatresApi,
  screensApi,
  seatsApi,
  showsApi,
  bookingsApi,
  concessionsApi,
  paymentsApi,
} from "./api";

const KEYS = {
  MOVIES: "cine_bms_movies_v3",
  THEATRES: "cine_bms_theatres_v3",
  SCREENS: "cine_bms_screens_v3",
  SHOWS: "cine_bms_shows_v3",
  SHOW_SEATS: "cine_bms_show_seats_v3",
  BOOKINGS: "cine_bms_bookings_v3",
  SELECTED_CITY: "cine_bms_selected_city_v3",
};

export const CURRENT_USER = {
  id: 1,
  name: "Alex Mercer",
  email: "alex.mercer@cineshow.in",
  role: "user",
};

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Storage read error for ${key}:`, err);
    return fallback;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`Storage write error for ${key}:`, err);
  }
}

/**
 * Normalizes backend movie object into consistent frontend model
 */
export function normalizeMovie(m) {
  if (!m) return null;
  const genreArray = Array.isArray(m.genre)
    ? m.genre
    : typeof m.genre === "string"
    ? m.genre.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  return {
    ...m,
    id: Number(m.id),
    title: m.title || "Untitled",
    description: m.description || "",
    rating: m.rating != null ? Number(m.rating) : 8.0,
    duration_min: m.duration_min != null ? Number(m.duration_min) : 120,
    genre: genreArray.length > 0 ? genreArray : ["Drama"],
    language: m.language || "English",
    languagesAvailable: m.languagesAvailable || (m.language ? [m.language] : ["English"]),
    formats: m.formats || [m.format || "2D", "IMAX 2D"],
    certificate: m.certificate || "U/A",
    status: m.status || (m.release_date && new Date(m.release_date) > new Date() ? "COMING_SOON" : "NOW_SHOWING"),
    poster_url: m.poster_url || "/assets/hero.png",
    trailer_url: m.trailer_url || "",
    release_date: m.release_date || "",
    featured: m.featured ?? true,
  };
}

/**
 * Normalizes backend theatre object
 */
export function normalizeTheatre(t) {
  if (!t) return null;
  return {
    ...t,
    id: Number(t.id),
    name: t.name || "Cinema Hall",
    city: t.city || "Mumbai",
    address: t.address || "",
    rating: t.rating != null ? Number(t.rating) : 4.7,
    amenities: t.amenities || ["M-Ticket", "Food & Beverage", "Recliner Seats", "Dolby Atmos"],
  };
}

/**
 * Normalizes backend screen object
 */
export function normalizeScreen(s) {
  if (!s) return null;
  return {
    ...s,
    id: Number(s.id),
    theatre_id: Number(s.theatre_id),
    name: s.name || `Screen ${s.id}`,
    format: s.format || "IMAX 2D",
    regular_rows: s.regular_rows || 4,
    premium_rows: s.premium_rows || 3,
    recliner_rows: s.recliner_rows || 2,
    seats_per_row: s.seats_per_row || 10,
  };
}

/**
 * Normalizes backend food / concession item
 */
export function normalizeConcession(f) {
  if (!f) return null;
  const isVeg =
    f.is_veg ??
    f.isVeg ??
    (!f.name.toLowerCase().includes("chicken") && !f.name.toLowerCase().includes("meat"));

  return {
    ...f,
    id: Number(f.id),
    name: f.name,
    description: f.description || "",
    category: f.category || "Snacks",
    price: parseFloat(f.price) || 0,
    image: f.image_url || f.image || "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500&q=80",
    image_url: f.image_url || f.image || "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500&q=80",
    isVeg,
    popular: f.popular ?? (f.category === "Combos" || f.category === "Popcorn"),
    available: f.available ?? true,
  };
}

// Ensure default pre-seeded fallback data
export function initializeStorage() {
  getStored(KEYS.MOVIES, INITIAL_MOVIES);
  getStored(KEYS.THEATRES, INITIAL_THEATRES);
  getStored(KEYS.SCREENS, INITIAL_SCREENS);
  getStored(KEYS.SHOWS, INITIAL_SHOWS);
  getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
  getStored(KEYS.BOOKINGS, []);
  getStored(KEYS.SELECTED_CITY, CITIES[0]);
}

// City Preference
export function getSelectedCity() {
  return getStored(KEYS.SELECTED_CITY, CITIES[0]);
}

export function setSelectedCity(city) {
  setStored(KEYS.SELECTED_CITY, city);
}

// ---------------------------------------------------------------------------
// 1. MOVIES (Async Backend API + Client Filter Engine)
// ---------------------------------------------------------------------------

export async function fetchMoviesFromApi() {
  try {
    const rawMovies = await moviesApi.getAll();
    if (Array.isArray(rawMovies) && rawMovies.length > 0) {
      const normalized = rawMovies.map(normalizeMovie);
      setStored(KEYS.MOVIES, normalized);
      return normalized;
    }
  } catch (err) {
    console.warn("Backend /api/movies unavailable, using cached/fallback movies:", err.message);
  }
  return getStored(KEYS.MOVIES, INITIAL_MOVIES).map(normalizeMovie);
}

export async function fetchMovieByIdFromApi(id) {
  try {
    const rawMovie = await moviesApi.getById(id);
    if (rawMovie && rawMovie.id) {
      return normalizeMovie(rawMovie);
    }
  } catch (err) {
    console.warn(`Backend /api/movies/${id} unavailable, using cached movie:`, err.message);
  }
  const movies = getStored(KEYS.MOVIES, INITIAL_MOVIES).map(normalizeMovie);
  return movies.find((m) => m.id === Number(id)) || null;
}

export function getMovies(filters = {}) {
  const movies = getStored(KEYS.MOVIES, INITIAL_MOVIES).map(normalizeMovie);
  const { query, genre, language, format, status } = filters;

  return movies.filter((m) => {
    if (query) {
      const q = query.toLowerCase().trim();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchGenre = m.genre?.some((g) => g.toLowerCase().includes(q));
      const matchDirector = m.director?.toLowerCase().includes(q);
      const matchCast = m.cast?.some((c) => c.name?.toLowerCase().includes(q));
      if (!matchTitle && !matchGenre && !matchDirector && !matchCast) return false;
    }

    if (status && status !== "ALL") {
      if (m.status !== status) return false;
    }

    if (genre && genre !== "ALL") {
      if (!m.genre?.includes(genre)) return false;
    }

    if (language && language !== "ALL") {
      const langs = m.languagesAvailable || [m.language];
      if (!langs.includes(language) && m.language !== language) return false;
    }

    if (format && format !== "ALL") {
      if (!m.formats?.includes(format)) return false;
    }

    return true;
  });
}

export function getMovieById(id) {
  const movies = getStored(KEYS.MOVIES, INITIAL_MOVIES).map(normalizeMovie);
  return movies.find((m) => m.id === Number(id)) || null;
}

// ---------------------------------------------------------------------------
// 2. THEATRES & SCREENS
// ---------------------------------------------------------------------------

export async function fetchTheatresFromApi(city = null) {
  try {
    const rawTheatres = await theatresApi.getAll();
    if (Array.isArray(rawTheatres) && rawTheatres.length > 0) {
      const normalized = rawTheatres.map(normalizeTheatre);
      setStored(KEYS.THEATRES, normalized);
      if (city) {
        return normalized.filter((t) => t.city.toLowerCase() === city.toLowerCase());
      }
      return normalized;
    }
  } catch (err) {
    console.warn("Backend /api/theatres unavailable, using cached theatres:", err.message);
  }
  return getTheatres(city);
}

export function getTheatres(city = null) {
  const theatres = getStored(KEYS.THEATRES, INITIAL_THEATRES).map(normalizeTheatre);
  if (city) {
    return theatres.filter((t) => t.city.toLowerCase() === city.toLowerCase());
  }
  return theatres;
}

export async function fetchScreensFromApi() {
  try {
    const rawScreens = await screensApi.getAll();
    if (Array.isArray(rawScreens) && rawScreens.length > 0) {
      const normalized = rawScreens.map(normalizeScreen);
      setStored(KEYS.SCREENS, normalized);
      return normalized;
    }
  } catch (err) {
    console.warn("Backend /api/screens unavailable, using cached screens:", err.message);
  }
  return getScreens();
}

export function getScreens() {
  return getStored(KEYS.SCREENS, INITIAL_SCREENS).map(normalizeScreen);
}

// ---------------------------------------------------------------------------
// 3. SHOWS & SHOWTIMES (Real Backend API GET /api/shows)
// ---------------------------------------------------------------------------

/**
 * Fetches shows for a given movie, city, and target date from backend GET /api/shows
 */
export async function fetchShowsForMovieFromApi(movieId, city = null, targetDateStr = null) {
  try {
    const params = {};
    if (movieId) params.movieId = movieId;
    if (city) params.city = city;
    if (targetDateStr) params.date = targetDateStr;

    const showsList = await showsApi.getAll(params);

    if (Array.isArray(showsList)) {
      // Group shows by Theatre
      const theatreGroupsMap = new Map();

      for (const s of showsList) {
        const tId = s.theatre_id;
        if (!theatreGroupsMap.has(tId)) {
          theatreGroupsMap.set(tId, {
            theatre: {
              id: s.theatre_id,
              name: s.theatre_name || "Cinema Hall",
              city: s.theatre_city || city || "City",
              address: s.theatre_address || "",
              rating: 4.8,
              amenities: ["M-Ticket", "Food & Beverage", "Recliner Seats", "Dolby Atmos"],
            },
            shows: [],
          });
        }

        theatreGroupsMap.get(tId).shows.push({
          ...s,
          id: Number(s.id),
          movie_id: Number(s.movie_id),
          theatre_id: Number(s.theatre_id),
          screen_id: Number(s.screen_id),
          start_time: s.start_time,
          end_time: s.end_time,
          format: s.format || "IMAX 2D",
          language: s.language || "English",
          price_regular: parseFloat(s.price_regular) || 180,
          price_premium: parseFloat(s.price_premium) || 260,
          price_recliner: parseFloat(s.price_recliner) || 420,
          screen: {
            id: Number(s.screen_id),
            name: s.screen_name || `Screen ${s.screen_id}`,
            theatre_id: Number(s.theatre_id),
            format: s.format || "IMAX 2D",
          },
        });
      }

      return Array.from(theatreGroupsMap.values()).map((g) => ({
        ...g,
        shows: g.shows.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
      }));
    }
  } catch (err) {
    console.warn("Backend /api/shows unavailable, falling back to local calculation:", err.message);
  }

  // Fallback to local filtering
  return getShowsForMovie(movieId, city, targetDateStr);
}

export function getShowsForMovie(movieId, city = null, targetDateStr = null) {
  const shows = getStored(KEYS.SHOWS, INITIAL_SHOWS);
  const screens = getScreens();
  const theatres = getTheatres(city);

  const theatresMap = new Map(theatres.map((t) => [t.id, t]));
  const screensMap = new Map(screens.map((s) => [s.id, s]));

  const matchingShows = shows.filter((s) => {
    if (s.movie_id !== Number(movieId)) return false;
    const screen = screensMap.get(s.screen_id);
    if (!screen) return false;
    const theatre = theatresMap.get(screen.theatre_id);
    if (!theatre) return false;

    if (targetDateStr) {
      const showDate = new Date(s.start_time).toISOString().split("T")[0];
      if (showDate !== targetDateStr) return false;
    }
    return true;
  });

  const grouped = [];
  for (const theatre of theatres) {
    const theatreShows = matchingShows
      .filter((s) => {
        const sc = screensMap.get(s.screen_id);
        return sc && sc.theatre_id === theatre.id;
      })
      .map((s) => ({
        ...s,
        screen: screensMap.get(s.screen_id),
      }))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    if (theatreShows.length > 0) {
      grouped.push({ theatre, shows: theatreShows });
    }
  }

  return grouped;
}

export async function fetchShowDetailsFromApi(showId) {
  try {
    const show = await showsApi.getById(showId);
    if (show && show.id) {
      return {
        show: {
          id: Number(show.id),
          movie_id: Number(show.movie_id),
          theatre_id: Number(show.theatre_id),
          screen_id: Number(show.screen_id),
          start_time: show.start_time,
          end_time: show.end_time,
          language: show.language,
          format: show.format,
          price_regular: parseFloat(show.price_regular),
          price_premium: parseFloat(show.price_premium),
          price_recliner: parseFloat(show.price_recliner),
        },
        movie: {
          id: Number(show.movie_id),
          title: show.movie_title,
          poster_url: show.movie_poster,
          rating: Number(show.movie_rating),
          genre: typeof show.movie_genre === "string" ? show.movie_genre.split(",") : ["Drama"],
          duration_min: Number(show.movie_duration),
        },
        theatre: {
          id: Number(show.theatre_id),
          name: show.theatre_name,
          city: show.theatre_city,
          address: show.theatre_address,
        },
        screen: {
          id: Number(show.screen_id),
          theatre_id: Number(show.theatre_id),
          name: show.screen_name,
          format: show.format,
        },
      };
    }
  } catch (err) {
    console.warn(`Backend /api/shows/${showId} failed:`, err.message);
  }
  return getShowDetails(showId);
}

export function getShowDetails(showId) {
  const shows = getStored(KEYS.SHOWS, INITIAL_SHOWS);
  const movies = getStored(KEYS.MOVIES, INITIAL_MOVIES).map(normalizeMovie);
  const screens = getScreens();
  const theatres = getTheatres();

  const show = shows.find((s) => s.id === Number(showId));
  if (!show) return null;

  const movie = movies.find((m) => m.id === show.movie_id);
  const screen = screens.find((sc) => sc.id === show.screen_id);
  const theatre = screen ? theatres.find((t) => t.id === screen.theatre_id) : null;

  return { show, movie, screen, theatre };
}

// ---------------------------------------------------------------------------
// 4. SHOW-SPECIFIC SEATS (Real Backend GET /api/shows/:showId/seats)
// ---------------------------------------------------------------------------

/**
 * Fetches show seat availability and transforms it for 2D/3D seat maps
 */
export async function fetchShowSeatsFromApi(showId) {
  const data = await showsApi.getSeatsByShow(showId);
  const { show, seats = [] } = data;

  // Group seats by row_label
  const rowsMap = new Map();
  const allSeats = [];

  seats.forEach((st) => {
    const row = st.row_label;
    const tier = st.tier || "regular";
    const status = st.status?.toLowerCase() || "available";
    const seatId = String(st.seat_id);

    if (!rowsMap.has(row)) {
      rowsMap.set(row, { row, tier, seats: [] });
    }

    const fullSeat = {
      id: seatId,
      backend_id: st.seat_id,
      seat_id: st.seat_id,
      row: st.row_label,
      number: st.seat_number,
      tier,
      status: status === "booked" ? "booked" : status === "locked" ? "locked_other" : "available",
      price: parseFloat(st.price) || 180,
      isMyLock: false,
      locked_until: st.locked_until,
    };

    rowsMap.get(row).seats.push(fullSeat);
    allSeats.push(fullSeat);
  });

  const sortedRows = Array.from(rowsMap.values()).map((r) => ({
    ...r,
    seats: r.seats.sort((a, b) => a.number - b.number),
  }));

  return {
    show,
    rows: sortedRows,
    allSeats,
    pricing: {
      regular: show?.pricing?.regular || 180,
      premium: show?.pricing?.premium || 260,
      recliner: show?.pricing?.recliner || 420,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. FOOD & CONCESSIONS (Real Backend GET /api/concessions)
// ---------------------------------------------------------------------------

export async function fetchConcessionsFromApi(category = null) {
  try {
    const raw = await concessionsApi.getAll(category);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(normalizeConcession);
    }
  } catch (err) {
    console.warn("Backend /api/concessions unavailable:", err.message);
  }
  return FOOD_AND_BEVERAGES.map(normalizeConcession);
}

export function getFoodAndBeverages() {
  return FOOD_AND_BEVERAGES;
}

export function getPromoCodes() {
  return PROMO_CODES;
}

export function applyPromoCode(code, subtotal) {
  if (!code) return { valid: false, discount: 0, message: "" };
  const found = PROMO_CODES.find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
  if (!found) {
    return { valid: false, discount: 0, message: "Invalid promo code" };
  }

  let discount = 0;
  if (found.type === "PERCENTAGE") {
    discount = Math.min(found.maxDiscount, Math.round((subtotal * found.value) / 100));
  } else {
    discount = Math.min(subtotal, found.value);
  }

  return {
    valid: true,
    discount,
    code: found.code,
    description: found.description,
    message: `Promo code applied! Saved ₹${discount}`,
  };
}

// ---------------------------------------------------------------------------
// 6. ATOMIC SEAT RESERVATION (Backend POST /api/bookings/reserve)
// ---------------------------------------------------------------------------

export async function reserveSeatsOnBackend(showId, seatIds, fnbItems = []) {
  const payload = {
    showId: Number(showId),
    seatIds: seatIds.map(Number),
    fnbItems: fnbItems.map((fi) => ({
      food_item_id: fi.id || fi.food_item_id,
      quantity: fi.quantity,
    })),
  };

  const response = await bookingsApi.reserve(payload);
  const { booking } = response;

  return {
    ...booking,
    id: Number(booking.id),
    booking_code: booking.booking_code,
    status: booking.status,
    subtotal: parseFloat(booking.subtotal),
    food_total: parseFloat(booking.food_total || 0),
    convenience_fee: parseFloat(booking.convenience_fee || 0),
    total_amount: parseFloat(booking.total_amount),
    locked_until: booking.locked_until,
    seats_summary: booking.seats?.map((s) => ({
      seatId: String(s.seat_id),
      row: s.row_label,
      number: s.seat_number,
      tier: s.tier,
      price: parseFloat(s.price),
    })) || [],
  };
}

// ---------------------------------------------------------------------------
// 7. BOOKING CONFIRMATION & PAYMENT (Backend POST /api/bookings/:id/confirm)
// ---------------------------------------------------------------------------

export async function confirmBookingOnBackend(bookingId, paymentMethod = "Credit Card") {
  const payload = {
    paymentMethod,
    providerPaymentId: "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
  };

  const response = await bookingsApi.confirm(bookingId, payload);
  const { booking } = response;

  return {
    ...booking,
    id: Number(booking.id),
    status: booking.status,
    total_amount: parseFloat(booking.total_amount),
    ticket_code: booking.ticket?.ticket_number || booking.booking_code,
    payment: booking.payment,
    ticket: booking.ticket,
  };
}

// ---------------------------------------------------------------------------
// 8. MY BOOKINGS & CANCELLATION (Backend GET/POST /api/bookings/*)
// ---------------------------------------------------------------------------

export async function fetchMyBookingsFromApi() {
  const list = await bookingsApi.getMyBookings();
  if (Array.isArray(list)) {
    return list.map((b) => ({
      ...b,
      id: Number(b.id),
      subtotal: parseFloat(b.subtotal),
      food_total: parseFloat(b.food_total || 0),
      convenience_fee: parseFloat(b.convenience_fee || 0),
      discount: parseFloat(b.discount || 0),
      total_amount: parseFloat(b.total_amount),
      ticket_code: b.ticket_number || b.booking_code,
      seats_summary: (b.seats || []).map((s) => ({
        seatId: String(s.seat_id),
        row: s.row,
        number: s.number,
        tier: s.tier,
        price: parseFloat(s.price),
      })),
      fnb_items: (b.food_items || []).map((f) => ({
        name: f.name,
        category: f.category,
        quantity: f.quantity,
        price: parseFloat(f.price),
      })),
    }));
  }
  return [];
}

export async function cancelBookingOnBackend(bookingId) {
  return await bookingsApi.cancel(bookingId);
}

// Local helper backward compatibility
export function getMyBookings() {
  return getStored(KEYS.BOOKINGS, []);
}
