const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
const { ApiError } = load("src/shared/api/errors.ts");
const create = (fetch) =>
  load(
    "src/shared/api/client.ts",
    {
      "../utils/config": { getBackendURL: () => "https://api.test" },
      "./errors": { ApiError },
    },
    { fetch },
  );
test("concurrent 401s rotate the token only once and retry with the new token", async () => {
  let rotations = 0;
  let token = "old";
  const client = create(
    async (_, options) =>
      new Response(JSON.stringify({ ok: true }), {
        status: options.headers.Authorization === "Bearer old" ? 401 : 200,
        headers: { "content-type": "application/json" },
      }),
  );
  client.configureApiAuth({
    getAccessToken: () => token,
    refresh: async () => {
      rotations++;
      await new Promise((r) => setTimeout(r, 10));
      token = "new";
      return true;
    },
    onUnauthorized: () => assert.fail("should not sign out"),
  });
  const values = await Promise.all([
    client.apiRequest("/me", { auth: true }),
    client.apiRequest("/saved", { auth: true }),
  ]);
  assert.equal(rotations, 1);
  assert.equal(values[0].ok, true);
  assert.equal(values[1].ok, true);
});
test("network failure during refresh does not sign the user out", async () => {
  let cleared = false;
  const client = create(async () => new Response("{}", { status: 401 }));
  client.configureApiAuth({
    getAccessToken: () => "expired",
    refresh: async () => {
      throw new Error("offline");
    },
    onUnauthorized: () => {
      cleared = true;
    },
  });
  await assert.rejects(client.apiRequest("/me", { auth: true }), /offline/);
  assert.equal(cleared, false);
});
test("already cancelled requests never hit the network", async () => {
  const client = create(() => assert.fail("must not fetch"));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    client.apiRequest("/world", { signal: controller.signal }),
    { name: "AbortError" },
  );
});
test("failed writes reject instead of looking successful", async () => {
  const client = create(
    async () =>
      new Response(JSON.stringify({ error: "unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
  );
  await assert.rejects(
    client.apiRequest("/saved", { method: "POST", body: {} }),
    (e) => e.status === 503 && e.message === "unavailable",
  );
});
test("DELETE accepts 204 without attempting JSON parsing", async () => {
  const client = create(async () => new Response(null, { status: 204 }));
  assert.equal(await client.apiRequest("/me", { method: "DELETE" }), undefined);
});
