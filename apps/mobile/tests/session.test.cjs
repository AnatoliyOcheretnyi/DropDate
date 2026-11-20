const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
function setup({ reject = false } = {}) {
  let legacy = "legacy-token";
  let secure = null;
  const session = load("src/shared/utils/secureSession.ts", {
    "react-native": { Platform: { OS: "ios" } },
    "expo-secure-store": {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
      getItemAsync: async () => secure,
      setItemAsync: async (_, token) => {
        if (reject) throw new Error("keychain locked");
        await new Promise((r) => setTimeout(r, 5));
        secure = token;
      },
      deleteItemAsync: async () => {
        secure = null;
      },
    },
    "./storage": {
      storageKeys: { refreshToken: "legacy" },
      storageGetString: () => legacy,
      storageDelete: () => {
        legacy = null;
      },
    },
  });
  return { session, legacy: () => legacy, secure: () => secure };
}
test("migrates an old refresh token to secure storage and removes plaintext", async () => {
  const s = setup();
  assert.equal(await s.session.readRefreshToken(), "legacy-token");
  assert.equal(s.secure(), "legacy-token");
  assert.equal(s.legacy(), null);
});
test("failed secure migration preserves the original token for retry", async () => {
  const s = setup({ reject: true });
  await assert.rejects(s.session.readRefreshToken(), /locked/);
  assert.equal(s.legacy(), "legacy-token");
});
test("sign-out wins over an in-flight secure token write", async () => {
  const s = setup();
  await Promise.all([
    s.session.writeRefreshToken("rotated"),
    s.session.writeRefreshToken(null),
  ]);
  assert.equal(s.secure(), null);
  assert.equal(s.legacy(), null);
});
