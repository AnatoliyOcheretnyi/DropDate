import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useSavedReleases } from "../hooks/useSavedReleases";
import { useSavedStore } from "../store/savedStore";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../../shared/state/auth";
import { webApi } from "../../../shared/api/http";
import { webQueryClient } from "../../../shared/api/queryClient";
import {
  createSavedRemote,
  fetchSavedRemote,
  patchSavedStatsRemote,
  removeSavedRemote,
  retrySavedWrite,
} from "./savedApi";
import {
  hydrateSavedWrites,
  SAVED_WRITES_KEY,
  useSavedWrites,
} from "../store/savedWrites";

vi.mock("next/navigation", () => ({ usePathname: () => "/search" }));
vi.mock("../../../shared/api/http", () => ({
  webApi: { post: vi.fn(), request: vi.fn() },
  requestApi: vi.fn(),
}));
const user = {
  id: "viewer",
  email: "viewer@example.com",
  username: "viewer",
  isSuperuser: false,
};
const film = {
  tmdbId: 53064,
  mediaType: "movie" as const,
  title: "Мідорі",
  nextRelease: "",
  status: "released" as const,
  listType: "watchlist" as const,
};
const fetchMock = vi.fn<typeof fetch>();
const response = (body: unknown = {}, status = 200) =>
  new Response(JSON.stringify(body), { status });
async function login(id = user.id, accessToken = "expired-token") {
  const { result } = renderHook(() => useAuth());
  vi.mocked(webApi.post).mockResolvedValueOnce({
    status: 200,
    data: { user: { ...user, id }, accessToken },
  });
  await act(() => result.current.login(user.email, "test-password"));
  return result;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(webApi.post).mockReset();
  sessionStorage.clear();
  useSavedWrites.setState({
    writes: [],
    hydrated: false,
    storageUnavailable: false,
  });
  webQueryClient.clear();
  useSavedStore.setState({ saved: [], isReady: false });
});
afterEach(async () => {
  const { result } = renderHook(() => useAuth());
  vi.mocked(webApi.post).mockResolvedValue({ status: 204, data: {} });
  await act(() => result.current.logout());
  webQueryClient.clear();
  vi.unstubAllGlobals();
});

describe("saved writes after a long search session", () => {
  it("restarts an in-flight first collection request after a successful save", async () => {
    await login();
    fetchMock.mockResolvedValue(response());
    let finishOld!: (value: string[]) => void;
    let oldSignal: AbortSignal | undefined;
    let calls = 0;
    const { result } = renderHook(() => useQuery({
      queryKey: ["home-collection", user.id, "country"],
      queryFn: ({ signal }) => {
        calls++;
        if (calls > 1) return Promise.resolve(["replacement"]);
        oldSignal = signal;
        return new Promise<string[]>((resolve) => { finishOld = resolve; });
      },
    }), { wrapper: ({ children }) => <QueryClientProvider client={webQueryClient}>{children}</QueryClientProvider> });
    await waitFor(() => expect(calls).toBe(1));
    await act(async () => { await createSavedRemote(user.id, film); });
    await waitFor(() => expect(result.current.data).toEqual(["replacement"]));
    expect(oldSignal?.aborted).toBe(true);
    expect(calls).toBe(2);
    await act(async () => { finishOld(["stale"]); });
    expect(result.current.data).toEqual(["replacement"]);
  });
  it("refreshes once for concurrent expired saves and reads, preserving each payload", async () => {
    await login();
    vi.mocked(webApi.post).mockResolvedValue({
      status: 200,
      data: { user, accessToken: "fresh-token" },
    });
    fetchMock.mockImplementation(async (_url, init) => {
      if (
        new Headers(init?.headers).get("authorization") !== "Bearer fresh-token"
      )
        return response({}, 401);
      return response(
        init?.method === "GET" ? { items: [] } : { unlockedAchievements: [] },
      );
    });
    await act(async () => {
      await Promise.all([
        createSavedRemote(user.id, film),
        createSavedRemote(user.id, {
          ...film,
          tmdbId: 12,
          title: "Інший фільм",
        }),
        fetchSavedRemote(user.id),
      ]);
    });
    expect(
      vi
        .mocked(webApi.post)
        .mock.calls.filter(([url]) => url === "/api/auth/refresh"),
    ).toHaveLength(1);
    const saves = fetchMock.mock.calls.filter(
      ([, init]) =>
        init?.method === "POST" &&
        new Headers(init.headers).get("authorization") === "Bearer fresh-token",
    );
    expect(
      saves.map(([, init]) => JSON.parse(init!.body as string).tmdbId).sort(),
    ).toEqual([12, 53064]);
    expect(saves.every(([, init]) => init?.keepalive)).toBe(true);
    expect(useSavedWrites.getState().writes).toEqual([]);
  });

  it("retains a failed film across reload, and explicit retry clears it only after confirmation", async () => {
    await login();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(createSavedRemote(user.id, film)).rejects.toThrow();
    expect(useSavedWrites.getState().writes[0]).toMatchObject({
      title: "Мідорі",
      status: "error",
    });
    expect(sessionStorage.getItem(SAVED_WRITES_KEY)).not.toContain(
      "expired-token",
    );
    useSavedWrites.setState({ writes: [], hydrated: false }); // reload the journal
    hydrateSavedWrites();
    const restored = useSavedWrites.getState().writes[0];
    expect(restored.operation.payload).toMatchObject(film);
    expect(fetchMock).toHaveBeenCalledTimes(1); // hydration does not replay writes
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const retry = retrySavedWrite(restored.id);
    expect(useSavedWrites.getState().writes[0].status).toBe("pending");
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    resolve(response());
    await retry;
    expect(useSavedWrites.getState().writes).toEqual([]);
    expect(JSON.parse(sessionStorage.getItem(SAVED_WRITES_KEY)!)).toEqual([]);
  });

  it.each([429, 500, 503])(
    "keeps an actionable error for HTTP %s without retrying endlessly",
    async (status) => {
      await login();
      fetchMock.mockResolvedValue(response({}, status));
      await expect(createSavedRemote(user.id, film)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(useSavedWrites.getState().writes[0]).toMatchObject({
        title: "Мідорі",
        status: "error",
      });
      expect(useSavedWrites.getState().writes[0].message).toMatch(
        status === 429 ? /хвилину/ : /недоступний/,
      );
    },
  );

  it("keeps rejected-session changes and never retries them under another account", async () => {
    const auth = await login();
    vi.mocked(webApi.post).mockResolvedValue({ status: 401, data: {} });
    fetchMock.mockResolvedValue(response({}, 401));
    await act(async () => {
      await expect(createSavedRemote(user.id, film)).rejects.toThrow(/Сесія/);
    });
    expect(auth.current.user).toBeNull();
    const id = useSavedWrites.getState().writes[0].id;
    await login("another-user", "another-token");
    fetchMock.mockClear();
    await expect(retrySavedWrite(id)).rejects.toThrow(/той самий акаунт/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useSavedWrites.getState().writes[0].userId).toBe(user.id);
  });

  it("journals queued writes immediately and preserves save/undo order for one title", async () => {
    await login();
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const save = createSavedRemote(user.id, film);
    const undo = removeSavedRemote(user.id, film, film.title);
    expect(useSavedWrites.getState().writes).toHaveLength(1);
    expect(useSavedWrites.getState().writes[0].operation.kind).toBe("remove");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    resolve(response());
    await Promise.all([save, undo]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "POST",
      "DELETE",
    ]);
    expect(useSavedWrites.getState().writes).toEqual([]);
  });

  it("supports refreshing expired DELETE and PATCH requests as well", async () => {
    await login();
    vi.mocked(webApi.post).mockResolvedValue({
      status: 200,
      data: { user, accessToken: "fresh-token" },
    });
    fetchMock.mockImplementation(async (_url, init) =>
      new Headers(init?.headers).get("authorization") === "Bearer fresh-token"
        ? new Response(null, { status: 204 })
        : response({}, 401),
    );
    await act(async () => {
      await Promise.all([
        removeSavedRemote(user.id, film, film.title),
        patchSavedStatsRemote(
          user.id,
          { ...film, tmdbId: 12, userRating: 9 },
          "Інший фільм",
        ),
      ]);
    });
    expect(useSavedWrites.getState().writes).toEqual([]);
  });

  it("does not treat a malformed list response as an empty library", async () => {
    await login();
    fetchMock.mockResolvedValue(response({}));
    await expect(fetchSavedRemote(user.id)).rejects.toThrow(/завантажити/);
  });
  it("keeps concurrent optimistic titles until all writes settle, then removes a failed phantom", async () => {
    await login();
    const confirmed: unknown[] = [];
    const finish = new Map<number, (value: Response) => void>();
    fetchMock.mockImplementation(async (_url, init) => {
      if (init?.method === "GET") return response({ items: confirmed });
      const payload = JSON.parse(init?.body as string);
      return new Promise((resolve) => finish.set(payload.tmdbId, resolve));
    });
    const { result } = renderHook(
      () => ({ first: useSavedReleases(), second: useSavedReleases() }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={webQueryClient}>
            {children}
          </QueryClientProvider>
        ),
      },
    );
    await waitFor(() => expect(result.current.first.isReady).toBe(true));
    const release = {
      title: film.title,
      type: "movie" as const,
      nextRelease: "",
      source: "tmdb" as const,
      status: "released" as const,
    };
    act(() => {
      result.current.first.addRelease(
        release,
        { tmdbId: film.tmdbId, mediaType: "movie" },
        ["watchlist"],
      );
      result.current.second.addRelease(
        { ...release, title: "Другий фільм" },
        { tmdbId: 12, mediaType: "movie" },
        ["watchlist"],
      );
    });
    await waitFor(() => expect(finish.size).toBe(2));
    expect(result.current.first.savedCount).toBe(2);
    confirmed.push({
      ...release,
      tmdbId: film.tmdbId,
      mediaType: "movie",
      listTypes: ["watchlist"],
    });
    await act(async () => {
      finish.get(film.tmdbId)!(response());
    });
    expect(result.current.second.savedCount).toBe(2);
    await act(async () => {
      finish.get(12)!(response({}, 503));
    });
    await waitFor(() => expect(result.current.first.savedCount).toBe(1));
    expect(result.current.second.saved[0].title).toBe("Мідорі");
    expect(useSavedWrites.getState().writes[0]).toMatchObject({
      title: "Другий фільм",
      status: "error",
    });
  });
});
