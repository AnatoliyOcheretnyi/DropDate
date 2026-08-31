import { describe, expect, it } from "vitest";
import tmdbImageLoader from "./tmdbImageLoader";

const poster = "https://image.tmdb.org/t/p/w342/6BRshOK03BnxTedpAhZl2yZBLTY.jpg";

describe("tmdbImageLoader", () => {
  it("rewrites the width bucket to the smallest one that covers the request", () => {
    expect(tmdbImageLoader({ src: poster, width: 150 })).toBe(
      "https://image.tmdb.org/t/p/w154/6BRshOK03BnxTedpAhZl2yZBLTY.jpg"
    );
    expect(tmdbImageLoader({ src: poster, width: 342 })).toBe(
      "https://image.tmdb.org/t/p/w342/6BRshOK03BnxTedpAhZl2yZBLTY.jpg"
    );
  });

  it("caps oversized requests at w780 instead of falling back to original", () => {
    expect(tmdbImageLoader({ src: poster, width: 1920 })).toBe(
      "https://image.tmdb.org/t/p/w780/6BRshOK03BnxTedpAhZl2yZBLTY.jpg"
    );
  });

  it("leaves local assets untouched", () => {
    expect(tmdbImageLoader({ src: "/logo.png", width: 64 })).toBe("/logo.png");
  });

  it("leaves a TMDB url it cannot parse untouched", () => {
    expect(tmdbImageLoader({ src: "https://image.tmdb.org/t/p/w342", width: 64 })).toBe(
      "https://image.tmdb.org/t/p/w342"
    );
  });
});
