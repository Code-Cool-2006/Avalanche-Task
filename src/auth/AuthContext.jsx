import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** fetch wrapper: same-origin cookies, CSRF header, one silent refresh on 401. */
async function call(path, body, retry = true) {
  const res = await fetch(`/api/auth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && retry && !["login", "refresh", "logout"].includes(path)) {
    if ((await fetch("/api/auth/refresh", { method: "POST", headers: { "X-Requested-With": "fetch" } })).ok)
      return call(path, body, false);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), data);
  return data;
}

const Ctx = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    call("me").then((d) => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await call("logout", {}).catch(() => {});
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
