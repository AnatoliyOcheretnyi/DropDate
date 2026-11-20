import {
  readRefreshToken,
  writeRefreshToken,
} from "../../../shared/utils/secureSession";
import { create } from "zustand";
import { clearTasteSession } from "../../profile/store/tasteStore";

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
  deleteAccount: (password: string) => Promise<void>;
  refresh: () => Promise<boolean>;
  resendVerification: (email: string) => Promise<AuthResult>;
  setUserVerified: (value: boolean) => void;
};

let sessionGeneration = 0;
let refreshPromise: Promise<boolean> | null = null;
const GUEST_KEY = storageKeys.guestMode;

const authError = (error: unknown): AuthResult => ({
  status: "error",
  message: error instanceof Error ? error.message : "Network error",
  code: error instanceof ApiError ? error.code : undefined,
});

const clearLocalSession = async () => {
  sessionGeneration += 1;
  const previousUser = useAuthStore.getState().user;
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isGuest: false,
  });
  if (previousUser) storageDelete("dropdate_saved_cache_" + previousUser.id);
  for (const key of [
    storageKeys.moodSession,
    storageKeys.matchSession,
    storageKeys.tasteProfile,
  ])
    storageDelete(key);
  clearTasteSession();
  storageDelete(GUEST_KEY);
  try {
    await writeRefreshToken(null);
  } finally {
    await clearUserSessionCache();
  }
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
    const token = await readRefreshToken().catch(() => null);
    const guestFlag = storageGetString(GUEST_KEY);
    if (guestFlag === "1") {
      set({ isGuest: true });
    }
    if (!token) {
      set({ isLoading: false });
      return;
    }
    set({ refreshToken: token });
    await get()
      .refresh()
      .catch(() => false);
    set({ isLoading: false });
  },
  login: async (email: string, password: string) => {
    try {
      const payload = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password, returnRefresh: true, client: "mobile" },
      });
      const refreshToken = payload.refreshToken ?? null;
      await clearUserSessionCache();
      sessionGeneration += 1;
      await writeRefreshToken(refreshToken);
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
      await clearUserSessionCache();
      sessionGeneration += 1;
      await writeRefreshToken(refreshToken);
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
    const token =
      get().refreshToken || (await readRefreshToken().catch(() => null));
    await clearLocalSession();
    // Local sign-out must not wait for an unreachable server.
    if (token)
      void apiRequest("/auth/logout", {
        method: "POST",
        body: { refreshToken: token },
        retryAuth: false,
      }).catch(() => undefined);
  },
  deleteAccount: async (password) => {
    await apiRequest("/me", {
      method: "DELETE",
      auth: true,
      body: { password, confirmation: "DELETE" },
    });
    await clearLocalSession();
    set({ user: null, accessToken: null, refreshToken: null, isGuest: false });
  },
  refresh: () => {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const generation = sessionGeneration;
      const { refreshToken } = get();
      const token = refreshToken || (await readRefreshToken());
      if (!token) {
        return false;
      }
      try {
        const payload = await apiRequest<AuthResponse>("/auth/refresh", {
          method: "POST",
          body: { refreshToken: token },
          retryAuth: false,
        });
        if (generation !== sessionGeneration) return false;
        const nextRefresh = payload.refreshToken ?? token;
        await writeRefreshToken(nextRefresh);
        if (generation !== sessionGeneration) return false;
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
        return true;
      } catch (error) {
        if (generation !== sessionGeneration) return false;
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          await clearLocalSession();
          set({ refreshToken: null, accessToken: null, user: null });
          return false;
        }
        // Offline and server failures are recoverable; retain the session.
        throw error;
      }
    })().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
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
    void clearLocalSession().catch(() => undefined);
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },
});
