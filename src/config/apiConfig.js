/**
 * API Configuration for CineShow Web Application
 * Configured with live Render backend: https://avalanche-task.onrender.com
 */

export const BACKEND_URL = (
  import.meta.env.VITE_API_URL || "https://avalanche-task.onrender.com"
).replace(/\/+$/, "");

export const API_BASE_URL = BACKEND_URL;
