import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Suggestion } from "./release";
import type { ListType } from "../types/releases";
import { selectUnsaved, useUnsavedItems } from "./unsavedItems";

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

describe("selectUnsaved", () => {
  it("keeps only titles that are in no list", () => {
    const { items: kept } = selectUnsaved(
      items,
      (item) => lists[item.id] ?? [],
      new Set()
    );
    expect(kept).toEqual([items[2]]);
  });

  it("treats a subscription as a list", () => {
    const { items: kept } = selectUnsaved([items[1]], () => ["follow"], new Set());
    expect(kept).toEqual([]);
  });

  it("passes everything through for a signed-out user", () => {
    const { items: kept } = selectUnsaved(items, () => [], new Set());
    expect(kept).toEqual(items);
  });

  it("keeps a title that is already on screen even once it is in a list", () => {
    const { items: kept } = selectUnsaved(items, () => ["watchlist"], new Set(["tv:3"]));
    expect(kept).toEqual([items[2]]);
  });
});

describe("useUnsavedItems", () => {
  it("does not drop a title the user just saved", () => {
    let saved: Record<number, ListType[]> = { 3: [] };
    const getListTypes = (item: Suggestion) => saved[item.id] ?? [];

    const { result, rerender } = renderHook(
      (props: { getListTypes: (item: Suggestion) => ListType[] }) =>
        useUnsavedItems([items[2]], props.getListTypes),
      { initialProps: { getListTypes } }
    );
    expect(result.current.items).toEqual([items[2]]);

    // Saving it hands the hook a new lookup — the card must stay put.
    saved = { 3: ["watchlist"] };
    rerender({ getListTypes: (item: Suggestion) => saved[item.id] ?? [] });
    expect(result.current.items).toEqual([items[2]]);
  });

  it("keeps the title it admitted but drops one saved before it arrived", () => {
    const saved: Record<number, ListType[]> = {};
    const getListTypes = (item: Suggestion) => saved[item.id] ?? [];

    const { result, rerender } = renderHook(
      (props: { items: Suggestion[] }) => useUnsavedItems(props.items, getListTypes),
      { initialProps: { items: [items[2]] } }
    );
    expect(result.current.items).toEqual([items[2]]);

    // The user saves what is on screen, then pages in more. The admitted card
    // stays; a title that was already in a list before it arrived does not.
    saved[3] = ["watchlist"];
    saved[1] = ["watchlist"];
    rerender({ items: [items[2], items[0]] });
    expect(result.current.items).toEqual([items[2]]);
    expect(result.current.hiddenCount).toBe(1);
  });

  it("re-applies the rule from scratch on a new search", () => {
    const getListTypes = () => ["watchlist"] as ListType[];
    const { result, rerender } = renderHook(
      (props: { resetKey: string }) =>
        useUnsavedItems([items[2]], getListTypes, { resetKey: props.resetKey }),
      { initialProps: { resetKey: "жахи" } }
    );
    expect(result.current.items).toEqual([]);

    rerender({ resetKey: "комедії" });
    expect(result.current.items).toEqual([]);
  });

  it("filters nothing until the saved list has loaded", () => {
    const getListTypes = () => ["watchlist"] as ListType[];
    const { result, rerender } = renderHook(
      (props: { isReady: boolean }) =>
        useUnsavedItems(items, getListTypes, { isReady: props.isReady }),
      { initialProps: { isReady: false } }
    );
    expect(result.current.items).toEqual(items);

    rerender({ isReady: true });
    expect(result.current.items).toEqual([]);
  });
});
