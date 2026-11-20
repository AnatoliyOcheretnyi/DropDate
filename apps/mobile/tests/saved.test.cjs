const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
function setup(raw) {
  let disk = raw;
  const { useSavedStore } = load("src/features/saved/store/savedStore.ts", {
    "../../../shared/utils/storage": {
      storageKeys: { guestSaved: "saved" },
      storageGetString: () => disk,
      storageSetString: (_, value) => {
        disk = value;
      },
    },
  });
  return { store: useSavedStore, disk: () => JSON.parse(disk) };
}
test("guest storage tolerates invalid persisted data", () => {
  for (const raw of ["invalid", "{}", '[null, {}, {"id":"tv:1"}]']) {
    assert.equal(setup(raw).store.getState().saved.length, 0);
  }
});
test("guest lists survive reload and removing the last membership removes the title", async () => {
  const s = setup("[]");
  const item = { id: 42, mediaType: "movie", title: "Test" };
  await s.store
    .getState()
    .addRelease({ title: item.title }, { tmdbId: 42, mediaType: "movie" }, [
      "follow",
      "watched",
    ]);
  const reloaded = setup(JSON.stringify(s.disk()));
  assert.equal(reloaded.store.getState().saved[0].listTypes.length, 2);
  await reloaded.store.getState().setListTypes(item, []);
  assert.equal(reloaded.store.getState().saved.length, 0);
  assert.equal(reloaded.disk().length, 0);
});
test("reading guest lists has stable identity and never rewrites the store", () => {
  const s = setup("[]");
  const first = s.store.getState().saved;
  let writes = 0;
  s.store.subscribe(() => writes++);
  for (let i = 0; i < 100; i++) assert.equal(s.store.getState().saved, first);
  assert.equal(writes, 0);
});
