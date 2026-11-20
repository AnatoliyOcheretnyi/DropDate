import { expect, test } from "@playwright/test";

test("people load automatically after token expiry and a temporary server failure", async ({
  page,
}, testInfo) => {
  let refreshes = 0;
  let attempts = 0;
  let finish!: () => void;
  const ready = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = { items: [], results: [] };
    if (path === "/api/auth/refresh") {
      refreshes++;
      json = {
        accessToken: refreshes === 1 ? "expired" : "renewed",
        user: {
          id: "people-loading",
          email: "viewer@example.com",
          username: "viewer",
        },
      };
    } else if (path === "/api/people/follows") {
      attempts++;
      if (route.request().headers().authorization === "Bearer expired") {
        await route.fulfill({ status: 401, json: { message: "expired" } });
        return;
      }
      if (attempts === 2) {
        await route.fulfill({
          status: 503,
          json: { message: "temporarily unavailable" },
        });
        return;
      }
      await ready;
      json = { items: [{ personId: 287, name: "Бред Пітт", role: "actor" }] };
    } else if (path === "/api/notifications")
      json = { items: [], unreadCount: 0 };
    else if (path === "/api/health") json = { status: "ok" };
    await route.fulfill({ json });
  });
  await page.goto("/saved");
  await page.getByRole("tab", { name: /Люди/ }).click();
  const section = page.locator(".people-section");
  await expect(section.getByRole("status")).toContainText(
    "Завантажуємо твоїх людей",
  );
  await expect(section.getByText("Ти ще ні за ким не стежиш")).toHaveCount(0);
  await expect.poll(() => attempts).toBeGreaterThanOrEqual(3);
  expect(refreshes).toBe(2);
  finish();
  await expect(
    section.getByRole("link", { name: "Відкрити: Бред Пітт" }),
  ).toBeVisible();
  await expect(section.locator(".person-card--loading")).toHaveCount(0);
  await expect(section.getByRole("status")).toBeEmpty();
  await section.screenshot({ path: testInfo.outputPath("people-loaded.png") });
});
