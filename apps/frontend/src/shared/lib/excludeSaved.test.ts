import { describe, expect, it } from "vitest";
import type { Suggestion } from "./release";
import type { ListType } from "../types/releases";
import { excludeSaved } from "./excludeSaved";

const items: Suggestion[] = [
  { id: 1, title: "Дюна", mediaType: "movie" },
  { id: 2, title: "Розділення", mediaType: "tv" },
  { id: 3, title: "Пінгвін", mediaType: "tv" },
];

const lists: Record<number, ListType[]> = {
  1: ["watchlist"],
  2: ["follow"],
  3: [],
};

describe("excludeSaved", () => {
  it("keeps only titles that are in no list", () => {
    expect(
      excludeSaved(items, (item) => lists[item.id] ?? [])
    ).toEqual([items[2]]);
  });

  it("treats a subscription as a list", () => {
    // `follow` is still a list the user put the title in.
    expect(excludeSaved([items[1]], () => ["follow"])).toEqual([]);
  });

  it("passes everything through for a signed-out user", () => {
    expect(excludeSaved(items, () => [])).toEqual(items);
  });
});
