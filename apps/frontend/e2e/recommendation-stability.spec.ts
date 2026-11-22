import { expect, test } from "@playwright/test";

for (const layout of ["default", "tablet"] as const) {
  test(`recommendations keep their height and scroll position (${layout})`, async ({ page, isMobile }, testInfo) => {
    test.skip(layout === "tablet" && isMobile, "Tablet uses the desktop browser");
    if (layout === "tablet") await page.setViewportSize({ width: 1000, height: 900 });
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const picks = Array.from({ length: 4 }, (_, index) => ({
      tmdbId: 700 + index,
      mediaType: "movie",
      title: `Фільм ${index + 1}`,
      year: "2024",
      reason: { text: "За твоїми вподобаннями" },
    }));
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      let json: unknown = { items: [], results: [] };
      if (url.pathname === "/api/auth/refresh") {
        json = { accessToken: "test-token", user: { id: "stability", username: "viewer", email: "viewer@example.com" } };
      } else if (url.pathname === "/api/recommendations/me") {
        if (url.searchParams.get("novelty") !== "20") {
          await gate;
          json = { items: [{ ...picks[0], tmdbId: 900, title: "Дуже довга назва нового фільму, яка займає декілька рядків і не має розтягувати картку", reason: { text: "Відкрий іншу кінотрадицію через близькі тобі жанри та знайди нові історії, що можуть тебе здивувати" } }] };
        } else json = { items: picks };
      } else if (url.pathname === "/api/taste/onboarding") json = { completed: true, stage: "completed" };
      else if (url.pathname === "/api/notifications") json = { items: [], unreadCount: 0 };
      else if (url.pathname === "/api/new-releases") json = { movies: [], series: [], anime: [] };
      await route.fulfill({ json });
    });
    await page.goto("/");
    const row = page.locator(".discovery__reasons");
    await expect(row.locator("article")).toHaveCount(4);
    await expect(row).toHaveAttribute("aria-busy", "false");
    const slider = page.getByRole("slider", { name: "Рівень новизни рекомендацій" });
    await slider.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await slider.focus();
    // Finish the page's scroll-reveal before measuring the slider update.
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    // IntersectionObserver may start the reveal after the first animation
    // snapshot. Wait for its final transform, not only currently active frames.
    await expect.poll(() => row.evaluate((el) => {
      for (let ancestor: Element | null = el; ancestor; ancestor = ancestor.parentElement) {
        if (!ancestor.classList.contains("reveal--armed")) continue;
        if (!ancestor.classList.contains("reveal--in")) return false;
        const transform = getComputedStyle(ancestor).transform;
        if (transform !== "none" && transform !== "matrix(1, 0, 0, 1, 0, 0)") return false;
      }
      return true;
    })).toBe(true);
    const bounds = () => row.evaluate((el) => ({ height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top + window.scrollY, scroll: window.scrollY }));
    const initial = await bounds();
    await slider.press("End");
    await expect(row).toHaveAttribute("aria-busy", "true");
    await expect(row.locator("article")).toHaveCount(4);
    expect(await bounds()).toEqual(initial);
    finish();
    await expect(row.locator("article")).toHaveCount(1);
    await expect(row).toHaveAttribute("aria-busy", "false");
    expect(await bounds()).toEqual(initial);
    await expect(row.locator("article")).toHaveCSS("animation-name", "discovery-pick-enter");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(row.locator("article")).toHaveCSS("animation-name", "none");
    const card = row.locator("article");
    expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await row.screenshot({ path: testInfo.outputPath("stable-recommendations.png") });
  });
}
