import { afterEach, describe, expect, it, vi } from "vitest";
import { searchByPhrase } from "./vibeApi";

const { requestApi } = vi.hoisted(() => ({ requestApi: vi.fn() }));
vi.mock("../../../shared/api/http", () => ({ requestApi }));

afterEach(() => requestApi.mockReset());

describe("searchByPhrase", () => {
  // Go marshals a nil slice as `null`, and the chip panel reads the lists
  // straight off the plan — one null and the whole panel throws.
  it("turns a null list into an empty one", async () => {
    requestApi.mockResolvedValue({
      ok: true,
      payload: {
        plan: { themes: ["erotica"], genres: null, source: "ai" },
        labels: null,
        results: null,
        page: 1,
        hasMore: false,
        reranked: false,
        broadened: false,
        source: "ai",
      },
    });

    const response = await searchByPhrase("щось еротичне");

    expect(response.plan.genres).toEqual([]);
    expect(response.plan.themes).toEqual(["erotica"]);
    expect(response.labels).toEqual([]);
    expect(response.results).toEqual([]);
  });

  it("leaves a well-formed answer alone", async () => {
    const plan = { themes: ["gore"], genres: ["horror"], source: "ai" };
    requestApi.mockResolvedValue({
      ok: true,
      payload: {
        plan,
        labels: [{ kind: "genre", id: "horror", label: "Жахи" }],
        results: [{ id: 1, title: "Сяйво", mediaType: "movie" }],
        page: 1,
        hasMore: true,
        reranked: true,
        broadened: false,
        source: "ai",
      },
    });

    const response = await searchByPhrase("жорстокі жахи");

    expect(response.plan).toEqual(plan);
    expect(response.results).toHaveLength(1);
    expect(response.hasMore).toBe(true);
  });
});
