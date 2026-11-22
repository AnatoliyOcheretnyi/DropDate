import { expect, test } from "@playwright/test";

test("charts retain their row while loading; personal collections replace individual cards", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const films = Array.from({ length: 10 }, (_, i) => ({
    id: 8100 + i,
    mediaType: "movie",
    title: `Добірка ${i + 1}`,
    year: "2024",
    reason: "Тобі подобається драма",
    posterUrl:
      "https://image.tmdb.org/t/p/w342/6iyVoBUayz0Qb7xWSqgLcyV7vmp.jpg",
  }));
  let saved = false;
  let refillRequests = 0;
  let finishChart!: () => void;
  let finishCollection!: () => void;
  const chartGate = new Promise<void>((resolve) => {
    finishChart = resolve;
  });
  const collectionGate = new Promise<void>((resolve) => {
    finishCollection = resolve;
  });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let json: unknown = {};
    if (url.pathname === "/api/auth/refresh")
      json = {
        accessToken: "rail-test",
        user: {
          id: "rail-test",
          username: "viewer",
          email: "viewer@example.com",
        },
      };
    else if (url.pathname === "/api/home/collection") {
      if (url.searchParams.get("kind") === "country") {
        if (saved) {
          refillRequests++;
          await collectionGate;
        }
        json = {
          items: saved
            ? [
                ...films.slice(1),
                { ...films[0], id: 8200, title: "Новий фільм" },
              ]
            : films,
          country: "RO",
          countryName: "Румунія",
        };
      } else json = { items: [] };
    } else if (url.pathname === "/api/trending") {
      await chartGate;
      json = { movies: [{ ...films[0], id: 8300, title: "Новий чарт" }] };
    } else if (url.pathname === "/api/popular") json = { movies: films };
    else if (
      url.pathname === "/api/saved" &&
      route.request().method() === "POST"
    ) {
      saved = true;
      json = {};
    } else if (url.pathname === "/api/saved")
      json = {
        items: saved
          ? [
              {
                ...films[0],
                tmdbId: films[0].id,
                type: "movie",
                source: "tmdb",
                status: "released",
                nextRelease: "",
                listTypes: ["watchlist"],
              },
            ]
          : [],
      };
    else if (url.pathname === "/api/details")
      json = {
        details: {
          ...films[0],
          genres: [],
          overview: "Тест плавного оновлення",
        },
      };
    else if (url.pathname === "/api/taste/onboarding")
      json = { completed: true, stage: "completed" };
    else if (url.pathname === "/api/new-releases")
      json = { movies: [], series: [], anime: [] };
    else if (url.pathname === "/api/notifications")
      json = { items: [], unreadCount: 0 };
    else if (url.pathname === "/api/health") json = { status: "ok" };
    else json = { items: [], results: [] };
    await route.fulfill({ json });
  });
  await page.goto("/");
  const chart = page.locator(".top-ten");
  await expect(chart.locator(".top-ten__item").first()).toBeVisible();
  await chart
    .locator(".top-ten__head")
    .evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
  const oldCard = await chart.locator(".top-ten__item").first().elementHandle();
  const originalHeight = await chart.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  await chart.getByRole("button", { name: "Сьогодні", exact: true }).click();
  await expect(chart.getByRole("status")).toContainText("Оновлюємо");
  expect(await oldCard!.evaluate((el) => el.isConnected)).toBe(true);
  expect(
    await chart.evaluate((el) => el.getBoundingClientRect().height),
  ).toBeCloseTo(originalHeight, 0);
  finishChart();
  await expect(chart.locator(".top-ten__title")).toHaveText(["Новий чарт"]);

  const collection = page.locator(
    'section[aria-labelledby="collection-country"]',
  );
  const row = collection.locator(".home-collection__row--loaded");
  await collection.scrollIntoViewIfNeeded();
  await expect(row.locator("article")).toHaveCount(10);
  const survivingCard = await row
    .locator('[data-rail-key="movie:8101"]')
    .elementHandle();
  const rowHeight = await row.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  await collection
    .getByRole("button", { name: "Опис: Добірка 1", exact: true })
    .click();
  // Enter the stable preview before moving to its footer, keeping the hover
  // grace timer from closing it while Playwright waits for the entrance motion.
  if (!testInfo.project.use.isMobile) await page.getByRole("dialog").hover();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Хочу подивитись", exact: true })
    .click();
  await expect.poll(() => saved).toBe(true);
  await expect(row.locator('[data-rail-key="movie:8100"]')).toHaveCount(0);
  await expect(collection.locator(".home-collection__skeleton")).toHaveCount(0);
  expect(await survivingCard!.evaluate((el) => el.isConnected)).toBe(true);
  expect(
    await row.evaluate((el) => el.getBoundingClientRect().height),
  ).toBeCloseTo(rowHeight, 0);
  // The optimistic card removal precedes the acknowledged write and refetch.
  // Wait for that request explicitly before releasing the response gate.
  await expect.poll(() => refillRequests, { timeout: 20_000 }).toBeGreaterThan(0);
  finishCollection();
  await expect(
    collection.getByText("Новий фільм", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  expect(await survivingCard!.evaluate((el) => el.isConnected)).toBe(true);
  await collection.screenshot({
    path: testInfo.outputPath("updated-collection.png"),
  });
});
