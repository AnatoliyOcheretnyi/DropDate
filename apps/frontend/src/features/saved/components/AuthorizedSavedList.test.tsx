import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SavedRelease } from "../../../shared/types/releases";
import { AuthorizedSavedList } from "./AuthorizedSavedList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const items: SavedRelease[] = [
  {
    id: "tmdb:1:movie",
    tmdbId: 1,
    mediaType: "movie",
    title: "Дюна",
    type: "movie",
    nextRelease: "2026-12-18T00:00:00Z",
    source: "tmdb",
    status: "upcoming",
    listTypes: ["follow", "watchlist"],
    genres: ["Фантастика", "Драма"],
    userRating: 9,
    tmdbRating: 8.1,
  },
  {
    id: "tmdb:2:tv",
    tmdbId: 2,
    mediaType: "tv",
    title: "Розділення",
    type: "series",
    nextRelease: "",
    source: "tmdb",
    status: "upcoming",
    listTypes: ["favorite"],
    genres: ["Трилер"],
    tmdbRating: 8.7,
  },
];

describe("AuthorizedSavedList", () => {
  it("renders poster cards with the type and genres in one meta line", () => {
    render(<AuthorizedSavedList items={items} onRemove={vi.fn()} />);
    expect(screen.getByText("Дюна")).toBeInTheDocument();
    expect(screen.getByText("Фільм · Фантастика · Драма")).toBeInTheDocument();
    expect(screen.getByText("Серіал · Трилер")).toBeInTheDocument();
  });

  it("shows my rating when there is one and the TMDB rating otherwise", () => {
    render(<AuthorizedSavedList items={items} onRemove={vi.fn()} />);
    expect(screen.getByTitle("Моя оцінка")).toHaveTextContent("9");
    expect(screen.getByTitle("Оцінка TMDB")).toHaveTextContent("8.7");
  });

  it("shows list badges only on the union tab", () => {
    const { container, rerender } = render(
      <AuthorizedSavedList items={items} onRemove={vi.fn()} showBadges />
    );
    expect(container.querySelectorAll(".list-badges").length).toBe(2);
    rerender(<AuthorizedSavedList items={items} onRemove={vi.fn()} />);
    expect(container.querySelectorAll(".list-badges").length).toBe(0);
  });

  it("groups by date only when asked to", () => {
    const { container, rerender } = render(
      <AuthorizedSavedList items={items} onRemove={vi.fn()} groupByDate />
    );
    expect(container.querySelectorAll(".saved-section").length).toBeGreaterThan(0);
    rerender(<AuthorizedSavedList items={items} onRemove={vi.fn()} />);
    expect(container.querySelectorAll(".saved-section").length).toBe(0);
  });

  it("offers the star rating only on titles that have none yet", () => {
    const { container } = render(
      <AuthorizedSavedList items={items} onRemove={vi.fn()} onRate={vi.fn()} />
    );
    // Дюна is rated 9 and shows its score; Розділення is unrated and gets stars.
    const cards = container.querySelectorAll(".saved-card");
    expect(cards[0].querySelector(".saved-card-stars")).toBeNull();
    expect(cards[1].querySelector(".saved-card-stars")).not.toBeNull();
  });

  it("switches to compact rows", () => {
    const { container } = render(
      <AuthorizedSavedList items={items} onRemove={vi.fn()} view="compact" />
    );
    expect(container.querySelector(".saved-rows")).not.toBeNull();
    expect(container.querySelector(".saved-grid")).toBeNull();
  });
});
