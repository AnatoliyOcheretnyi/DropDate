import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecommendations } from "./useRecommendations";

const requestApi = vi.fn();
let userId = "u1";
vi.mock("../../../shared/state/auth", () => ({
  useAuth: () => ({ user: { id: userId }, accessToken: "token" }),
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
    userId = "u1";
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
  it("retains cards during a slow or failed slider update without leaking them to another account", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useRecommendations(), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    const original = result.current.itemsWithReasons;
    let finish!: (response: { ok: boolean }) => void;
    requestApi.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    act(() => result.current.setNovelty(80));
    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    expect(result.current.itemsWithReasons).toBe(original);
    expect(result.current.isLoading).toBe(false);
    await act(async () => finish({ ok: false }));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.itemsWithReasons).toBe(original);
    userId = "u2";
    rerender();
    expect(result.current.itemsWithReasons).toEqual([]);
    expect(result.current.isLoading).toBe(true);
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
