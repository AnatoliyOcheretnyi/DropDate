import { create } from "zustand";

import { apiRequest, configureApiAuth } from "../../../shared/api/client";
import { ApiError } from "../../../shared/api/errors";
import { clearUserSessionCache } from "../../../shared/api/queryClient";
import {
  storageDelete,
  storageGetString,
  storageKeys,
  storageSetString,
} from "../../../shared/utils/storage";

export type AuthUser = {
  id: string;
  email: string;
  verified?: boolean;
  username?: string;
  isSuperuser?: boolean;
};

export type AuthResult =
  | { status: "ok" }
  | { status: "verification_required" }
  | { status: "email_not_verified" }
  | { status: "error"; message: string; code?: string };

type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
};

type RegisterResponse =
  AuthResponse | { status: "verification_required"; message?: string };

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

const authError = (error: unknown): AuthResult => ({
  status: "error",
  message: error instanceof Error ? error.message : "Network error",
  code: error instanceof ApiError ? error.code : undefined,
});

const clearLocalSession = () => {
  storageDelete(STORAGE_KEY);
  storageDelete(GUEST_KEY);
  void clearUserSessionCache();
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
    if (guestFlag === "1") {
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
      const payload = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password, returnRefresh: true, client: "mobile" },
      });
      await clearUserSessionCache();
      const refreshToken = payload.refreshToken ?? null;
      set({
        user: {
          id: payload.user.id,
          email: payload.user.email,
          verified: payload.user.verified,
          username: payload.user.username,
          isSuperuser: payload.user.isSuperuser,
        },
        accessToken: payload.accessToken,
        refreshToken,
        isGuest: false,
      });
      storageDelete(GUEST_KEY);
      if (refreshToken) {
        storageSetString(STORAGE_KEY, refreshToken);
      }
      return { status: "ok" };
    } catch (error) {
      if (error instanceof ApiError && error.status === 403)
        return { status: "email_not_verified" };
      return authError(error);
    }
  },
  register: async (email: string, password: string) => {
    try {
      const payload = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: { email, password, returnRefresh: true, client: "mobile" },
      });
      if (!("accessToken" in payload)) {
        set({ isGuest: false });
        storageDelete(GUEST_KEY);
        return { status: "verification_required" };
      }
      const refreshToken = payload.refreshToken ?? null;
      set({
        user: {
          id: payload.user.id,
          email: payload.user.email,
          verified: payload.user.verified,
          username: payload.user.username,
          isSuperuser: payload.user.isSuperuser,
        },
        accessToken: payload.accessToken,
        refreshToken,
        isGuest: false,
      });
      storageDelete(GUEST_KEY);
      if (refreshToken) {
        storageSetString(STORAGE_KEY, refreshToken);
      }
      return { status: "ok" };
    } catch (error) {
      return authError(error);
    }
  },
  continueAsGuest: () => {
    storageSetString(GUEST_KEY, "1");
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
      await apiRequest("/auth/logout", {
        method: "POST",
        body: { refreshToken: token },
      }).catch(() => undefined);
    }
    clearLocalSession();
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
      const payload = await apiRequest<AuthResponse>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: token },
        retryAuth: false,
      });
      const nextRefresh = payload.refreshToken ?? token;
      set({
        user: {
          id: payload.user.id,
          email: payload.user.email,
          verified: payload.user.verified,
          username: payload.user.username,
          isSuperuser: payload.user.isSuperuser,
        },
        accessToken: payload.accessToken,
        refreshToken: nextRefresh,
        isGuest: false,
      });
      storageSetString(STORAGE_KEY, nextRefresh);
      return true;
    } catch {
      storageDelete(STORAGE_KEY);
      set({ refreshToken: null, accessToken: null, user: null });
      return false;
    }
  },
  resendVerification: async (email: string) => {
    try {
      await apiRequest("/auth/verify/resend", {
        method: "POST",
        body: { email },
      });
      return { status: "ok" };
    } catch (error) {
      return authError(error);
    }
  },
  setUserVerified: (value: boolean) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, verified: value } });
  },
}));

export const useAuth = useAuthStore;

configureApiAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refresh: () => useAuthStore.getState().refresh(),
  onUnauthorized: () => {
    clearLocalSession();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },
});
