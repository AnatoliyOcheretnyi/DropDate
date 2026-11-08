import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithAuth, useAuth } from "./auth";
import { webApi } from "../api/http";

vi.mock("next/navigation", () => ({ usePathname: () => "/world" }));
vi.mock("../api/http", () => ({ webApi: { post: vi.fn(), request: vi.fn() } }));
const user = {
  id: "u1",
  email: "viewer@example.com",
  username: "viewer",
  isSuperuser: false,
};
const payload = (accessToken: string) => ({
  status: 200,
  data: { user, accessToken },
});
const fetchMock = vi.fn<typeof fetch>();

async function signIn() {
  const { result } = renderHook(() => useAuth());
  vi.mocked(webApi.post).mockResolvedValueOnce(payload("expired-token"));
  await act(() => result.current.login("viewer@example.com", "test-password"));
  return result;
}

describe("authenticated discovery requests after session expiry", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.mocked(webApi.post).mockReset();
  });
  afterEach(async () => {
    const { result } = renderHook(() => useAuth());
    vi.mocked(webApi.post).mockResolvedValue({ status: 204, data: {} });
    await act(() => result.current.logout());
    vi.unstubAllGlobals();
  });

  it("refreshes once for simultaneous expired world/passport requests and returns films", async () => {
    const auth = await signIn();
    let resolveRefresh!: (value: ReturnType<typeof payload>) => void;
    vi.mocked(webApi.post).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    fetchMock.mockImplementation(async (_url, init) => {
      const token = new Headers(init?.headers).get("authorization");
      return token === "Bearer fresh-token"
        ? new Response(JSON.stringify({ items: [{ title: "Томіріс" }] }), {
            status: 200,
          })
        : new Response(
            JSON.stringify({ error: "Увійди для персональної добірки" }),
            { status: 401 },
          );
    });
    const requests = [
      fetchWithAuth("/api/world?country=KZ&mode=personal"),
      fetchWithAuth("/api/world/passport"),
    ];
    await act(async () => {
      await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf("function"));
      resolveRefresh(payload("fresh-token"));
      const responses = await Promise.all(requests);
      expect(responses.every((r) => r.status === 200)).toBe(true);
      expect((await responses[0].json()).items[0].title).toBe("Томіріс");
    });
    expect(
      vi
        .mocked(webApi.post)
        .mock.calls.filter(([url]) => url === "/api/auth/refresh"),
    ).toHaveLength(1);
    expect(auth.current.accessToken).toBe("fresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("clears an expired login if refresh is rejected, without retrying endlessly", async () => {
    const auth = await signIn();
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    vi.mocked(webApi.post).mockResolvedValue({ status: 401, data: {} });
    await act(async () =>
      expect((await fetchWithAuth("/api/world?mode=personal")).status).toBe(
        401,
      ),
    );
    expect(auth.current.user).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not refresh for upstream errors or retry a second 401", async () => {
    await signIn();
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 502 }));
    expect((await fetchWithAuth("/api/world?country=KZ")).status).toBe(502);
    expect(webApi.post).toHaveBeenCalledTimes(1); // login only
    fetchMock.mockImplementation(
      async () => new Response("{}", { status: 401 }),
    );
    vi.mocked(webApi.post).mockResolvedValue(payload("fresh-token"));
    await act(async () =>
      expect((await fetchWithAuth("/api/world?mode=personal")).status).toBe(
        401,
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
