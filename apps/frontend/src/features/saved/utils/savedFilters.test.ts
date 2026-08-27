import { describe, expect, it } from "vitest";
import type { SavedRelease } from "../../../shared/types/releases";
import {
  collectGenreFacets,
  countByList,
  defaultSortFor,
  filterSavedItems,
  selectTabItems,
  sortSavedItems,
} from "./savedFilters";

const title = (overrides: Partial<SavedRelease>): SavedRelease => ({
  id: overrides.title ?? "id",
  title: "Тайтл",
  type: "movie",
  nextRelease: "",
  source: "tmdb",
  status: "upcoming",
  ...overrides,
});

const dune = title({
  title: "Дюна",
  listTypes: ["follow", "watchlist"],
  genres: ["Фантастика", "Драма"],
  userRating: 9,
  tmdbRating: 8.1,
  createdAt: "2026-08-01T10:00:00Z",
  nextRelease: "2026-12-18T00:00:00Z",
});
const severance = title({
  title: "Розділення",
  listTypes: ["follow", "favorite"],
  genres: ["Трилер", "Драма"],
  tmdbRating: 8.7,
  createdAt: "2026-08-20T10:00:00Z",
  nextRelease: "2026-03-12T00:00:00Z",
});
const penguin = title({
  title: "Пінгвін",
  listTypes: ["watched"],
  genres: ["Кримінал"],
  userRating: 8,
  createdAt: "2026-07-04T10:00:00Z",
});
const library = [dune, severance, penguin];

describe("selectTabItems", () => {
  it("returns every title once on the union tab", () => {
    // Дюна and Розділення each sit in two lists — the union must not duplicate.
    expect(selectTabItems(library, "all")).toHaveLength(3);
  });

  it("filters by a single list otherwise", () => {
    expect(selectTabItems(library, "follow")).toEqual([dune, severance]);
  });
});

describe("countByList", () => {
  it("counts the union as the library size, not the sum of the lists", () => {
    const counts = countByList(library);
    expect(counts.all).toBe(3);
    expect(counts.follow).toBe(2);
    expect(counts.watchlist).toBe(1);
    expect(counts.favorite + counts.watched).toBe(2);
  });
});

describe("collectGenreFacets", () => {
  it("counts genres inside the given list, most common first", () => {
    expect(collectGenreFacets(library)).toEqual([
      { genre: "Драма", count: 2 },
      { genre: "Кримінал", count: 1 },
      { genre: "Трилер", count: 1 },
      { genre: "Фантастика", count: 1 },
    ]);
  });

  it("is empty when nothing carries genres yet", () => {
    expect(collectGenreFacets([title({ title: "Без жанрів" })])).toEqual([]);
  });
});

describe("filterSavedItems", () => {
  it("combines genres with OR", () => {
    expect(filterSavedItems(library, ["Фантастика", "Кримінал"], "")).toEqual([
      dune,
      penguin,
    ]);
  });

  it("matches the search query against the title", () => {
    expect(filterSavedItems(library, [], "дюн")).toEqual([dune]);
  });

  it("applies genre and query together", () => {
    expect(filterSavedItems(library, ["Драма"], "розділ")).toEqual([severance]);
  });
});

describe("sortSavedItems", () => {
  it("sorts by my rating and pushes unrated titles to the end", () => {
    expect(sortSavedItems(library, "userRating", "desc")).toEqual([
      dune,
      penguin,
      severance,
    ]);
  });

  it("keeps unrated titles at the end when the direction flips", () => {
    expect(sortSavedItems(library, "userRating", "asc")).toEqual([
      penguin,
      dune,
      severance,
    ]);
  });

  it("sorts by the TMDB rating independently of my own", () => {
    expect(sortSavedItems(library, "tmdbRating", "desc")).toEqual([
      severance,
      dune,
      penguin,
    ]);
  });

  it("puts the nearest release first and dateless titles last", () => {
    expect(sortSavedItems(library, "release", "asc")).toEqual([
      severance,
      dune,
      penguin,
    ]);
  });

  it("sorts recently added first", () => {
    expect(sortSavedItems(library, "added", "desc")).toEqual([
      severance,
      dune,
      penguin,
    ]);
  });

  it("sorts alphabetically with Ukrainian collation", () => {
    expect(sortSavedItems(library, "alpha", "asc").map((item) => item.title)).toEqual([
      "Дюна",
      "Пінгвін",
      "Розділення",
    ]);
  });
});

describe("defaultSortFor", () => {
  it("orders subscriptions by release date and everything else by recency", () => {
    expect(defaultSortFor("follow")).toBe("release");
    expect(defaultSortFor("all")).toBe("added");
    expect(defaultSortFor("favorite")).toBe("added");
  });
});
