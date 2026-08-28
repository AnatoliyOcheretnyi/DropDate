import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requestApi = vi.fn();

vi.mock("../../../shared/api/http", () => ({
  requestApi: (...args: unknown[]) => requestApi(...args),
  webApi: { post: vi.fn() },
}));

vi.mock("../../../shared/state/auth", () => ({
  useAuth: () => ({ user: { id: "u1" }, accessToken: "token" }),
}));

import { useNotifications } from "./useNotifications";

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useNotifications", () => {
  beforeEach(() => {
    requestApi.mockReset();
  });

  // A friend recommendation lands for a user who follows nothing. The query
  // used to be gated on having a followed title, which left those notifications
  // stored, unread and invisible.
  it("fetches notifications for a signed-in user with an empty library", async () => {
    requestApi.mockResolvedValue({
      ok: true,
      payload: {
        items: [
          {
            id: "n1",
            tmdbId: 1,
            mediaType: "movie",
            title: "Дюна",
            eventType: "friend_recommendation",
            eventKey: "friend-recommendation:r1",
            createdAt: "2026-08-29T10:00:00Z",
          },
        ],
        unreadCount: 1,
      },
      status: 200,
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.unreadCount).toBe(1);
    expect(requestApi).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/api/notifications" })
    );
  });
});
