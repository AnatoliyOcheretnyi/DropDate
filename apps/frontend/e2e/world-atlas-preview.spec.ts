import { expect, test } from "@playwright/test";

const posters = (country: string) =>
  Array.from({ length: country === "RU" ? 24 : 12 }, (_, index) => ({
    tmdbId: 100 + index,
    mediaType: "movie",
    title: `${country} — Історія ${index + 1}`,
    year: "2024",
    rating: 8.2,
    posterUrl: `https://image.tmdb.org/t/p/w342/${country}-${index}.jpg`,
    country,
    reason: "Кіно країни",
  }));

test("country selection keeps the poster globe and opens films only on request", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let fullRequests = 0;
  let atlasRequests = 0;
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.route("https://image.tmdb.org/**", async (route) => {
    const index = Number(
      route
        .request()
        .url()
        .match(/-(\d+)\.jpg/)?.[1] ?? 0,
    );
    const color = ["#9c2636", "#234b62", "#b78c42", "#3d526a", "#69794b"][
      index % 5
    ];
    await route.fulfill({
      contentType: "image/svg+xml",
      headers: { "access-control-allow-origin": "*" },
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><rect width="342" height="513" fill="${color}"/><circle cx="170" cy="190" r="115" fill="#f5ca91"/><path d="M0 420L200 210L342 400V513H0Z" fill="#122230"/><text x="25" y="470" fill="white" font-size="35">CINEMA ${index + 1}</text></svg>`,
    });
  });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let json: unknown = { items: [], results: [] };
    if (url.pathname === "/api/auth/refresh") {
      await route.fulfill({ status: 401, json: {} });
      return;
    }
    if (url.pathname === "/api/world") {
      expect(url.searchParams.has("preview")).toBe(false);
      fullRequests++;
      const country = url.searchParams.get("country") ?? "UA";
      json = {
        items: posters(country).slice(0, 3),
        aiUsed: false,
        exhausted: false,
        partial: false,
      };
    }
    if (url.pathname === "/api/world/atlas") {
      atlasRequests++;
      json = {
        complete: true,
        countries: Object.fromEntries(
          ["UA", "JP", "RU", "US", "CA", "CN", "AU", "FR", "CH", "CL"].map(
            (code) => [code, { posters: posters(code) }],
          ),
        ),
      };
    }
    await route.fulfill({ json });
  });
  await page.goto("/world?country=RU&view=globe");
  const atlas = page.locator(".world-pane--atlas");
  const preview = page.locator(".world-preview");
  await expect(preview.getByRole("link")).toHaveCount(3);
  await expect(atlas.locator("canvas")).toBeVisible();
  await expect(page.locator(".world-globe")).toHaveAttribute(
    "data-selected-posters",
    "24",
    { timeout: 20_000 },
  );
  // Development StrictMode may abort and remount the initial query. Changing
  // countries and returning from the films view must reuse the loaded catalog.
  const initialAtlasRequests = atlasRequests;
  if (!process.env.CI) await page.screenshot({
    path: testInfo.outputPath("large-country-mosaic.png"),
    fullPage: true,
  });
  if (testInfo.project.name === "chromium") {
    const canvas = await atlas.locator("canvas").boundingBox();
    await page.mouse.move(
      canvas!.x + canvas!.width / 2,
      canvas!.y + canvas!.height / 2,
    );
    await expect(page.locator(".world-globe")).toHaveAttribute(
      "data-hover-country",
      "RU",
    );
    if (!process.env.CI) await page.screenshot({
      path: testInfo.outputPath("large-country-hover.png"),
      fullPage: true,
    });
    await page.mouse.move(0, 0);
    await expect(page.locator(".world-globe")).toHaveAttribute(
      "data-hover-country",
      "",
    );
  }
  const originalCanvas = await atlas.locator("canvas").elementHandle();
  expect(fullRequests).toBe(0);
  expect(await atlas.evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByRole("searchbox", { name: "Знайти країну" }).fill("Японія");
  await page.locator(".world-country-matches").getByRole("button").click();
  await expect(page).toHaveURL(/country=JP.*view=globe/, { timeout: 20_000 });
  await expect(preview.getByRole("link").first()).toContainText(
    "JP — Історія 1",
  );
  await expect(preview).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".world-globe")).toHaveAttribute(
    "data-selected-posters",
    "2",
  );
  expect(await originalCanvas!.evaluate((el) => el.isConnected)).toBe(true);
  expect(fullRequests).toBe(0);
  await expect(preview.getByRole("link").first()).toHaveAttribute(
    "href",
    "/title/movie/100",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".world-preview__films")).toHaveCSS(
    "animation-name",
    "none",
  );
  if (!process.env.CI) await page.screenshot({
    path: testInfo.outputPath("poster-atlas.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Усі фільми країни/ }).click();
  await expect(page).toHaveURL(/view=films/, { timeout: 20_000 });
  await expect.poll(() => fullRequests).toBe(1);
  await page.getByRole("button", { name: "До глобуса" }).click();
  await expect(page).toHaveURL(/view=globe/);
  expect(await originalCanvas!.evaluate((el) => el.isConnected)).toBe(true);
  expect(failures).toEqual([]);
  expect(atlasRequests).toBe(initialAtlasRequests);
});

test("preview failure leaves country search and the full catalogue available", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status:
        url.pathname === "/api/auth/refresh"
          ? 401
          : url.pathname === "/api/world/atlas"
            ? 502
            : 200,
      json: { items: [], results: [] },
    });
  });
  await page.goto("/world?country=UA&view=globe");
  await expect(page.getByText("Прев’ю поки недоступне")).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Знайти країну" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Усі фільми країни/ }).click();
  await expect(page).toHaveURL(/view=films/, { timeout: 20_000 });
});

test("live poster atlas smoke", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(
    process.env.WORLD_LIVE_SMOKE !== "1",
    "Explicit opt-in for real TMDB metadata and images",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.url().includes("image.tmdb.org"))
      console.log(
        "Poster request failed:",
        request.url(),
        request.failure()?.errorText,
      );
  });
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("image.tmdb.org"))
      console.log(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/world?country=UA&view=globe");
  const preview = page.locator(".world-preview");
  await expect(preview.getByRole("link")).toHaveCount(3, { timeout: 20_000 });
  await expect(page.locator(".world-globe canvas")).toBeVisible();
  await expect(page.locator(".world-globe")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20_000 },
  );
  await expect(page.locator(".world-globe")).toHaveAttribute(
    "data-selected-poster",
    "true",
    { timeout: 60_000 },
  );
  await expect
    .poll(() =>
      preview
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("live-poster-atlas.png"),
    fullPage: true,
  });
  await page.getByRole("searchbox", { name: "Знайти країну" }).fill("Росія");
  await page.locator(".world-country-matches").getByRole("button").click();
  await expect(page.locator(".world-globe")).toHaveAttribute(
    "data-selected-posters",
    "24",
    { timeout: 20_000 },
  );
  await page.screenshot({
    path: testInfo.outputPath("live-large-country-mosaic.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
