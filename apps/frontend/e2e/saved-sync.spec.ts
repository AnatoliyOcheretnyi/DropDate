import { expect, test } from "@playwright/test";

test("expired search saves refresh the session; errors survive reload and can be retried", async ({
  page,
}, testInfo) => {
  const user = {
    id: "saved-sync-test",
    email: "viewer@example.com",
    username: "viewer",
    isSuperuser: false,
  };
  const film = { id: 53064, mediaType: "movie", title: "Мідорі", year: "1992" };
  let refreshCount = 0;
  let failWrites = false;
  let saved = false;
  const attempts: string[] = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let json: unknown = {};
    if (url.pathname === "/api/auth/refresh") {
      refreshCount++;
      json = {
        user,
        accessToken: refreshCount === 1 ? "expired-token" : "fresh-token",
      };
    } else if (url.pathname === "/api/search") {
      json = { results: [film], page: 1, totalPages: 1, totalResults: 1 };
    } else if (url.pathname === "/api/details") {
      json = {
        details: {
          ...film,
          genres: [],
          overview: "Тест збереження фільму після завершення сесії.",
        },
      };
    } else if (url.pathname === "/api/saved" && method === "POST") {
      attempts.push(route.request().headers().authorization);
      if (route.request().headers().authorization === "Bearer expired-token") {
        await route.fulfill({ status: 401, json: { error: "unauthorized" } });
        return;
      }
      if (failWrites) {
        await route.fulfill({
          status: 503,
          json: { error: "storage unavailable" },
        });
        return;
      }
      saved = true;
      json = { unlockedAchievements: [] };
    } else if (url.pathname === "/api/saved/items" && method === "DELETE") {
      saved = false;
      await route.fulfill({ status: 204 });
      return;
    } else if (url.pathname === "/api/saved") {
      json = {
        items: saved
          ? [
              {
                ...film,
                tmdbId: film.id,
                type: "movie",
                nextRelease: "",
                status: "released",
                source: "tmdb",
                listTypes: ["watchlist"],
              },
            ]
          : [],
      };
    } else if (url.pathname === "/api/notifications") {
      json = { items: [], unreadCount: 0 };
    } else if (url.pathname === "/api/achievements") {
      json = { ladders: [], totalUnlocked: 0 };
    }
    await route.fulfill({ json });
  });

  await page.goto("/search?query=Мідорі");
  await page.getByRole("button", { name: "Опис: Мідорі", exact: true }).click();
  const watchlist = page.getByRole("button", {
    name: "Хочу подивитись",
    exact: true,
  });
  await watchlist.click();
  await expect.poll(() => saved).toBe(true);
  expect(attempts).toEqual(["Bearer expired-token", "Bearer fresh-token"]);
  expect(refreshCount).toBe(2);
  await expect(page.getByLabel("Стан збереження")).toHaveCount(0);

  // Remove, then emulate an outage on the next add.
  await expect(watchlist).toHaveAttribute("aria-pressed", "true");
  await watchlist.click();
  await expect.poll(() => saved).toBe(false);
  await expect(watchlist).toHaveAttribute("aria-pressed", "false");
  failWrites = true;
  await watchlist.click();
  const notice = page.getByLabel("Стан збереження");
  await expect(notice.getByRole("alert")).toContainText("Не збережено змін: 1");
  await expect(notice).toContainText("Мідорі");
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: testInfo.outputPath("save-error.png"),
    fullPage: true,
  });

  await page.reload();
  await expect(notice.getByRole("alert")).toContainText("Не збережено змін: 1");
  await expect(notice).toContainText("Мідорі");
  failWrites = false;
  await notice.getByRole("button", { name: "Повторити: Мідорі" }).click();
  await expect.poll(() => saved).toBe(true);
  await expect(notice).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Опис: Мідорі", exact: true }).click();
  await expect(watchlist).toHaveAttribute("aria-pressed", "true");
});
