/**
 * Centralized API Service for CineShow Client
 * Connects frontend directly to backend Express APIs with cookie-based JWT sessions.
 */

import { API_BASE_URL } from "../config/apiConfig";

const BASE_URL = API_BASE_URL;

async function request(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${BASE_URL}${normalizedPath}`;
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("cine_auth_token") : null;
  const config = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "fetch",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  };

  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const contentType = res.headers.get("content-type") || "";

  let data = null;
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const errorMsg = (data && (data.error || data.message)) || `HTTP ${res.status}: ${res.statusText}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};

// Domain-specific endpoints
export const moviesApi = {
  getAll: async () => {
    try {
      return await api.get("/api/movies");
    } catch {
      return await api.get("/movies");
    }
  },
  getById: (id) => api.get(`/api/movies/${id}`).catch(() => api.get(`/movies/${id}`)),
};

export const theatresApi = {
  getAll: async () => {
    try {
      return await api.get("/api/theatres");
    } catch {
      return await api.get("/theatres");
    }
  },
  getById: (id) => api.get(`/api/theatres/${id}`).catch(() => api.get(`/theatres/${id}`)),
};

export const screensApi = {
  getAll: async () => {
    try {
      return await api.get("/api/screens");
    } catch {
      return await api.get("/screens");
    }
  },
  getById: (id) => api.get(`/api/screens/${id}`).catch(() => api.get(`/screens/${id}`)),
  getSeats: (screenId) => api.get(`/api/screens/${screenId}/seats`).catch(() => api.get(`/screens/${screenId}/seats`)),
};

export const showsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.movie_id) query.append("movie_id", params.movie_id);
    if (params.screen_id) query.append("screen_id", params.screen_id);
    if (params.date) query.append("date", params.date);
    const qs = query.toString();
    return api.get(`/api/shows${qs ? `?${qs}` : ""}`);
  },
  getById: (id) => api.get(`/api/shows/${id}`),
};

export const concessionsApi = {
  getAll: (category) => {
    const qs = category && category !== "ALL" ? `?category=${encodeURIComponent(category)}` : "";
    return api.get(`/api/concessions${qs}`).catch(() => api.get(`/concessions${qs}`));
  },
};

export const bookingsApi = {
  create: (data) => api.post("/api/bookings", data),
  getMyBookings: () => api.get("/api/bookings/my"),
  getById: (id) => api.get(`/api/bookings/${id}`),
  cancel: (id) => api.patch(`/api/bookings/${id}/cancel`),
};

export const paymentsApi = {
  create: (data) => api.post("/api/payments", data),
  getByBooking: (bookingId) => api.get(`/api/payments/booking/${bookingId}`),
};

export default api;
