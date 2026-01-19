"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SYNC_ON_AUTH_KEY } from "../types/releases";

type AuthUser = {
  id: string;
  email: string;
};

type AuthResult = {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const parseAuthResponse = async (response: Response): Promise<AuthResult> => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || "Auth request failed";
    throw new Error(message);
  }
  return payload as AuthResult;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuth = useCallback((result: AuthResult) => {
    setUser(result.user);
    setAccessToken(result.accessToken);
  }, []);

  const setSyncFlag = useCallback((value: "1" | "0") => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(SYNC_ON_AUTH_KEY, value);
    } catch {
      // ignore storage issues
    }
  }, []);

  const clearSyncFlag = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(SYNC_ON_AUTH_KEY);
    } catch {
      // ignore storage issues
    }
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
      });
      const result = await parseAuthResponse(response);
      applyAuth(result);
    } catch {
      clearAuth();
    }
  }, [applyAuth, clearAuth]);

  useEffect(() => {
    let isMounted = true;
    const boot = async () => {
      setIsLoading(true);
      await refresh();
      if (isMounted) {
        setIsLoading(false);
      }
    };
    boot();
    return () => {
      isMounted = false;
    };
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const result = await parseAuthResponse(response);
      setSyncFlag("0");
      applyAuth(result);
    },
    [applyAuth, setSyncFlag]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const result = await parseAuthResponse(response);
      setSyncFlag("1");
      applyAuth(result);
    },
    [applyAuth, setSyncFlag]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
      });
    } finally {
      clearAuth();
      clearSyncFlag();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("saved:clear"));
      }
    }
  }, [clearAuth, clearSyncFlag]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, accessToken, isLoading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
