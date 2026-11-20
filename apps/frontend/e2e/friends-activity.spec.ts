import { expect, test } from "@playwright/test";

test("friends activity shows posters and saves from the preview without losing the feed", async ({
  page,
  isMobile,
}, testInfo) => {
  const titles = [
    {
      tmdbId: 303991,
      title: "Руйнація",
      posterUrl:
        "https://image.tmdb.org/t/p/w342/6iyVoBUayz0Qb7xWSqgLcyV7vmp.jpg",
      mediaType: "movie",
    },
    {
      tmdbId: 680,
      title: "Кримінальне чтиво",
      posterUrl:
        "https://image.tmdb.org/t/p/w342/vN2tP974uealOblYRxFWxOt4xfN.jpg",
      mediaType: "movie",
    },
    {
      tmdbId: 303991,
      title: "Руйнація",
      posterUrl:
        "https://image.tmdb.org/t/p/w342/6iyVoBUayz0Qb7xWSqgLcyV7vmp.jpg",
      mediaType: "movie",
    },
    { tmdbId: 101, title: "Без постера", posterUrl: "", mediaType: "tv" },
  ];
  const events = titles.map((title, index) => ({
    ...title,
    type: index === 1 ? "recommendation" : index === 3 ? "save" : "rating",
    actorId: index === 2 ? "anna" : "marta",
    actorName: index === 2 ? "anna.kino" : "marta.cinema",
    rating: index === 0 ? 10 : 8,
    createdAt: "2026-11-19T12:00:00Z",
  }));
  let saved: Record<string, unknown>[] = [];
  let posted: Record<string, unknown> | undefined;
  let activityFails = false;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let json: unknown = { items: [], results: [] };
    if (url.pathname === "/api/auth/refresh")
      json = {
        accessToken: "activity-test",
        user: { id: "viewer", username: "viewer", email: "viewer@example.com" },
      };
    else if (url.pathname === "/api/social/activity") {
      if (activityFails)
        return route.fulfill({ status: 503, json: { message: "unavailable" } });
      json = {
        items: [
          {
            type: "friend_accepted",
            actorId: "taras",
            actorName: "taras.movies",
            tmdbId: 0,
            mediaType: "social",
            createdAt: "2026-11-20T12:00:00Z",
          },
          ...events,
        ],
      };
    } else if (url.pathname === "/api/friends")
      json = { friends: [], incoming: [], outgoing: [] };
    else if (url.pathname === "/api/details") {
      const title = titles.find(
        (item) => String(item.tmdbId) === url.searchParams.get("tmdbId"),
      )!;
      json = {
        details: {
          ...title,
          id: title.tmdbId,
          genres: ["Драма"],
          releaseDate: "2016-04-06",
          overview: "Історія про зміни й новий початок.",
          voteAverage: 6.9,
        },
      };
    } else if (
      url.pathname === "/api/saved" &&
      route.request().method() === "POST"
    ) {
      posted = route.request().postDataJSON();
      saved = [
        {
          ...titles[0],
          id: "movie:303991",
          type: "movie",
          source: "tmdb",
          nextRelease: "2016-04-06",
          status: "released",
          listTypes: ["watchlist"],
        },
      ];
      json = {};
    } else if (url.pathname === "/api/saved") json = { items: saved };
    else if (url.pathname === "/api/health") json = { status: "ok" };
    else if (url.pathname === "/api/notifications")
      json = { items: [], unreadCount: 0 };
    await route.fulfill({ json });
  });
  await page.goto("/friends/activity");
  const cards = page.locator(".friend-activity__card");
  await expect(cards).toHaveCount(4);
  await expect(
    page
      .locator(".friend-activity__connection")
      .getByRole("link", { name: /Переглянути список/ }),
  ).toHaveAttribute("href", "/friends/taras");
  await expect(cards.first().getByLabel("Оцінка друга: 10 з 10")).toBeVisible();
  await expect(
    cards.first().getByRole("img", { name: "Руйнація" }),
  ).toBeVisible();
  await expect(cards.last().locator(".poster-card-fallback")).toHaveText("Б");
  await page.evaluate(() => document.fonts.ready);
  await cards.first().scrollIntoViewIfNeeded();
  await cards.first().evaluate(async (el) => {
    await Promise.all(
      Array.from(el.querySelectorAll("img")).map((image) =>
        image.decode().catch(() => undefined),
      ),
    );
    await Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
  await page.screenshot({
    path: testInfo.outputPath("activity.png"),
    fullPage: !isMobile,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const original = await cards.first().elementHandle();
  await cards.first().getByRole("button", { name: "Опис: Руйнація", exact: true }).click();
  const preview = page.getByRole("dialog");
  await preview
    .getByRole("button", { name: "Хочу подивитись", exact: true })
    .click();
  await expect.poll(() => posted?.listType).toBe("watchlist");
  expect(posted?.tmdbId).toBe(303991);
  expect(posted?.mediaType).toBe("movie");
  expect(posted?.posterUrl).toBe(titles[0].posterUrl);
  await expect(cards.first().getByText("✓ У твоєму списку")).toBeVisible();
  await expect(cards.nth(2).getByText("✓ У твоєму списку")).toBeVisible();
  expect(await original!.evaluate((el) => el.isConnected)).toBe(true);
  await expect(cards).toHaveCount(4);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Поради тобі", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Кримінальне чтиво");
  await page.getByRole("button", { name: "Усе", exact: true }).click();
  await expect(cards).toHaveCount(4);
  // An unavailable feed must show a retry state, not an empty-success message.
  activityFails = true;
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Повторити", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  activityFails = false;
  await page.getByRole("button", { name: "Повторити", exact: true }).click();
  await expect(cards).toHaveCount(4);
});
