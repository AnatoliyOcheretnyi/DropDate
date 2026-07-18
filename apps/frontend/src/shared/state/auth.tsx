"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { webApi } from "../api/http";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  isSuperuser: boolean;
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

type AuthStore = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isVerifyRoute: boolean;
  setVerifyRoute: (value: boolean) => void;
  boot: () => Promise<void>;
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
  updateUsername: (username: string) => Promise<void>;
};

type AuthPayload = Partial<AuthResult> & {
  status?: string;
  message?: string;
  error?: string;
  code?: string;
};

const getAuthMessage = (payload: AuthPayload | null, fallback: string) =>
  payload?.message || payload?.error || fallback;

const toAuthResult = (payload: AuthPayload | null): AuthResult | null => {
  if (
    !payload ||
    typeof payload.accessToken !== "string" ||
    !payload.user ||
    typeof payload.user.id !== "string" ||
    typeof payload.user.email !== "string"
  ) {
    return null;
  }
  return {
    accessToken: payload.accessToken,
    expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : "",
    user: {
      id: payload.user.id,
      email: payload.user.email,
      username: typeof payload.user.username === "string" ? payload.user.username : "",
      isSuperuser: payload.user.isSuperuser === true,
    },
  };
};

const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isVerifyRoute: false,
  setVerifyRoute: (value) => {
    set({ isVerifyRoute: value });
  },
  boot: async () => {
    set({ isLoading: true });
    if (get().isVerifyRoute) {
      set({ isLoading: false });
      return;
    }

    const maxAttempts = 4;
    const baseDelay = 600;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await get().refresh();
        break;
      } catch (error) {
        if (!(error instanceof AuthTransientError)) {
          break;
        }
        if (attempt === maxAttempts - 1) {
          break;
        }
        await new Promise((resolve) =>
          window.setTimeout(resolve, baseDelay * 2 ** attempt)
        );
      }
    }

    set({ isLoading: false });
  },
  login: async (email: string, password: string) => {
    const response = await webApi.post<AuthPayload>(
      "/api/auth/login",
      { email, password },
      {
        headers: { "content-type": "application/json" },
        validateStatus: () => true,
      }
    );

    if (response.status < 200 || response.status >= 300) {
      throw new AuthError(
        getAuthMessage(response.data, "Auth request failed"),
        response.data?.code,
        response.status
      );
    }

    const result = toAuthResult(response.data);
    if (!result) {
      throw new AuthError("Auth request failed", undefined, response.status);
    }

    set({ user: result.user, accessToken: result.accessToken });
  },
  register: async (email: string, password: string) => {
    const response = await webApi.post<AuthPayload>(
      "/api/auth/register",
      { email, password },
      {
        headers: { "content-type": "application/json" },
        validateStatus: () => true,
      }
    );

    if (response.status === 202 && response.data?.status === "verification_required") {
      return {
        status: "verification_required" as const,
        message:
          typeof response.data?.message === "string"
            ? response.data.message
            : undefined,
      };
    }

    if (response.status < 200 || response.status >= 300) {
      throw new AuthError(
        getAuthMessage(response.data, "Auth request failed"),
        response.data?.code,
        response.status
      );
    }

    const result = toAuthResult(response.data);
    if (!result) {
      throw new AuthError("Auth request failed", undefined, response.status);
    }

    set({ user: result.user, accessToken: result.accessToken });
    return { status: "ok" as const };
  },
  logout: async () => {
    try {
      await webApi.post(
        "/api/auth/logout",
        {},
        {
          headers: { "content-type": "application/json" },
          validateStatus: () => true,
        }
      );
    } finally {
      set({ user: null, accessToken: null });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("saved:clear"));
      }
    }
  },
  refresh: async () => {
    if (get().isVerifyRoute) {
      return;
    }

    let response;
    try {
      response = await webApi.post<AuthPayload>(
        "/api/auth/refresh",
        {},
        {
          headers: { "content-type": "application/json" },
          validateStatus: () => true,
        }
      );
    } catch {
      throw new AuthTransientError("refresh failed");
    }

    if (response.status === 401 || response.status === 403) {
      set({ user: null, accessToken: null });
      return;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new AuthTransientError(`refresh failed with ${response.status}`);
    }

    const result = toAuthResult(response.data);
    if (!result) {
      throw new AuthTransientError("refresh returned invalid JSON");
    }

    set({ user: result.user, accessToken: result.accessToken });
  },
  updateUsername: async (username: string) => {
    const current = get().user;
    const response = await webApi.request<
      Partial<{ id: string; email: string; username: string }> & AuthPayload
    >({
      url: "/api/me",
      method: "PATCH",
      data: { username },
      headers: { "content-type": "application/json" },
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new AuthError(
        getAuthMessage(response.data, "Не вдалося оновити юзернейм"),
        response.data?.code,
        response.status
      );
    }

    const nextUsername =
      typeof response.data?.username === "string" ? response.data.username : username;
    if (current) {
      set({ user: { ...current, username: nextUsername } });
    }
  },
}));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isVerifyRoute = pathname?.startsWith("/auth/verify") ?? false;

  useEffect(() => {
    useAuthStore.getState().setVerifyRoute(isVerifyRoute);
    void useAuthStore.getState().boot();
  }, [isVerifyRoute]);

  return <>{children}</>;
}

export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      user: state.user,
      accessToken: state.accessToken,
      isLoading: state.isLoading,
      login: state.login,
      register: state.register,
      logout: state.logout,
      refresh: state.refresh,
      updateUsername: state.updateUsername,
    }))
  );
}

export { AuthError };
