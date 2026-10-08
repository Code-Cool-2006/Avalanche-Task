import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { request, authApi } from "../services/api";

/** fetch wrapper utilizing centralized request handling */
async function call(path, body, retry = true) {
  const method = body === undefined ? "GET" : "POST";
  return await request(`/auth/${path}`, {
    method,
    body,
    retryOnUnauthorized: retry,
  });
}

const Ctx = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .getMe()
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
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
