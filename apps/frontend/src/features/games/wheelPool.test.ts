import { describe, expect, it } from "vitest";
import type { SavedRelease } from "../../shared/types/releases";
import { defaultWheelFilters, wheelPool } from "./wheelPool";

const saved: SavedRelease[] = Array.from({ length: 45 }, (_, i) => ({ id: `movie:${i + 1}`, tmdbId: i + 1, title: `Фільм ${i + 1}`, type: "movie", mediaType: "movie", listTypes: ["watchlist"], nextRelease: "", source: "tmdb", status: "released", runtimeMinutes: i % 2 ? 120 : 90, genres: [i % 2 ? "Драма" : "Комедія"] }));
const series: SavedRelease = { ...saved[0], id: "tv:1", mediaType: "tv", type: "series", title: "Серіал", runtimeMinutes: undefined, status: "upcoming" };
describe("evening wheel pool", () => {
  it("includes the full watchlist without a cap, preserving film and TV IDs separately", () => {
    expect(wheelPool([...saved, series, saved[0], { ...saved[1], tmdbId: 100, listTypes: ["favorite"] }], defaultWheelFilters)).toHaveLength(46);
  });
  it("combines type, genre, runtime, release and title filters", () => {
    const filters = { ...defaultWheelFilters, series: false, genre: "Комедія", maxRuntime: 90, query: "фІлЬм 1", releasedOnly: true };
    expect(wheelPool([...saved, series], filters).map(item => item.tmdbId)).toEqual([1, 11, 13, 15, 17, 19]);
    expect(wheelPool([series], { ...defaultWheelFilters, maxRuntime: 90 })).toEqual([]);
    expect(wheelPool(saved, { ...defaultWheelFilters, movies: false, series: false })).toEqual([]);
  });
});
