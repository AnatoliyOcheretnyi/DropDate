const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
const create = (request) =>
  load("src/features/world/api/world.ts", {
    "../../../shared/api/client": { apiRequest: request },
  });
test("passport accumulates all pages before returning", async () => {
  const seen = [];
  const world = create(async (path) => {
    seen.push(path);
    return seen.length === 1
      ? { countries: { UA: 2 }, totalWatched: 4, missing: 1, nextOffset: 2 }
      : {
          countries: { UA: 1, JP: 2 },
          totalWatched: 4,
          missing: 0,
          nextOffset: -1,
        };
  });
  const value = await world.getWorldPassport();
  assert.equal(value.countries.UA, 3);
  assert.equal(value.countries.JP, 2);
  assert.equal(value.missing, 1);
  assert.equal(seen.length, 2);
});
test("malformed passport pagination cannot loop forever", async () => {
  const world = create(async () => ({
    countries: {},
    totalWatched: 50,
    missing: 0,
    nextOffset: 0,
  }));
  await assert.rejects(world.getWorldPassport(), /кінопаспорт/);
});
test("world filters, services and cancellation are passed to the API", async () => {
  const signal = new AbortController().signal;
  const world = create(async (path, options) => {
    const url = new URL(path, "https://test");
    assert.equal(url.searchParams.get("providers"), "8,9");
    assert.equal(url.searchParams.get("hideWatched"), "1");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("intent"), "теплий вечір");
    assert.equal(options.signal, signal);
    return { items: [] };
  });
  await world.getWorld(
    {
      country: "UA",
      mode: "gems",
      genre: "18",
      decade: "1990",
      runtime: "90",
      hideWatched: true,
      providers: [8, 9],
      region: "PL",
      intent: "теплий вечір",
    },
    2,
    signal,
  );
});
test("three-night route picks distinct popular, acclaimed and lesser-known titles", () => {
  const world = create();
  const items = [
    { tmdbId: 1, voteCount: 100, rating: 7 },
    { tmdbId: 2, voteCount: 50, rating: 9 },
    { tmdbId: 3, voteCount: 10, rating: 6 },
    { tmdbId: 1, voteCount: 100, rating: 7 },
  ];
  assert.equal(
    JSON.stringify(world.makeFilmRoute(items).map((i) => i.tmdbId)),
    "[1,2,3]",
  );
  assert.equal(world.makeFilmRoute(items.slice(0, 2)).length, 0);
});
