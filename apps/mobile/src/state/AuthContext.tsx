import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { getBackendURL } from '../utils/config';
import { storageDelete, storageGetString, storageSetString, storageKeys } from '../utils/storage';

type AuthUser = {
  id: string;
  email: string;
  verified?: boolean;
};

type AuthResult =
  | { status: 'ok' }
  | { status: 'verification_required' }
  | { status: 'email_not_verified' }
  | { status: 'error'; message: string; code?: string };

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isGuest: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string) => Promise<AuthResult>;
  continueAsGuest: () => void;
  resetGuest: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  resendVerification: (email: string) => Promise<AuthResult>;
  setUserVerified: (value: boolean) => void;
};

const STORAGE_KEY = storageKeys.refreshToken;
const GUEST_KEY = storageKeys.guestMode;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; email: string; verified?: boolean };
};

const parseError = async (response: Response) => {
  const payload = await response.json().catch(() => ({}));
  return {
    message: payload?.message || payload?.error || 'Request failed',
    code: payload?.code,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const backendURL = useMemo(() => getBackendURL(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const persistRefresh = useCallback(async (token: string | null) => {
    if (token) {
      storageSetString(STORAGE_KEY, token);
    } else {
      storageDelete(STORAGE_KEY);
    }
  }, []);

  const applyAuthResponse = useCallback(
    async (payload: AuthResponse) => {
      setUser({
        id: payload.user.id,
        email: payload.user.email,
        verified: payload.user.verified,
      });
      setAccessToken(payload.accessToken);
      setIsGuest(false);
      storageDelete(GUEST_KEY);
      if (payload.refreshToken) {
        setRefreshToken(payload.refreshToken);
        await persistRefresh(payload.refreshToken);
      }
    },
    [persistRefresh]
  );

  const refresh = useCallback(async () => {
    const token = refreshToken || storageGetString(STORAGE_KEY);
    if (!token) {
      return false;
    }
    try {
      const response = await fetch(`${backendURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!response.ok) {
        await persistRefresh(null);
        setRefreshToken(null);
        setAccessToken(null);
        setUser(null);
        return false;
      }
      const payload = (await response.json()) as AuthResponse;
      await applyAuthResponse({ ...payload, refreshToken: payload.refreshToken ?? token });
      return true;
    } catch {
      return false;
    }
  }, [applyAuthResponse, backendURL, persistRefresh, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = storageGetString(STORAGE_KEY);
      const guestFlag = storageGetString(GUEST_KEY);
      if (cancelled) return;
      if (guestFlag === '1') {
        setIsGuest(true);
      }
      if (!token) {
        setIsLoading(false);
        return;
      }
      setRefreshToken(token);
      await refresh();
      if (!cancelled) {
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const response = await fetch(`${backendURL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ email, password, returnRefresh: true, client: 'mobile' }),
        });
        if (response.status === 403) {
          return { status: 'email_not_verified' };
        }
        if (!response.ok) {
          const error = await parseError(response);
          return { status: 'error', message: error.message, code: error.code };
        }
        const payload = (await response.json()) as AuthResponse;
        await applyAuthResponse(payload);
        return { status: 'ok' };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        return { status: 'error', message };
      }
    },
    [applyAuthResponse, backendURL]
  );

  const register = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const response = await fetch(`${backendURL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ email, password, returnRefresh: true, client: 'mobile' }),
        });
        if (response.status === 202) {
          setIsGuest(false);
          storageDelete(GUEST_KEY);
          return { status: 'verification_required' };
        }
        if (!response.ok) {
          const error = await parseError(response);
          return { status: 'error', message: error.message, code: error.code };
        }
        const payload = (await response.json()) as AuthResponse;
        await applyAuthResponse(payload);
        return { status: 'ok' };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        return { status: 'error', message };
      }
    },
    [applyAuthResponse, backendURL]
  );

  const resendVerification = useCallback(
    async (email: string): Promise<AuthResult> => {
      try {
        const response = await fetch(`${backendURL}/auth/verify/resend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          const error = await parseError(response);
          return { status: 'error', message: error.message, code: error.code };
        }
        return { status: 'ok' };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        return { status: 'error', message };
      }
    },
    [backendURL]
  );

  const logout = useCallback(async () => {
    const token = refreshToken || storageGetString(STORAGE_KEY);
    if (token) {
      await fetch(`${backendURL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      }).catch(() => undefined);
    }
    await persistRefresh(null);
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsGuest(false);
    storageDelete(GUEST_KEY);
  }, [backendURL, persistRefresh, refreshToken]);

  const continueAsGuest = useCallback(() => {
    storageSetString(GUEST_KEY, '1');
    setIsGuest(true);
  }, []);

  const resetGuest = useCallback(() => {
    storageDelete(GUEST_KEY);
    setIsGuest(false);
  }, []);

  const setUserVerified = useCallback((value: boolean) => {
    setUser((prev) => (prev ? { ...prev, verified: value } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isGuest,
      isLoading,
      login,
      register,
      continueAsGuest,
      resetGuest,
      logout,
      refresh,
      resendVerification,
      setUserVerified,
    }),
    [
      accessToken,
      isLoading,
      login,
      logout,
      refresh,
      refreshToken,
      isGuest,
      register,
      continueAsGuest,
      resetGuest,
      resendVerification,
      setUserVerified,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthContext is missing');
  }
  return ctx;
}
