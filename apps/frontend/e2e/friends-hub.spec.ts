import { expect, test } from "@playwright/test";

test("friends hub supports finding people, requests and safe removal", async ({
  page,
  isMobile,
}, testInfo) => {
  const posters = [
    "/6iyVoBUayz0Qb7xWSqgLcyV7vmp.jpg",
    "/vN2tP974uealOblYRxFWxOt4xfN.jpg",
  ];
  const makeFriend = (id: string, username: string, mutualTitles: number) => ({
    id,
    user: { id, username, email: `${id}@example.com` },
    status: "accepted",
    createdAt: "2026-10-01T00:00:00Z",
    respondedAt: "2026-10-05T00:00:00Z",
    savedTitles: 100 + mutualTitles,
    mutualTitles,
    recentPosters: [...posters, ...posters].map(
      (path) => `https://image.tmdb.org/t/p/w342${path}`,
    ),
  });
  let friends = [
    makeFriend("marta", "marta.cinema", 42),
    makeFriend("oleh", "oleh_noir", 16),
    makeFriend("anna", "anna.kino", 28),
  ];
  let incoming = [
    { ...makeFriend("taras", "taras.movies", 8), status: "pending" },
  ];
  let outgoing: ReturnType<typeof makeFriend>[] = [];
  let failRemove = true;
  let sent = false;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let json: unknown = { items: [], results: [] };
    if (url.pathname === "/api/auth/refresh")
      json = {
        accessToken: "friends-test",
        user: {
          id: "viewer",
          username: "anatoliy",
          email: "viewer@example.com",
        },
      };
    else if (url.pathname === "/api/friends" && method === "DELETE") {
      if (failRemove) {
        await route.fulfill({ status: 503, json: { message: "unavailable" } });
        return;
      }
      friends = friends.filter(
        (friend) => friend.id !== url.searchParams.get("friendshipId"),
      );
    } else if (url.pathname === "/api/friends")
      json = { friends, incoming, outgoing };
    else if (url.pathname === "/api/friends/requests/respond") {
      const body = route.request().postDataJSON();
      if (body.accept) friends.push({ ...incoming[0], status: "accepted" });
      incoming = [];
    } else if (url.pathname === "/api/friends/search")
      json = {
        results: [
          {
            user: {
              id: "nina",
              username: "nina.film",
              email: "nina@example.com",
            },
            status: sent ? "pending_outgoing" : "none",
          },
        ],
      };
    else if (url.pathname === "/api/friends/requests") {
      sent = true;
      outgoing = [{ ...makeFriend("nina", "nina.film", 0), status: "pending" }];
      json = outgoing[0];
    } else if (url.pathname === "/api/health") json = { status: "ok" };
    else if (url.pathname === "/api/notifications")
      json = { items: [], unreadCount: 0 };
    await route.fulfill({ json });
  });
  await page.goto("/friends");
  await expect(
    page.getByRole("heading", { name: "Кіно зближує." }),
  ).toBeVisible();
  const cards = page.locator(".friends-grid .friend-card");
  await expect(cards).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await card.evaluate(async (element) => {
      await Promise.all(Array.from(element.querySelectorAll("img")).map((image) => image.decode().catch(() => undefined)));
      await Promise.all(element.parentElement!.getAnimations({ subtree: true }).map((animation) => animation.finished));
    });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("friends-overview.png"),
    fullPage: !isMobile,
  });
  await expect(cards.first()).toContainText("@marta.cinema");
  await page.getByLabel("Сортування друзів").selectOption("name");
  await expect(cards.first()).toContainText("@anna.kino");
  await page.getByLabel("Пошук серед друзів").fill("oleh");
  await expect(cards).toHaveCount(1);
  await page.getByLabel("Пошук серед друзів").fill("");
  await page.getByRole("tab", { name: /^Запити/ }).click();
  await page.getByRole("button", { name: "Прийняти", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Запит прийнято" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /^Друзі/ }).click();
  await expect(cards).toHaveCount(4);

  await page
    .getByRole("button", { name: "Знайти друга", exact: true })
    .first()
    .click();
  const search = page.getByRole("textbox", { name: "Пошук друзів" });
  await expect(search).toBeFocused();
  await search.fill("nina");
  const results = page.getByRole("region", { name: "Результати пошуку людей" });
  await expect(results.getByRole("button", { name: "Додати", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator(".friends-sidebar").screenshot({ path: testInfo.outputPath("friends-search.png") });
  await results.getByRole("button", { name: "Додати", exact: true }).click();
  await expect(
    results.getByRole("button", { name: "Надіслано" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: /^Надіслані/ }).click();
  await expect(page.locator(".friend-request-row")).toContainText("nina.film");
  await page.getByRole("tab", { name: /^Друзі/ }).click();
  const marta = cards.filter({
    has: page.getByRole("link", { name: "Відкрити профіль @marta.cinema" }),
  });
  await marta
    .getByRole("button", { name: "Прибрати @marta.cinema з друзів" })
    .click();
  await expect(
    marta.getByText("Прибрати @marta.cinema з друзів?"),
  ).toBeVisible();
  await marta.getByRole("button", { name: "Так, прибрати" }).click();
  await expect(marta.getByRole("alert")).toContainText("Не вдалося");
  failRemove = false;
  await marta.getByRole("button", { name: "Так, прибрати" }).click();
  await expect(marta).toHaveCount(0);
  await expect(cards).toHaveCount(3);
});
