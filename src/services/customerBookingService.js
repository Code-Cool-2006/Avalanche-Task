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

// Ensure default pre-seeded data
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

// Movies with BookMyShow filters (query, genre, language, format, status)
export function getMovies(filters = {}) {
  const movies = getStored(KEYS.MOVIES, INITIAL_MOVIES);
  const { query, genre, language, format, status } = filters;

  return movies.filter((m) => {
    // Search query filter
    if (query) {
      const q = query.toLowerCase().trim();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchGenre = m.genre?.some((g) => g.toLowerCase().includes(q));
      const matchDirector = m.director?.toLowerCase().includes(q);
      const matchCast = m.cast?.some((c) => c.name.toLowerCase().includes(q));
      if (!matchTitle && !matchGenre && !matchDirector && !matchCast) return false;
    }

    // Status filter (NOW_SHOWING vs COMING_SOON)
    if (status && status !== "ALL") {
      if (m.status !== status) return false;
    }

    // Genre filter
    if (genre && genre !== "ALL") {
      if (!m.genre?.includes(genre)) return false;
    }

    // Language filter
    if (language && language !== "ALL") {
      const langs = m.languagesAvailable || [m.language];
      if (!langs.includes(language) && m.language !== language) return false;
    }

    // Format filter
    if (format && format !== "ALL") {
      if (!m.formats?.includes(format)) return false;
    }

    return true;
  });
}

export function getMovieById(id) {
  const movies = getStored(KEYS.MOVIES, INITIAL_MOVIES);
  return movies.find((m) => m.id === Number(id)) || null;
}

// Theatres & Screens
export function getTheatres(city = null) {
  const theatres = getStored(KEYS.THEATRES, INITIAL_THEATRES);
  if (city) {
    return theatres.filter((t) => t.city.toLowerCase() === city.toLowerCase());
  }
  return theatres;
}

export function getScreens() {
  return getStored(KEYS.SCREENS, INITIAL_SCREENS);
}

export function getShows() {
  return getStored(KEYS.SHOWS, INITIAL_SHOWS);
}

// Food & Beverages and Promo Codes
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

// Retrieve Shows for a given Movie, City, and Target Date
export function getShowsForMovie(movieId, city = null, targetDateStr = null) {
  const shows = getStored(KEYS.SHOWS, INITIAL_SHOWS);
  const screens = getStored(KEYS.SCREENS, INITIAL_SCREENS);
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
        screen: screensMap.get(s.screen_id),
      }))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    if (theatreShows.length > 0) {
      grouped.push({
        theatre,
        shows: theatreShows,
      });
    }
  }

  return grouped;
}

// Details for a single show
export function getShowDetails(showId) {
  const shows = getStored(KEYS.SHOWS, INITIAL_SHOWS);
  const movies = getStored(KEYS.MOVIES, INITIAL_MOVIES);
  const screens = getStored(KEYS.SCREENS, INITIAL_SCREENS);
  const theatres = getStored(KEYS.THEATRES, INITIAL_THEATRES);

  const show = shows.find((s) => s.id === Number(showId));
  if (!show) return null;

  const movie = movies.find((m) => m.id === show.movie_id);
  const screen = screens.find((sc) => sc.id === show.screen_id);
  const theatre = screen ? theatres.find((t) => t.id === screen.theatre_id) : null;

  return { show, movie, screen, theatre };
}

// Generates the physical seats structure for a screen
export function generatePhysicalSeats(screen) {
  if (!screen) return [];
  const rows = [];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let letterIndex = 0;

  // Recliner (Back rows)
  for (let r = 0; r < (screen.recliner_rows || 0); r++) {
    const label = letters[letterIndex++];
    const seats = [];
    for (let s = 1; s <= (screen.seats_per_row || 10); s++) {
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
  for (let r = 0; r < (screen.premium_rows || 0); r++) {
    const label = letters[letterIndex++];
    const seats = [];
    for (let s = 1; s <= (screen.seats_per_row || 10); s++) {
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
  for (let r = 0; r < (screen.regular_rows || 0); r++) {
    const label = letters[letterIndex++];
    const seats = [];
    for (let s = 1; s <= (screen.seats_per_row || 10); s++) {
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

// Clean up expired seat locks (> 5 mins)
export function cleanupExpiredLocks() {
  const showSeats = getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
  const now = new Date().toISOString();

  const cleaned = showSeats.map((s) => {
    if (s.status === "LOCKED" && s.lock_expires_at && s.lock_expires_at < now) {
      return { ...s, status: "AVAILABLE", locked_by: null, lock_expires_at: null };
    }
    return s;
  });

  setStored(KEYS.SHOW_SEATS, cleaned);
}

// Get live seat layout status for a specific show
export function getShowSeatsState(showId, userId = CURRENT_USER.id) {
  cleanupExpiredLocks();

  const showDetails = getShowDetails(showId);
  if (!showDetails || !showDetails.screen) {
    return { rows: [], allSeats: [], pricing: {} };
  }

  const { screen, show } = showDetails;
  const rows = generatePhysicalSeats(screen);
  const showSeats = getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
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
          if (match.locked_by === userId) {
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

    return {
      ...r,
      seats: processedSeats,
    };
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

// Lock a seat for 5 minutes
export function lockSeat(showId, seatId, userId = CURRENT_USER.id) {
  cleanupExpiredLocks();
  const showSeats = getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
  const numShowId = Number(showId);

  const existing = showSeats.find(
    (s) => s.show_id === numShowId && s.seat_id === seatId
  );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  if (existing) {
    if (existing.status === "BOOKED") {
      throw new Error("This seat is already booked.");
    }
    if (existing.status === "LOCKED" && existing.locked_by !== userId) {
      throw new Error("This seat is currently held by another user.");
    }

    const updated = showSeats.map((s) =>
      s.show_id === numShowId && s.seat_id === seatId
        ? { ...s, status: "LOCKED", locked_by: userId, lock_expires_at: expiresAt }
        : s
    );
    setStored(KEYS.SHOW_SEATS, updated);
  } else {
    showSeats.push({
      show_id: numShowId,
      seat_id: seatId,
      status: "LOCKED",
      locked_by: userId,
      lock_expires_at: expiresAt,
    });
    setStored(KEYS.SHOW_SEATS, showSeats);
  }

  return { success: true, expiresAt };
}

// Unlock a seat
export function unlockSeat(showId, seatId, userId = CURRENT_USER.id) {
  const showSeats = getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
  const numShowId = Number(showId);

  const updated = showSeats.filter(
    (s) =>
      !(
        s.show_id === numShowId &&
        s.seat_id === seatId &&
        s.locked_by === userId
      )
  );

  setStored(KEYS.SHOW_SEATS, updated);
  return { success: true };
}

// Unlock all seats currently locked by user for this show
export function unlockAllMySeats(showId, userId = CURRENT_USER.id) {
  const showSeats = getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
  const numShowId = Number(showId);

  const updated = showSeats.filter(
    (s) =>
      !(
        s.show_id === numShowId &&
        s.locked_by === userId &&
        s.status === "LOCKED"
      )
  );

  setStored(KEYS.SHOW_SEATS, updated);
  return { success: true };
}

// Create Pending Booking from locked seats with optional F&B items & Promo Code
export function createPendingBooking(
  showId,
  seatIds,
  fnbItems = [],
  promoCode = null,
  userId = CURRENT_USER.id
) {
  if (!seatIds || seatIds.length === 0) {
    throw new Error("Please select at least one seat to proceed.");
  }

  cleanupExpiredLocks();
  const showDetails = getShowDetails(showId);
  if (!showDetails) throw new Error("Showtime not found.");

  const { show, movie, theatre, screen } = showDetails;
  const showSeats = getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
  const numShowId = Number(showId);

  // Validate all requested seats are locked by this user
  for (const sId of seatIds) {
    const lock = showSeats.find(
      (ss) =>
        ss.show_id === numShowId &&
        ss.seat_id === sId &&
        ss.status === "LOCKED" &&
        ss.locked_by === userId
    );
    if (!lock) {
      throw new Error(`Seat lock expired or unavailable for ${sId}. Please select again.`);
    }
  }

  // Calculate ticket pricing breakdown
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

  // Food & Beverages Calculation
  let fnbSubtotal = 0;
  if (Array.isArray(fnbItems)) {
    fnbSubtotal = fnbItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  // Convenience Fee (8% of ticket subtotal)
  const convenienceFee = Math.round(seatsSubtotal * 0.08);

  // Gross Total before promo
  const grossTotal = seatsSubtotal + fnbSubtotal + convenienceFee;

  // Apply Promo Code if available
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

  const bookings = getStored(KEYS.BOOKINGS, []);
  const bookingId = bookings.length > 0 ? Math.max(...bookings.map((b) => b.id)) + 1 : 1001;

  const pendingBooking = {
    id: bookingId,
    user_id: userId,
    show_id: numShowId,
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
    theatre_name: theatre.name,
    theatre_city: theatre.city,
    theatre_address: theatre.address,
    screen_name: screen.name,
    screen_format: screen.format,
    show_time: show.start_time,
    ticket_code: null,
    created_at: new Date().toISOString(),
  };

  setStored(KEYS.BOOKINGS, [pendingBooking, ...bookings]);
  return pendingBooking;
}

// Generate unique ticket code
function generateTicketCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BMS-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += "-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// Mock Payment & Booking Confirmation
export function confirmBookingAndPay(bookingId, paymentMethod = "Credit Card") {
  const bookings = getStored(KEYS.BOOKINGS, []);
  const booking = bookings.find((b) => b.id === Number(bookingId));

  if (!booking) throw new Error("Booking not found.");
  if (booking.status === "CONFIRMED") return booking;

  // Confirm booking
  const ticketCode = generateTicketCode();
  const confirmedBooking = {
    ...booking,
    status: "CONFIRMED",
    ticket_code: ticketCode,
    payment_method: paymentMethod,
    confirmed_at: new Date().toISOString(),
  };

  const updatedBookings = bookings.map((b) =>
    b.id === Number(bookingId) ? confirmedBooking : b
  );
  setStored(KEYS.BOOKINGS, updatedBookings);

  // Mark show_seats permanently BOOKED
  const showSeats = getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
  const updatedShowSeats = showSeats.map((ss) => {
    if (ss.show_id === booking.show_id && booking.seat_ids.includes(ss.seat_id)) {
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

// Cancel Booking (releases seats)
export function cancelBooking(bookingId) {
  const bookings = getStored(KEYS.BOOKINGS, []);
  const booking = bookings.find((b) => b.id === Number(bookingId));

  if (!booking) throw new Error("Booking not found.");
  if (booking.status === "CANCELLED") return booking;

  // Update status to CANCELLED
  const updatedBookings = bookings.map((b) =>
    b.id === Number(bookingId)
      ? { ...b, status: "CANCELLED", cancelled_at: new Date().toISOString() }
      : b
  );
  setStored(KEYS.BOOKINGS, updatedBookings);

  // Free seats
  const showSeats = getStored(KEYS.SHOW_SEATS, INITIAL_SHOW_SEATS);
  const updatedShowSeats = showSeats.filter(
    (ss) => !(ss.show_id === booking.show_id && booking.seat_ids.includes(ss.seat_id))
  );
  setStored(KEYS.SHOW_SEATS, updatedShowSeats);

  return { success: true };
}

// Get Bookings for Current User
export function getMyBookings(userId = CURRENT_USER.id) {
  const bookings = getStored(KEYS.BOOKINGS, []);
  return bookings
    .filter((b) => b.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
