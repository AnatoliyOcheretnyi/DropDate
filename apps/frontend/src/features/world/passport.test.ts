import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithAuth } from "../../shared/state/auth";
import { isPassportMovie, loadWorldPassport } from "./passport";
import type { ListType } from "../../shared/types/releases";

vi.mock("../../shared/state/auth", () => ({ fetchWithAuth: vi.fn() }));
const fetchMock = vi.mocked(fetchWithAuth);
const page = (
  countries: Record<string, number>,
  nextOffset: number,
  missing = 0,
) =>
  new Response(
    JSON.stringify({ countries, totalWatched: 45, missing, nextOffset }),
  );

describe("complete cinema passport", () => {
  it("includes all four viewing lists and excludes interest lists and series", () => {
    for (const kind of [
      "favorite",
      "liked",
      "watched",
      "disliked",
    ] as ListType[]) {
      expect(isPassportMovie({ mediaType: "movie", listTypes: [kind] })).toBe(
        true,
      );
    }
    for (const kind of ["follow", "watchlist"] as ListType[]) {
      expect(isPassportMovie({ mediaType: "movie", listTypes: [kind] })).toBe(
        false,
      );
    }
    expect(
      isPassportMovie({ mediaType: "movie", listTypes: ["follow", "liked"] }),
    ).toBe(true);
    expect(isPassportMovie({ mediaType: "tv", listTypes: ["watched"] })).toBe(
      false,
    );
    expect(isPassportMovie({ mediaType: "movie", listTypes: [] })).toBe(false);
  });
  beforeEach(() => vi.resetAllMocks());
  it("loads every page automatically and combines co-production counts and missing metadata", async () => {
    fetchMock
      .mockResolvedValueOnce(page({ US: 18, JP: 3 }, 20))
      .mockResolvedValueOnce(page({ US: 10, KZ: 2 }, 40, 1))
      .mockResolvedValueOnce(page({ JP: 4 }, -1, 1));
    const signal = new AbortController().signal;
    await expect(loadWorldPassport(signal)).resolves.toEqual({
      countries: { US: 28, JP: 7, KZ: 2 },
      totalWatched: 45,
      missing: 2,
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/world/passport?offset=0",
      "/api/world/passport?offset=20",
      "/api/world/passport?offset=40",
    ]);
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.signal === signal),
    ).toBe(true);
  });
  it("does not publish incomplete statistics when a later page fails", async () => {
    fetchMock
      .mockResolvedValueOnce(page({ US: 18 }, 20))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(
      loadWorldPassport(new AbortController().signal),
    ).rejects.toThrow("Не вдалося завантажити кінопаспорт");
  });
  it("stops after cancellation instead of starting another page", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(async () => {
      controller.abort();
      return page({ US: 18 }, 20);
    });
    await expect(loadWorldPassport(controller.signal)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("rejects a repeated cursor instead of fetching forever or double-counting", async () => {
    fetchMock
      .mockResolvedValueOnce(page({ US: 18 }, 20))
      .mockResolvedValueOnce(page({ US: 10 }, 20));
    await expect(
      loadWorldPassport(new AbortController().signal),
    ).rejects.toThrow("весь кінопаспорт");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
