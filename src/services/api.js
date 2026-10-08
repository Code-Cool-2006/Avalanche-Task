/**
 * Centralized API service layer for backend communication.
 * Manages base URL, headers (CSRF defense, Content-Type), credentials, and standard error handling.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Custom API Error class containing HTTP status and server error payload
 */
export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Universal request wrapper for all API endpoints
 */
export async function request(endpoint, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    retryOnUnauthorized = true,
    ...rest
  } = options;

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
    "X-Requested-With": "fetch", // Required by backend CSRF defense
    ...headers,
  };

  const config = {
    method,
    headers: defaultHeaders,
    credentials: "include", // Send SameSite cookies across same-origin/proxy
    ...rest,
  };

  if (body !== undefined) {
    config.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    // If 401 and silent refresh is applicable
    if (
      response.status === 401 &&
      retryOnUnauthorized &&
      !endpoint.includes("/auth/login") &&
      !endpoint.includes("/auth/refresh") &&
      !endpoint.includes("/auth/logout")
    ) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "X-Requested-With": "fetch" },
          credentials: "include",
        });

        if (refreshRes.ok) {
          return await request(endpoint, {
            ...options,
            retryOnUnauthorized: false,
          });
        }
      } catch {
        // Refresh failed; proceed to throw original 401
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data.error || data.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || "Network error. Please check your connection.", 0);
  }
}

// ==========================================
// 1. AUTHENTICATION APIS
// ==========================================
export const authApi = {
  register: (userData) => request("/auth/register", { method: "POST", body: userData }),
  verifyOtp: (payload) => request("/auth/verify-otp", { method: "POST", body: payload }),
  resendOtp: (payload) => request("/auth/resend-otp", { method: "POST", body: payload }),
  login: (credentials) => request("/auth/login", { method: "POST", body: credentials }),
  refresh: () => request("/auth/refresh", { method: "POST" }),
  logout: () => request("/auth/logout", { method: "POST" }),
  forgotPassword: (payload) => request("/auth/forgot", { method: "POST", body: payload }),
  resetPassword: (payload) => request("/auth/reset", { method: "POST", body: payload }),
  getMe: () => request("/auth/me", { method: "GET" }),
};

// ==========================================
// 2. MOVIES APIS
// ==========================================
export const moviesApi = {
  getAll: () => request("/movies", { method: "GET" }),
  getById: (id) => request(`/movies/${id}`, { method: "GET" }),
  create: (movieData) => request("/movies/create", { method: "POST", body: movieData }),
  update: (id, movieData) => request(`/movies/update/${id}`, { method: "PUT", body: movieData }),
  delete: (id) => request(`/movies/delete/${id}`, { method: "DELETE" }),
};

// ==========================================
// 3. THEATRES APIS
// ==========================================
export const theatresApi = {
  getAll: () => request("/theatres", { method: "GET" }),
  getById: (id) => request(`/theatres/${id}`, { method: "GET" }),
  create: (theatreData) => request("/theatres/create", { method: "POST", body: theatreData }),
  update: (id, theatreData) => request(`/theatres/update/${id}`, { method: "PUT", body: theatreData }),
  delete: (id) => request(`/theatres/delete/${id}`, { method: "DELETE" }),
};

// ==========================================
// 4. SCREENS APIS
// ==========================================
export const screensApi = {
  getAll: () => request("/screens", { method: "GET" }),
  getById: (id) => request(`/screens/${id}`, { method: "GET" }),
  create: (screenData) => request("/screens/create", { method: "POST", body: screenData }),
  update: (id, screenData) => request(`/screens/update/${id}`, { method: "PUT", body: screenData }),
  delete: (id) => request(`/screens/delete/${id}`, { method: "DELETE" }),
};

// ==========================================
// 5. SEATS APIS
// ==========================================
export const seatsApi = {
  getByScreen: (screenId) => request(`/screens/${screenId}/seats`, { method: "GET" }),
  createForScreen: (screenId, seatData) => request(`/screens/${screenId}/seats/create`, { method: "POST", body: seatData }),
  update: (id, seatData) => request(`/seats/update/${id}`, { method: "PUT", body: seatData }),
  delete: (id) => request(`/seats/delete/${id}`, { method: "DELETE" }),
};

// ==========================================
// 6. SHOWS APIS
// ==========================================
export const showsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.movieId) query.append("movieId", params.movieId);
    if (params.city) query.append("city", params.city);
    if (params.date) query.append("date", params.date);
    if (params.theatreId) query.append("theatreId", params.theatreId);
    if (params.screenId) query.append("screenId", params.screenId);
    const qs = query.toString();
    return request(`/shows${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  getById: (id) => request(`/shows/${id}`, { method: "GET" }),
  getSeatsByShow: (showId) => request(`/shows/${showId}/seats`, { method: "GET" }),
};

// ==========================================
// 7. BOOKINGS APIS
// ==========================================
export const bookingsApi = {
  reserve: (payload) => request("/bookings/reserve", { method: "POST", body: payload }),
  confirm: (id, payload) => request(`/bookings/${id}/confirm`, { method: "POST", body: payload }),
  cancel: (id) => request(`/bookings/${id}/cancel`, { method: "POST" }),
  getMyBookings: () => request("/bookings/my-bookings", { method: "GET" }),
};

// ==========================================
// 8. CONCESSIONS APIS
// ==========================================
export const concessionsApi = {
  getAll: (category) => request(`/concessions${category && category !== "ALL" ? `?category=${category}` : ""}`, { method: "GET" }),
};

// ==========================================
// 9. PAYMENTS APIS
// ==========================================
export const paymentsApi = {
  process: (payload) => request("/payments/process", { method: "POST", body: payload }),
};

export default {
  request,
  auth: authApi,
  movies: moviesApi,
  theatres: theatresApi,
  screens: screensApi,
  seats: seatsApi,
  shows: showsApi,
  bookings: bookingsApi,
  concessions: concessionsApi,
  payments: paymentsApi,
};
