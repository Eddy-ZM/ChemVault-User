import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    institution?: string;
    fieldOfInterest?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const body = await apiRequest<{ user: User }>("/api/auth/me");
      setUser(body.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (payload: { email: string; password: string }) => {
    const body = await apiRequest<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setUser(body.user);
    return body.user;
  }, []);

  const register = useCallback(async (payload: Parameters<AuthContextValue["register"]>[0]) => {
    const body = await apiRequest<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setUser(body.user);
    return body.user;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest<{ ok: true }>("/api/auth/logout", { method: "POST" }).catch(() => ({ ok: true }));
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout, setUser }),
    [loading, login, logout, refresh, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
