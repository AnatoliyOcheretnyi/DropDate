"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
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

class AuthError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

class AuthTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthTransientError";
  }
}

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string
  ) => Promise<{
    status: "ok" | "verification_required";
    message?: string;
  }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const parseAuthResponse = async (response: Response): Promise<AuthResult> => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    // Backend errors use the `error` key; the proxy/other services may use `message`.
    const message =
      payload?.message || payload?.error || "Auth request failed";
    throw new AuthError(message, payload?.code, response.status);
  }
  return payload as AuthResult;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isVerifyRoute = pathname?.startsWith("/auth/verify");

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
    if (isVerifyRoute) {
      return;
    }
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearAuth();
          return;
        }
        throw new AuthTransientError(`refresh failed with ${response.status}`);
      }
      const result = await response.json().catch(() => null);
      if (!result) {
        throw new AuthTransientError("refresh returned invalid JSON");
      }
      applyAuth(result);
    } catch {
      // Transient errors (cold starts, network) should not wipe auth state.
      throw new AuthTransientError("refresh failed");
    }
  }, [applyAuth, clearAuth, isVerifyRoute]);

  useEffect(() => {
    let isMounted = true;
    const boot = async () => {
      setIsLoading(true);
      if (isVerifyRoute) {
        setIsLoading(false);
        return;
      }
      const maxAttempts = 4;
      const baseDelay = 600;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          await refresh();
          break;
        } catch (error) {
          if (!(error instanceof AuthTransientError)) {
            break;
          }
          if (attempt === maxAttempts - 1) {
            break;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, baseDelay * 2 ** attempt)
          );
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };
    boot();
    return () => {
      isMounted = false;
    };
  }, [isVerifyRoute, refresh]);

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
    async (
      email: string,
      password: string
    ): Promise<{ status: "ok" | "verification_required"; message?: string }> => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 202 && payload?.status === "verification_required") {
        setSyncFlag("1");
        const message =
          typeof payload?.message === "string" ? payload.message : undefined;
        return { status: "verification_required", message };
      }
      if (!response.ok) {
        const message =
          payload?.message || payload?.error || "Auth request failed";
        throw new AuthError(message, payload?.code, response.status);
      }
      setSyncFlag("1");
      applyAuth(payload as AuthResult);
      return { status: "ok" };
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
    if (typeof window !== "undefined") {
      console.warn("useAuth must be used within AuthProvider");
    }
    return {
      user: null,
      accessToken: null,
      isLoading: false,
      login: async () => {
        throw new Error("AuthProvider is missing");
      },
      register: async () => ({
        status: "verification_required" as const,
        message: "AuthProvider is missing",
      }),
      logout: async () => {},
      refresh: async () => {},
    };
  }
  return context;
}

export { AuthError };
