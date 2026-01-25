import { create } from 'zustand';

import { getBackendURL } from '../../../shared/utils/config';
import {
  storageDelete,
  storageGetString,
  storageKeys,
  storageSetString,
} from '../../../shared/utils/storage';

export type AuthUser = {
  id: string;
  email: string;
  verified?: boolean;
};

export type AuthResult =
  | { status: 'ok' }
  | { status: 'verification_required' }
  | { status: 'email_not_verified' }
  | { status: 'error'; message: string; code?: string };

type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; email: string; verified?: boolean };
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isGuest: boolean;
  isLoading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
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

const parseError = async (response: Response) => {
  const payload = await response.json().catch(() => ({}));
  return {
    message: payload?.message || payload?.error || 'Request failed',
    code: payload?.code,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isGuest: false,
  isLoading: true,
  initialized: false,
  init: async () => {
    if (get().initialized) {
      return;
    }
    set({ initialized: true, isLoading: true });
    const token = storageGetString(STORAGE_KEY);
    const guestFlag = storageGetString(GUEST_KEY);
    if (guestFlag === '1') {
      set({ isGuest: true });
    }
    if (!token) {
      set({ isLoading: false });
      return;
    }
    set({ refreshToken: token });
    await get().refresh();
    set({ isLoading: false });
  },
  login: async (email: string, password: string) => {
    try {
      const response = await fetch(`${getBackendURL()}/auth/login`, {
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
      const refreshToken = payload.refreshToken ?? null;
      set({
        user: {
          id: payload.user.id,
          email: payload.user.email,
          verified: payload.user.verified,
        },
        accessToken: payload.accessToken,
        refreshToken,
        isGuest: false,
      });
      storageDelete(GUEST_KEY);
      if (refreshToken) {
        storageSetString(STORAGE_KEY, refreshToken);
      }
      return { status: 'ok' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { status: 'error', message };
    }
  },
  register: async (email: string, password: string) => {
    try {
      const response = await fetch(`${getBackendURL()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email, password, returnRefresh: true, client: 'mobile' }),
      });
      if (response.status === 202) {
        set({ isGuest: false });
        storageDelete(GUEST_KEY);
        return { status: 'verification_required' };
      }
      if (!response.ok) {
        const error = await parseError(response);
        return { status: 'error', message: error.message, code: error.code };
      }
      const payload = (await response.json()) as AuthResponse;
      const refreshToken = payload.refreshToken ?? null;
      set({
        user: {
          id: payload.user.id,
          email: payload.user.email,
          verified: payload.user.verified,
        },
        accessToken: payload.accessToken,
        refreshToken,
        isGuest: false,
      });
      storageDelete(GUEST_KEY);
      if (refreshToken) {
        storageSetString(STORAGE_KEY, refreshToken);
      }
      return { status: 'ok' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { status: 'error', message };
    }
  },
  continueAsGuest: () => {
    storageSetString(GUEST_KEY, '1');
    set({ isGuest: true });
  },
  resetGuest: () => {
    storageDelete(GUEST_KEY);
    set({ isGuest: false });
  },
  logout: async () => {
    const { refreshToken } = get();
    const token = refreshToken || storageGetString(STORAGE_KEY);
    if (token) {
      await fetch(`${getBackendURL()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      }).catch(() => undefined);
    }
    storageDelete(STORAGE_KEY);
    storageDelete(GUEST_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isGuest: false,
    });
  },
  refresh: async () => {
    const { refreshToken } = get();
    const token = refreshToken || storageGetString(STORAGE_KEY);
    if (!token) {
      return false;
    }
    try {
      const response = await fetch(`${getBackendURL()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!response.ok) {
        storageDelete(STORAGE_KEY);
        set({ refreshToken: null, accessToken: null, user: null });
        return false;
      }
      const payload = (await response.json()) as AuthResponse;
      const nextRefresh = payload.refreshToken ?? token;
      set({
        user: {
          id: payload.user.id,
          email: payload.user.email,
          verified: payload.user.verified,
        },
        accessToken: payload.accessToken,
        refreshToken: nextRefresh,
        isGuest: false,
      });
      storageSetString(STORAGE_KEY, nextRefresh);
      return true;
    } catch {
      return false;
    }
  },
  resendVerification: async (email: string) => {
    try {
      const response = await fetch(`${getBackendURL()}/auth/verify/resend`, {
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
  setUserVerified: (value: boolean) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, verified: value } });
  },
}));

export const useAuth = useAuthStore;
