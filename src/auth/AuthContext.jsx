import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/apiConfig";

/** fetch wrapper: cross-origin cookies + Bearer token header, CSRF header. */
async function call(path, body, retry = true) {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("cine_auth_token") : null;
  const res = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "fetch",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && retry && !["login", "refresh", "logout", "me"].includes(path)) {
    const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Requested-With": "fetch" },
    }).catch(() => null);
    if (refreshRes && refreshRes.ok) return call(path, body, false);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || data.message || "Request failed"), data);
  if (data?.token && typeof localStorage !== "undefined") {
    localStorage.setItem("cine_auth_token", data.token);
  }
  return data;
}

const Ctx = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    call("me")
      .then((d) => setUser(d.user))
      .catch(() => {
        // Clear token if invalid
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem("cine_auth_token");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await call("logout", {}).catch(() => {});
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("cine_auth_token");
    }
    setUser(null);
  }, []);

  const api = useMemo(
    () => ({
      user,
      loading,
      logout,
      call,
      setUser,
    }),
    [user, loading, logout]
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
