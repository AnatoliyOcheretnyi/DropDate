import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDailyPick } from "./useDailyPick";
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("../../../shared/state/auth", () => ({
  useAuth: () => ({ user: { id: "u1" }, accessToken: "token" }),
  fetchWithAuth: fetchMock,
}));
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useDailyPick(), { wrapper });
}
describe("daily pick state", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([
    { status: 401, reason: undefined, insufficient: false },
    { status: 503, reason: undefined, insufficient: false },
    { status: 200, reason: undefined, insufficient: false },
    { status: 200, reason: "exhausted", insufficient: false },
    { status: 200, reason: "insufficient_data", insufficient: true },
  ])("only requests more taste for an explicit insufficient_data response: $status $reason", async ({ status, reason, insufficient }) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ revealed: false, action: "none", emptyReason: reason }), { status }));
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isEmpty).toBe(insufficient);
    expect(result.current.isUnavailable).toBe(!insufficient);
  });
  it("recovers a failed pick and keeps reveal/action state", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    const { result } = setup();
    await waitFor(() => expect(result.current.isUnavailable).toBe(true));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ date: "2026-11-09", pick: { tmdbId: 99, mediaType: "movie", title: "Personal", reason: { text: "Based on your favorites" } }, revealed: true, action: "saved" })));
    await act(async () => { await result.current.retry(); });
    await waitFor(() => expect(result.current.pick?.tmdbId).toBe(99));
    expect(result.current.state?.revealed).toBe(true);
    expect(result.current.state?.action).toBe("saved");
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.isUnavailable).toBe(false);
  });
});
