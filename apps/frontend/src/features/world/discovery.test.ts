import { describe, it, expect } from "vitest";
import { makeFilmRoute } from "./discovery";
import type { WorldItem } from "./types";
import countries from "./countries.json";
import geometry from "../../../public/data/world-countries.json";
const movie = (id: number, rating: number, votes: number): WorldItem => ({
  tmdbId: id,
  mediaType: "movie",
  title: String(id),
  reason: "",
  rating,
  voteCount: votes,
});
describe("film routes", () => {
  it("builds three distinct steps from popularity, quality, and discovery", () => {
    const route = makeFilmRoute([
      movie(1, 7, 1000),
      movie(2, 9, 400),
      movie(3, 8, 20),
      movie(1, 7, 1000),
    ]);
    expect(route.map((i) => i.tmdbId)).toEqual([1, 2, 3]);
  });
  it("does not promise a route when fewer than three films exist", () =>
    expect(makeFilmRoute([movie(1, 9, 100)])).toEqual([]));
});
describe("world geography", () => {
  it("has unique ISO keys and finite camera coordinates", () => {
    expect(new Set(countries.map((c) => c.code)).size).toBe(countries.length);
    expect(
      countries.every((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)),
    ).toBe(true);
  });
  it("keeps the Crimean peninsula in Ukraine's geometry", () => {
    const ukraine = geometry.features.find((f) => f.properties.code === "UA")!;
    const russia = geometry.features.find((f) => f.properties.code === "RU")!;
    const crimea = (ring: number[][]) =>
      ring.every(([lng, lat]) => lng > 32 && lng < 37 && lat > 44 && lat < 47);
    const ua = ukraine.geometry.coordinates as number[][][][];
    const ru = russia.geometry.coordinates as number[][][][];
    expect(ua.some((p) => crimea(p[0]))).toBe(true);
    expect(ru.some((p) => crimea(p[0]))).toBe(false);
  });
});
