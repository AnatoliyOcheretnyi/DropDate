const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
function setup() {
  let token = "old";
  let requests = 0;
  let resolve;
  const response = new Promise((r) => {
    resolve = r;
  });
  const { useAuthStore } = load("src/features/auth/store/authStore.ts", {
    "../../../shared/utils/secureSession": {
      readRefreshToken: async () => token,
      writeRefreshToken: async (next) => {
        token = next;
      },
    },
    "../../../shared/api/client": {
      configureApiAuth: () => {},
      apiRequest: async (path) => {
        if (path === "/auth/refresh") {
          requests++;
          return response;
        }
      },
    },
    "../../../shared/api/errors": { ApiError: class extends Error {} },
    "../../../shared/api/queryClient": {
      clearUserSessionCache: async () => {},
    },
    "../../../shared/utils/storage": {
      storageDelete: () => {},
      storageGetString: () => null,
      storageSetString: () => {},
      storageKeys: {},
    },
    "../../profile/store/tasteStore": { clearTasteSession: () => {} },
  });
  useAuthStore.setState({
    refreshToken: token,
    user: { id: "one", email: "test@example.test" },
  });
  return {
    store: useAuthStore,
    requests: () => requests,
    token: () => token,
    resolve: () =>
      resolve({
        accessToken: "access",
        refreshToken: "rotated",
        user: { id: "one", email: "test@example.test" },
      }),
  };
}
test("foreground and API refresh share one token rotation", async () => {
  const s = setup();
  const first = s.store.getState().refresh();
  const second = s.store.getState().refresh();
  assert.equal(first, second);
  assert.equal(s.requests(), 1);
  s.resolve();
  assert.equal(await first, true);
  assert.equal(s.token(), "rotated");
});
test("late refresh response cannot restore a signed-out account", async () => {
  const s = setup();
  const pending = s.store.getState().refresh();
  await s.store.getState().logout();
  s.resolve();
  assert.equal(await pending, false);
  assert.equal(s.store.getState().user, null);
  assert.equal(s.token(), null);
});
