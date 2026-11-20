import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const items = Array.from({ length: 40 }, (_, i) => ({
    tmdbId: i + 1,
    mediaType: "movie",
    title: `Фільм ${i + 1}`,
    type: "movie",
    nextRelease: `${i % 2 ? "1998" : "2022"}-06-01T00:00:00Z`,
    status: "released",
    source: "tmdb",
    listTypes: ["watchlist"],
    genres: [i % 2 ? "Драма" : "Трилер"],
  }));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json =
      path === "/api/auth/refresh"
        ? {
            accessToken: "test-token",
            user: {
              id: "test-viewer",
              email: "viewer@example.com",
              username: "viewer",
            },
          }
        : path === "/api/saved"
          ? { items }
          : path === "/api/people/follows"
            ? { items: [{ personId: 287, name: "Бред Пітт", role: "actor" }] }
            : path === "/api/suggest"
              ? {
                  results: [
                    { id: 1, mediaType: "movie", title: "Tank", year: "1990" },
                  ],
                }
              : path === "/api/notifications"
                ? { items: [], unreadCount: 0 }
                : {};
    await route.fulfill({ json });
  });
});

test("library controls shrink without moving the grid; back-to-top restores the full panel", async ({
  page,
}, testInfo) => {
  await page.goto("/saved");
  const panel = page.locator(".saved-panel");
  await expect(page.locator(".saved-grid")).toBeVisible();
  const originalHeight = await panel.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  const gridTop = await page.locator(".saved-grid").evaluate((el) => {
    let top = 0;
    for (
      let current = el as HTMLElement | null;
      current;
      current = current.offsetParent as HTMLElement | null
    ) {
      top += current.offsetTop;
    }
    return top;
  });
  await page.mouse.wheel(0, 1100);
  await expect(panel).toHaveClass(/saved-panel--compact/);
  const compactHeight = await panel.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  expect(compactHeight).toBeLessThan(originalHeight / 2);
  const currentGridTop = await page.locator(".saved-grid").evaluate((el) => {
    let top = 0;
    for (
      let current = el as HTMLElement | null;
      current;
      current = current.offsetParent as HTMLElement | null
    ) {
      top += current.offsetTop;
    }
    return top;
  });
  expect(Math.abs(currentGridTop - gridTop)).toBeLessThan(3);
  await page.screenshot({ path: testInfo.outputPath("compact-library.png") });
  await page.getByRole("button", { name: "Фільтри", exact: true }).click();
  await expect(panel).not.toHaveClass(/saved-panel--compact/);
  await expect(panel.getByRole("tab", { name: /Усі/ })).toBeVisible();
  await page.getByRole("button", { name: "Згорнути", exact: true }).click();
  await page.getByRole("button", { name: "Повернутися догори" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await expect(panel).not.toHaveClass(/saved-panel--compact/);
  await expect(
    page.getByRole("button", { name: "Повернутися догори" }),
  ).toHaveCount(0);
});

test("people cards open details and search suggestions are plain clickable results", async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto("/saved");
  await page.getByRole("tab", { name: /Люди/ }).click();
  const person = page.getByRole("link", { name: "Відкрити: Бред Пітт" });
  await expect(person).toHaveAttribute("href", "/person/287");
  await expect(person.getByRole("button")).toHaveCount(0);
  await person.click();
  await expect(page).toHaveURL(/\/person\/287$/);
  await page.goto("/saved");
  if (isMobile) {
    await page
      .getByRole("navigation", { name: "Мобільна навігація" })
      .getByRole("button", { name: "Пошук" })
      .click();
    await page.getByRole("dialog").getByRole("textbox").fill("Tank");
  } else {
    await page.locator(".header-search input").fill("Tank");
  }
  const suggestions = page.locator(".suggestions");
  await expect(suggestions.getByRole("button", { name: /Tank/ })).toBeVisible();
  await expect(suggestions.locator(".card-info-btn")).toHaveCount(0);
  await expect(suggestions.getByRole("button")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("plain-search.png") });
  await suggestions.getByRole("button", { name: /Tank/ }).click();
  await expect(page).toHaveURL(/\/title\/movie\/1$/);
});
