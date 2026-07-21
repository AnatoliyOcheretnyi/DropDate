import { expect, test } from "@playwright/test";

test("home renders the primary experience", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/DropDate/);
  await expect(page.locator("main")).toBeVisible();
});

test("changelog exposes the current web release", async ({ page }) => {
  await page.goto("/changelog");
  await expect(page.getByText("1.12.0", { exact: false }).first()).toBeVisible();
});

test("unknown routes have a useful recovery link", async ({ page }) => {
  await page.goto("/definitely-not-a-dropdate-page");
  await expect(page.getByRole("link", { name: /головн/i })).toBeVisible();
});

test("pages ship baseline security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});
