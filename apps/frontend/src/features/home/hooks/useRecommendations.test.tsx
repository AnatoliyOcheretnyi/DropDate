import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecommendations } from "./useRecommendations";

const requestApi = vi.fn();
vi.mock("../../../shared/state/auth", () => ({
  useAuth: () => ({ user: { id: "u1" }, accessToken: "token" }),
  fetchWithAuth: (url: string) => {
    const parsed = new URL(url, "http://localhost");
    return requestApi({
      url: parsed.pathname,
      params: Object.fromEntries(parsed.searchParams),
    });
  },
}));

describe("personal discovery feed", () => {
  beforeEach(() => {
    requestApi.mockReset().mockImplementation(async ({ url, params }) => ({
      ok: true,
      json: async () => ({
        items:
          url.endsWith("/feedback") || params?.exclude
            ? []
            : [1, 2, 3, 4].map((tmdbId) => ({
                tmdbId,
                mediaType: "movie",
                title: `Film ${tmdbId}`,
                reason: { text: "Твій жанр" },
              })),
      }),
    }));
  });
  it("shows a four-item feed, requests AI, and excludes previous picks on refresh", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRecommendations(), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(result.current.itemsWithReasons[0].reason?.text).toBe("Твій жанр");
    expect(requestApi).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/recommendations/me",
        params: expect.objectContaining({ limit: "4", ai: "1" }),
      }),
    );
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.exhausted).toBe(true));
    expect(requestApi).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          exclude: "movie:1,movie:2,movie:3,movie:4",
        }),
      }),
    );
    act(() => result.current.setNovelty(80));
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(requestApi).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ novelty: "80", exclude: "" }),
      }),
    );
  });
  it("retries a failed recommendation request when Repeat is pressed", async () => {
    let failed = true;
    requestApi.mockImplementation(async ({ url }) => ({
      ok: url.endsWith("/feedback") || !failed,
      json: async () => ({
        items: url.endsWith("/feedback")
          ? []
          : [{ tmdbId: 9, mediaType: "movie", title: "Recovered" }],
      }),
    }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRecommendations(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    failed = false;
    act(() => result.current.restart());
    await waitFor(() =>
      expect(result.current.items[0]?.title).toBe("Recovered"),
    );
    expect(result.current.error).toBeNull();
  });
});
