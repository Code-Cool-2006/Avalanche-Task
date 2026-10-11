import {
  moviesApi,
  theatresApi,
  screensApi,
  showsApi,
  concessionsApi,
  bookingsApi,
  paymentsApi,
} from "./api.js";
import {
  INITIAL_MOVIES,
  INITIAL_THEATRES,
  INITIAL_SCREENS,
  INITIAL_SHOWS,
  INITIAL_SHOW_SEATS,
  CITIES,
  FOOD_AND_BEVERAGES,
  PROMO_CODES,
  createShows,
} from "../data/mockCinemaData.js";

const KEYS = {
  MOVIES: "cine_bms_movies_v3",
  THEATRES: "cine_bms_theatres_v3",
  SCREENS: "cine_bms_screens_v3",
  SHOWS: "cine_bms_shows_v3",
  SHOW_SEATS: "cine_bms_show_seats_v3",
  CONCESSIONS: "cine_bms_concessions_v3",
  BOOKINGS: "cine_bms_bookings_v3",
  SELECTED_CITY: "cine_bms_selected_city_v3",
  WATCHLIST: "cine_user_watchlist",
  FAV_THEATRES: "cine_user_fav_theatres",
};

// Global session user state (populated dynamically by AuthContext)
let _sessionUser = null;
export function setSessionUser(user) {
  _sessionUser = user;
}
export function getSessionUser() {
  return _sessionUser;
}

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (fallback !== undefined) localStorage.setItem(key, JSON.stringify(fallback));
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

// Normalize movie payload from PostgreSQL
function normalizeMovie(m) {
  let parsedGenre = ["Action"];
  if (Array.isArray(m.genre)) {
    parsedGenre = m.genre;
  } else if (typeof m.genre === "string") {
    try {
      const j = JSON.parse(m.genre);
      parsedGenre = Array.isArray(j) ? j : [m.genre];
    } catch {
      parsedGenre = m.genre.split(",").map((g) => g.trim()).filter(Boolean);
    }
  }

  let parsedFormats = ["2D", "IMAX 2D"];
  if (Array.isArray(m.formats)) {
    parsedFormats = m.formats;
  } else if (typeof m.formats === "string") {
    try {
      const j = JSON.parse(m.formats);
      parsedFormats = Array.isArray(j) ? j : [m.formats];
    } catch {
      parsedFormats = m.formats.split(",").map((f) => f.trim()).filter(Boolean);
    }
  }

  const isPastOrToday = m.release_date ? new Date(m.release_date) <= new Date() : true;
  const status = m.status || (isPastOrToday ? "NOW_SHOWING" : "COMING_SOON");

  return {
    id: m.id,
    title: m.title || "Untitled Movie",
    description: m.description || "",
    genre: parsedGenre.length ? parsedGenre : ["Action"],
    language: m.language || "English",
    languagesAvailable: m.languagesAvailable || [m.language || "English"],
    formats: parsedFormats,
    duration_min: Number(m.duration_min) || 120,
    rating: Number(m.rating) || 8.0,
    votes: m.votes || "150K",
    certificate: m.certificate || "U/A",
    poster_url: m.poster_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    backdrop_url: m.backdrop_url || m.poster_url || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80",
    trailer_url: m.trailer_url || "",
    release_date: m.release_date ? String(m.release_date).split("T")[0] : new Date().toISOString().split("T")[0],
    featured: Boolean(m.featured),
    status,
    cast: Array.isArray(m.cast) ? m.cast : (typeof m.cast_members === "string" ? m.cast_members.split(",").map(n => ({ name: n.trim(), role: "Actor" })) : []),
    director: m.director || "Director",
  };
}

// Initialize storage and sync live data from backend APIs
export function initializeStorage() {
  getStored(KEYS.MOVIES, []);
  getStored(KEYS.THEATRES, []);
  getStored(KEYS.SCREENS, []);
  getStored(KEYS.SHOWS, []);
  getStored(KEYS.SHOW_SEATS, []);
  getStored(KEYS.CONCESSIONS, []);
  getStored(KEYS.BOOKINGS, []);
  getStored(KEYS.SELECTED_CITY, CITIES[0]);
  getStored(KEYS.WATCHLIST, []);
  getStored(KEYS.FAV_THEATRES, {});
}

/**
 * Live Synchronization with Backend APIs:
 * Fetches real Movies, Theatres, Screens, Shows, Concessions, and Bookings from Express.
 */
export async function syncFromBackend() {
  // 1. Sync Movies from GET /api/movies
  try {
    const dbMovies = await moviesApi.getAll();
    if (Array.isArray(dbMovies) && dbMovies.length > 0) {
      const normalized = dbMovies.map(normalizeMovie);
      setStored(KEYS.MOVIES, normalized);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cine_movies_synced", { detail: { movies: normalized } }));
      }
    }
  } catch (err) {
    console.warn("Could not sync movies from /api/movies:", err.message);
  }

  // 2. Sync Theatres from GET /api/theatres
  try {
    const dbTheatres = await theatresApi.getAll();
    if (Array.isArray(dbTheatres) && dbTheatres.length > 0) {
      setStored(KEYS.THEATRES, dbTheatres);
      // Auto-update selected city if current is invalid
      const currentCity = getSelectedCity();
      const cities = Array.from(new Set(dbTheatres.map((t) => t.city).filter(Boolean)));
      if (cities.length > 0 && !cities.includes(currentCity)) {
        setSelectedCity(cities[0]);
      }
    }
  } catch (err) {
    console.warn("Could not sync theatres from /api/theatres:", err.message);
  }

  // 3. Sync Screens from GET /api/screens
  try {
    const dbScreens = await screensApi.getAll();
    if (Array.isArray(dbScreens) && dbScreens.length > 0) {
      setStored(KEYS.SCREENS, dbScreens);
    }
  } catch (err) {
    console.warn("Could not sync screens from /api/screens:", err.message);
  }

  // 4. Sync Shows from GET /api/shows
  try {
    const showsRes = await showsApi.getAll();
    const dbShows = Array.isArray(showsRes) ? showsRes : showsRes?.shows;
    if (Array.isArray(dbShows) && dbShows.length > 0) {
      setStored(KEYS.SHOWS, dbShows);
    }
  } catch (err) {
    console.warn("Could not sync shows from /api/shows:", err.message);
  }

  // 5. Sync Concessions from GET /api/concessions
  try {
    const dbConcessions = await concessionsApi.getAll();
    if (Array.isArray(dbConcessions) && dbConcessions.length > 0) {
      setStored(KEYS.CONCESSIONS, dbConcessions);
    }
  } catch (err) {
    console.warn("Could not sync concessions from /api/concessions:", err.message);
  }

  // 6. Sync User Bookings from GET /api/bookings/my
  try {
    const myBookings = await bookingsApi.getMyBookings();
    if (Array.isArray(myBookings)) {
      setStored(KEYS.BOOKINGS, myBookings);
    }
  } catch (err) {
    // Expected when unauthenticated or endpoint booting
  }
}

// Watchlist Helpers
export function getWatchlist() {
  return getStored(KEYS.WATCHLIST, []);
}

export function isMovieInWatchlist(id) {
  const list = getWatchlist();
  return list.includes(Number(id));
}

export function toggleWatchlistMovie(id) {
  const numId = Number(id);
  const current = getWatchlist();
  const exists = current.includes(numId);
  const updated = exists ? current.filter((x) => x !== numId) : [...current, numId];
  setStored(KEYS.WATCHLIST, updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cine_watchlist_updated", { detail: { watchlist: updated } }));
  }
  return !exists;
}

// Favorite Theatres Helpers
export function getFavoriteTheatres() {
  return getStored(KEYS.FAV_THEATRES, {});
}

export function toggleFavoriteTheatre(theatreId) {
  const current = getFavoriteTheatres();
  const updated = {
    ...current,
    [theatreId]: !current[theatreId],
  };
  setStored(KEYS.FAV_THEATRES, updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cine_fav_theatres_updated", { detail: { favs: updated } }));
  }
  return updated;
}

// City Preference & Dynamically Extracted Cities
export function getSelectedCity() {
  return getStored(KEYS.SELECTED_CITY, CITIES[0]);
}

export function setSelectedCity(city) {
  setStored(KEYS.SELECTED_CITY, city);
}

export function getCities() {
  const theatres = getTheatres();
  const dbCities = Array.from(new Set(theatres.map((t) => t.city).filter(Boolean)));
  if (dbCities.length > 0) return dbCities;
  return CITIES;
}

// Live Movies API
export function getMovies(filters = {}) {
  let movies = getStored(KEYS.MOVIES, []);
  if (!Array.isArray(movies) || movies.length === 0) {
    movies = INITIAL_MOVIES;
  }

  const { query, genre, language, format, status } = filters;

  return movies.filter((m) => {
    if (query) {
      const q = query.toLowerCase().trim();
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchGenre = Array.isArray(m.genre)
        ? m.genre.some((g) => g.toLowerCase().includes(q))
        : String(m.genre).toLowerCase().includes(q);
      const matchDirector = m.director?.toLowerCase().includes(q);
      const matchCast = m.cast?.some((c) => c.name?.toLowerCase().includes(q));
      if (!matchTitle && !matchGenre && !matchDirector && !matchCast) return false;
    }

    if (status && status !== "ALL") {
      if (status === "WATCHLIST") {
        const watchlist = getWatchlist();
        if (!watchlist.includes(m.id)) return false;
      } else if (m.status !== status) {
        return false;
      }
    }

    if (genre && genre !== "ALL") {
      const gList = Array.isArray(m.genre) ? m.genre : [m.genre];
      if (!gList.includes(genre)) return false;
    }

    if (language && language !== "ALL") {
      const langs = m.languagesAvailable || [m.language];
      if (!langs.includes(language) && m.language !== language) return false;
    }

    if (format && format !== "ALL") {
      const fList = m.formats || [];
      if (!fList.includes(format)) return false;
    }

    return true;
  });
}

export function getMovieById(id) {
  const movies = getMovies();
  return movies.find((m) => m.id === Number(id)) || null;
}

// Live Theatres API
export function getTheatres(city = null) {
  let theatres = getStored(KEYS.THEATRES, []);
  if (!Array.isArray(theatres) || theatres.length === 0) {
    theatres = INITIAL_THEATRES;
  }

  if (city) {
    const matched = theatres.filter((t) => t.city && t.city.toLowerCase() === city.toLowerCase());
    return matched.length > 0 ? matched : theatres;
  }
  return theatres;
}

// Live Screens API
export function getScreens() {
  const screens = getStored(KEYS.SCREENS, []);
  if (Array.isArray(screens) && screens.length > 0) return screens;
  return INITIAL_SCREENS;
}

// Live Shows API
export function getShows() {
  const current = getStored(KEYS.SHOWS, []);
  if (Array.isArray(current) && current.length > 0) return current;
  return INITIAL_SHOWS;
}

// Food & Concessions API
export function getFoodAndBeverages() {
  const concessions = getStored(KEYS.CONCESSIONS, []);
  if (Array.isArray(concessions) && concessions.length > 0) {
    return concessions.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      price: Number(c.price),
      isVeg: true,
      image: c.image_url || "https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=400&q=80",
      popular: c.category === "Combos" || c.category === "Popcorn",
    }));
  }
  return FOOD_AND_BEVERAGES;
}

// Promo Codes API
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

// Retrieve Shows for a given Movie, City, and Target Date
export function getShowsForMovie(movieId, city = null, targetDateStr = null) {
  const shows = getShows();
  const screens = getScreens();
  const theatres = getTheatres(city);

  const theatresMap = new Map(theatres.map((t) => [t.id, t]));
  const screensMap = new Map(screens.map((s) => [s.id, s]));

  let matchingShows = shows.filter((s) => {
    if (Number(s.movie_id) !== Number(movieId)) return false;
    const screen = screensMap.get(s.screen_id);
    if (!screen) return false;
    const theatre = theatresMap.get(screen.theatre_id);
    if (!theatre) return false;

    if (targetDateStr) {
      const showDateStr = String(s.start_time).split("T")[0];
      if (showDateStr !== targetDateStr) return false;
    }
    return true;
  });

  // If strict date check returned 0 matches, fallback to any shows for this movie in the city
  if (matchingShows.length === 0 && targetDateStr) {
    matchingShows = shows.filter((s) => {
      if (Number(s.movie_id) !== Number(movieId)) return false;
      const screen = screensMap.get(s.screen_id);
      if (!screen) return false;
      const theatre = theatresMap.get(screen.theatre_id);
      return Boolean(theatre);
    });
  }

  // Group shows by Theatre
  const grouped = [];
  for (const theatre of theatres) {
    const theatreShows = matchingShows
      .filter((s) => {
        const sc = screensMap.get(s.screen_id);
        return sc && sc.theatre_id === theatre.id;
      })
      .map((s) => ({
        ...s,
        price_regular: Number(s.price_regular || 220),
        price_premium: Number(s.price_premium || 340),
        price_recliner: Number(s.price_recliner || 500),
        screen: screensMap.get(s.screen_id),
      }))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    if (theatreShows.length > 0) {
      grouped.push({ theatre, shows: theatreShows });
    }
  }

  // If no scheduled slots exist in DB for this movie, generate slots for the screens so user can always view seat matrix
  if (grouped.length === 0 && theatres.length > 0) {
    const defaultSlots = [
      { h: 10, m: 30, sound: "Dolby Atmos", filling: "available" },
      { h: 14, m: 15, sound: "IMAX Laser", filling: "filling" },
      { h: 18, m: 45, sound: "Dolby 7.1", filling: "almost_full" },
      { h: 22, m: 15, sound: "Dolby Atmos", filling: "available" },
    ];
    let synthId = 9000 + Number(movieId) * 10;
    for (const theatre of theatres) {
      const theatreScreens = screens.filter((sc) => sc.theatre_id === theatre.id);
      if (theatreScreens.length === 0) continue;
      const targetScreen = theatreScreens[0];

      const synthShows = defaultSlots.map((slot) => {
        let startTime;
        if (targetDateStr) {
          const [y, m, d] = targetDateStr.split("-").map(Number);
          startTime = new Date(y, m - 1, d, slot.h, slot.m, 0, 0).toISOString();
        } else {
          const now = new Date();
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.h, slot.m, 0, 0).toISOString();
        }
        return {
          id: synthId++,
          movie_id: Number(movieId),
          screen_id: targetScreen.id,
          screen: targetScreen,
          start_time: startTime,
          price_regular: 250,
          price_premium: 380,
          price_recliner: 550,
          sound_format: slot.sound,
          filling_status: slot.filling,
        };
      });

      grouped.push({ theatre, shows: synthShows });
    }
  }

  return grouped;
}

// Single show details
export function getShowDetails(showId) {
  const shows = getShows();
  const movies = getMovies();
  const screens = getScreens();
  const theatres = getTheatres();

  let show = shows.find((s) => s.id === Number(showId));
  if (!show && Number(showId) >= 9000) {
    const screen = screens[0] || INITIAL_SCREENS[0];
    show = {
      id: Number(showId),
      movie_id: Math.floor((Number(showId) - 9000) / 10) || 1,
      screen_id: screen.id,
      start_time: new Date().toISOString(),
      price_regular: 250,
      price_premium: 380,
      price_recliner: 550,
      sound_format: "Dolby Atmos",
      filling_status: "available",
    };
  }
  if (!show) return null;

  const movie = movies.find((m) => m.id === show.movie_id) || INITIAL_MOVIES[0];
  const screen = screens.find((sc) => sc.id === show.screen_id) || INITIAL_SCREENS[0];
  const theatre = screen ? (theatres.find((t) => t.id === screen.theatre_id) || INITIAL_THEATRES[0]) : null;

  return {
    show: {
      ...show,
      price_regular: Number(show.price_regular || 220),
      price_premium: Number(show.price_premium || 340),
      price_recliner: Number(show.price_recliner || 500),
    },
    movie,
    screen,
    theatre,
  };
}

// Generates the physical seats structure for an auditorium screen
export function generatePhysicalSeats(screen) {
  if (!screen) return [];
  const rows = [];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let letterIndex = 0;

  const regularRows = screen.regular_rows || 4;
  const premiumRows = screen.premium_rows || 3;
  const reclinerRows = screen.recliner_rows || 2;
  const seatsPerRow = screen.seats_per_row || 10;

  // Recliner (Back rows)
  for (let r = 0; r < reclinerRows; r++) {
    const label = letters[letterIndex++];
    const seats = [];
    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({
        id: `${screen.id}-${label}-${s}`,
        row: label,
        number: s,
        tier: "recliner",
      });
    }
    rows.push({ row: label, tier: "recliner", seats });
  }

  // Premium (Middle rows)
  for (let r = 0; r < premiumRows; r++) {
    const label = letters[letterIndex++];
    const seats = [];
    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({
        id: `${screen.id}-${label}-${s}`,
        row: label,
        number: s,
        tier: "premium",
      });
    }
    rows.push({ row: label, tier: "premium", seats });
  }

  // Regular (Front rows)
  for (let r = 0; r < regularRows; r++) {
    const label = letters[letterIndex++];
    const seats = [];
    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({
        id: `${screen.id}-${label}-${s}`,
        row: label,
        number: s,
        tier: "regular",
      });
    }
    rows.push({ row: label, tier: "regular", seats });
  }

  return rows;
}

// Clean up expired locks
export function cleanupExpiredLocks() {
  const showSeats = getStored(KEYS.SHOW_SEATS, []);
  const now = new Date().toISOString();

  let seatsChanged = false;
  const cleaned = showSeats.filter((s) => {
    if (s.status === "LOCKED" && s.lock_expires_at && s.lock_expires_at <= now) {
      seatsChanged = true;
      return false;
    }
    return true;
  });

  if (seatsChanged) {
    setStored(KEYS.SHOW_SEATS, cleaned);
  }

  const bookings = getStored(KEYS.BOOKINGS, []);
  let bookingsChanged = false;
  const updatedBookings = bookings.map((b) => {
    if (b.status === "PENDING" && b.lock_expires_at && b.lock_expires_at <= now) {
      bookingsChanged = true;
      return { ...b, status: "EXPIRED", expired_at: now };
    }
    return b;
  });

  if (bookingsChanged) {
    setStored(KEYS.BOOKINGS, updatedBookings);
  }

  return { seatsChanged, bookingsChanged };
}

// Seat Matrix live state
export function getShowSeatsState(showId, userId = null) {
  cleanupExpiredLocks();
  const activeUserId = userId || _sessionUser?.id || 1;

  const showDetails = getShowDetails(showId);
  if (!showDetails || !showDetails.screen) {
    return { rows: [], allSeats: [], pricing: {} };
  }

  const { screen, show } = showDetails;
  const rows = generatePhysicalSeats(screen);
  const showSeats = getStored(KEYS.SHOW_SEATS, []);
  const thisShowSeats = showSeats.filter((s) => s.show_id === Number(showId));

  const seatsStatusMap = new Map();
  thisShowSeats.forEach((s) => {
    seatsStatusMap.set(s.seat_id, s);
  });

  const allSeats = [];
  const processedRows = rows.map((r) => {
    const processedSeats = r.seats.map((seat) => {
      const match = seatsStatusMap.get(seat.id);
      let status = "available";
      let isMyLock = false;

      if (match) {
        if (match.status === "BOOKED") {
          status = "booked";
        } else if (match.status === "LOCKED") {
          if (match.locked_by === activeUserId) {
            status = "my_locked";
            isMyLock = true;
          } else {
            status = "locked_other";
          }
        }
      }

      let price = show.price_regular;
      if (seat.tier === "premium") price = show.price_premium;
      if (seat.tier === "recliner") price = show.price_recliner;

      const fullSeat = {
        ...seat,
        status,
        price,
        isMyLock,
        lockExpiresAt: match?.lock_expires_at || null,
      };

      allSeats.push(fullSeat);
      return fullSeat;
    });

    return { ...r, seats: processedSeats };
  });

  return {
    rows: processedRows,
    allSeats,
    pricing: {
      regular: show.price_regular,
      premium: show.price_premium,
      recliner: show.price_recliner,
    },
  };
}

// Lock seat
export function lockSeat(showId, seatId, userId = null) {
  cleanupExpiredLocks();
  const activeUserId = userId || _sessionUser?.id || 1;
  const showSeats = getStored(KEYS.SHOW_SEATS, []);
  const numShowId = Number(showId);

  const existing = showSeats.find(
    (s) => s.show_id === numShowId && s.seat_id === seatId
  );

  const myExistingLocks = showSeats.filter(
    (s) =>
      s.show_id === numShowId &&
      s.locked_by === activeUserId &&
      s.status === "LOCKED" &&
      s.lock_expires_at &&
      new Date(s.lock_expires_at).getTime() > Date.now()
  );

  const now = new Date();
  const expiresAt =
    myExistingLocks.length > 0 && myExistingLocks[0].lock_expires_at
      ? myExistingLocks[0].lock_expires_at
      : new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  if (existing) {
    if (existing.status === "BOOKED") {
      throw new Error("This seat is already booked.");
    }
    if (existing.status === "LOCKED" && existing.locked_by !== activeUserId) {
      throw new Error("This seat is currently held by another user.");
    }

    const updated = showSeats.map((s) =>
      s.show_id === numShowId && s.seat_id === seatId
        ? { ...s, status: "LOCKED", locked_by: activeUserId, lock_expires_at: expiresAt }
        : s
    );
    setStored(KEYS.SHOW_SEATS, updated);
  } else {
    showSeats.push({
      show_id: numShowId,
      seat_id: seatId,
      status: "LOCKED",
      locked_by: activeUserId,
      lock_expires_at: expiresAt,
    });
    setStored(KEYS.SHOW_SEATS, showSeats);
  }

  return { success: true, expiresAt };
}

// Unlock seat
export function unlockSeat(showId, seatId, userId = null) {
  const activeUserId = userId || _sessionUser?.id || 1;
  const showSeats = getStored(KEYS.SHOW_SEATS, []);
  const numShowId = Number(showId);

  const updated = showSeats.filter(
    (s) =>
      !(
        s.show_id === numShowId &&
        s.seat_id === seatId &&
        s.locked_by === activeUserId
      )
  );

  setStored(KEYS.SHOW_SEATS, updated);
  return { success: true };
}

// Unlock all my seats
export function unlockAllMySeats(showId, userId = null) {
  const activeUserId = userId || _sessionUser?.id || 1;
  const showSeats = getStored(KEYS.SHOW_SEATS, []);
  const numShowId = Number(showId);

  const updated = showSeats.filter(
    (s) =>
      !(
        s.show_id === numShowId &&
        s.locked_by === activeUserId &&
        s.status === "LOCKED"
      )
  );

  setStored(KEYS.SHOW_SEATS, updated);
  return { success: true };
}

// Create Pending Booking (Calls POST /api/bookings with fallback)
export async function createPendingBooking(
  showId,
  seatIds,
  fnbItems = [],
  promoCode = null,
  userId = null,
  preferredLockExpiresAt = null
) {
  if (!seatIds || seatIds.length === 0) {
    throw new Error("Please select at least one seat to proceed.");
  }

  const activeUserId = userId || _sessionUser?.id || 1;
  const showDetails = getShowDetails(showId);
  if (!showDetails) throw new Error("Showtime not found.");

  const { show, movie, theatre, screen } = showDetails;

  // Calculate pricing breakdown
  const physicalSeats = generatePhysicalSeats(screen).flatMap((r) => r.seats);
  const seatsMap = new Map(physicalSeats.map((s) => [s.id, s]));

  let seatsSubtotal = 0;
  const seatsSummary = [];

  for (const sId of seatIds) {
    const seat = seatsMap.get(sId);
    let price = show.price_regular;
    if (seat?.tier === "premium") price = show.price_premium;
    if (seat?.tier === "recliner") price = show.price_recliner;

    seatsSubtotal += price;
    seatsSummary.push({
      seatId: sId,
      row: seat?.row || "A",
      number: seat?.number || 1,
      tier: seat?.tier || "regular",
      price,
    });
  }

  let fnbSubtotal = 0;
  if (Array.isArray(fnbItems)) {
    fnbSubtotal = fnbItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  const convenienceFee = Math.round(seatsSubtotal * 0.08);
  const grossTotal = seatsSubtotal + fnbSubtotal + convenienceFee;

  let discount = 0;
  let appliedPromo = null;
  if (promoCode) {
    const promoRes = applyPromoCode(promoCode, seatsSubtotal);
    if (promoRes.valid) {
      discount = promoRes.discount;
      appliedPromo = promoRes.code;
    }
  }

  const totalAmount = Math.max(0, grossTotal - discount);
  const lockExpiresAt = preferredLockExpiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Try calling live backend POST /api/bookings
  let apiBooking = null;
  try {
    const numericSeatIds = seatIds.map((s) => {
      const parts = String(s).split("-");
      return Number(parts[parts.length - 1]) || 1;
    });
    const res = await bookingsApi.create({
      show_id: Number(showId),
      seat_ids: numericSeatIds,
      showId: Number(showId),
      seatIds: numericSeatIds,
    });
    if (res?.booking) {
      apiBooking = res.booking;
    }
  } catch (err) {
    console.warn("Backend booking API not ready, creating client pending reservation:", err.message);
  }

  const bookings = getStored(KEYS.BOOKINGS, []);
  const bookingId = apiBooking?.id || (bookings.length > 0 ? Math.max(...bookings.map((b) => b.id || 0)) + 1 : 1001);

  const pendingBooking = {
    id: bookingId,
    user_id: activeUserId,
    show_id: Number(showId),
    status: "PENDING",
    subtotal: seatsSubtotal,
    fnb_subtotal: fnbSubtotal,
    fnb_items: fnbItems,
    convenience_fee: convenienceFee,
    discount,
    applied_promo: appliedPromo,
    total_amount: totalAmount,
    seat_ids: seatIds,
    seats_summary: seatsSummary,
    movie_title: movie.title,
    movie_poster: movie.poster_url,
    movie_rating: movie.rating,
    movie_certificate: movie.certificate,
    movie_language: movie.language,
    theatre_name: theatre?.name || "CineShow Cinema",
    theatre_city: theatre?.city || getSelectedCity(),
    theatre_address: theatre?.address || "",
    screen_name: screen.name,
    screen_format: screen.format,
    show_time: show.start_time,
    ticket_code: apiBooking?.ticket_code || null,
    lock_expires_at: lockExpiresAt,
    created_at: new Date().toISOString(),
  };

  setStored(KEYS.BOOKINGS, [pendingBooking, ...bookings.filter(b => b.id !== bookingId)]);
  return pendingBooking;
}

export function expirePendingBooking(bookingId) {
  const bookings = getStored(KEYS.BOOKINGS, []);
  const booking = bookings.find((b) => b.id === Number(bookingId));

  if (!booking) return { success: false };

  unlockAllMySeats(booking.show_id, booking.user_id);

  const updatedBookings = bookings.map((b) =>
    b.id === Number(bookingId)
      ? { ...b, status: "EXPIRED", expired_at: new Date().toISOString() }
      : b
  );
  setStored(KEYS.BOOKINGS, updatedBookings);

  return { success: true };
}

function generateTicketCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BMS-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += "-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// Confirm Booking & Process Payment (Calls POST /api/payments)
export async function confirmBookingAndPay(bookingId, paymentMethod = "Credit Card") {
  cleanupExpiredLocks();

  const bookings = getStored(KEYS.BOOKINGS, []);
  const booking = bookings.find((b) => b.id === Number(bookingId));

  if (!booking) throw new Error("Booking not found.");
  if (booking.status === "CONFIRMED") return booking;

  // Call live POST /api/payments on backend
  let paymentResponse = null;
  try {
    paymentResponse = await paymentsApi.create({
      booking_id: Number(bookingId),
    });
  } catch (err) {
    console.warn("Backend payment API call warning:", err.message);
  }

  const ticketCode = paymentResponse?.ticket_code || booking.ticket_code || generateTicketCode();
  const confirmedBooking = {
    ...booking,
    status: "CONFIRMED",
    ticket_code: ticketCode,
    payment_method: paymentMethod,
    confirmed_at: new Date().toISOString(),
    email_dispatched: Boolean(paymentResponse?.ticket_email),
  };

  const updatedBookings = bookings.map((b) =>
    b.id === Number(bookingId) ? confirmedBooking : b
  );
  setStored(KEYS.BOOKINGS, updatedBookings);

  // Mark seats as booked
  const showSeats = getStored(KEYS.SHOW_SEATS, []);
  const updatedShowSeats = showSeats.map((ss) => {
    if (ss.show_id === booking.show_id && booking.seat_ids?.includes(ss.seat_id)) {
      return {
        ...ss,
        status: "BOOKED",
        booking_id: booking.id,
        lock_expires_at: null,
      };
    }
    return ss;
  });
  setStored(KEYS.SHOW_SEATS, updatedShowSeats);

  return confirmedBooking;
}

// Cancel Booking (Calls PATCH /api/bookings/:id/cancel)
export async function cancelBooking(bookingId) {
  try {
    await bookingsApi.cancel(bookingId);
  } catch (err) {
    console.warn("Backend cancel API warning:", err.message);
  }

  const bookings = getStored(KEYS.BOOKINGS, []);
  const booking = bookings.find((b) => b.id === Number(bookingId));

  if (!booking) throw new Error("Booking not found.");

  const updatedBookings = bookings.map((b) =>
    b.id === Number(bookingId)
      ? { ...b, status: "CANCELLED", cancelled_at: new Date().toISOString() }
      : b
  );
  setStored(KEYS.BOOKINGS, updatedBookings);

  const showSeats = getStored(KEYS.SHOW_SEATS, []);
  const updatedShowSeats = showSeats.filter(
    (ss) => !(ss.show_id === booking.show_id && booking.seat_ids?.includes(ss.seat_id))
  );
  setStored(KEYS.SHOW_SEATS, updatedShowSeats);

  return { success: true };
}

// Get Bookings for Current User (Calls GET /api/bookings/my)
export async function getMyBookings(userId = null) {
  const activeUserId = userId || _sessionUser?.id || 1;

  try {
    const apiBookings = await bookingsApi.getMyBookings();
    if (Array.isArray(apiBookings)) {
      setStored(KEYS.BOOKINGS, apiBookings);
      return apiBookings;
    }
  } catch {
    // Fall back to local store
  }

  const bookings = getStored(KEYS.BOOKINGS, []);
  return bookings
    .filter((b) => !b.user_id || b.user_id === activeUserId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

// Synchronous getter for immediate render from cache
export function getCachedBookings(userId = null) {
  const activeUserId = userId || _sessionUser?.id || 1;
  const bookings = getStored(KEYS.BOOKINGS, []);
  return bookings
    .filter((b) => !b.user_id || b.user_id === activeUserId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}
