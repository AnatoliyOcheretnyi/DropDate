import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedControlPanel } from "./SavedControlPanel";

const baseProps = {
  tab: "all" as const,
  tabCounts: {
    all: 3,
    follow: 2,
    watchlist: 1,
    favorite: 1,
    liked: 0,
    watched: 1,
    disliked: 0,
  },
  onTabChange: vi.fn(),
  isAuthenticated: true,
  genreFacets: [
    { genre: "Драма", count: 2 },
    { genre: "Трилер", count: 1 },
  ],
  selectedGenres: [] as string[],
  onToggleGenre: vi.fn(),
  onResetGenres: vi.fn(),
  query: "",
  onQueryChange: vi.fn(),
  sortKey: "added" as const,
  direction: "desc" as const,
  onSortChange: vi.fn(),
  onToggleDirection: vi.fn(),
  view: "grid" as const,
  onViewChange: vi.fn(),
  shownCount: 3,
  totalCount: 3,
  isFiltered: false,
};

describe("SavedControlPanel", () => {
  it("puts the union tab first and counts the whole library", () => {
    render(<SavedControlPanel {...baseProps} />);
    const tabs = screen.getAllByRole("tab");
    expect(within(tabs[0]).getByText("Усі")).toBeInTheDocument();
    expect(within(tabs[0]).getByText("3")).toBeInTheDocument();
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("locks every list but the subscription one for guests", () => {
    render(<SavedControlPanel {...baseProps} isAuthenticated={false} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toBeEnabled();
    expect(screen.getByRole("tab", { name: /Підписка/ })).toBeEnabled();
    expect(screen.getByRole("tab", { name: /Улюблене/ })).toBeDisabled();
  });

  it("reports a genre chip click", () => {
    const onToggleGenre = vi.fn();
    render(<SavedControlPanel {...baseProps} onToggleGenre={onToggleGenre} />);
    fireEvent.click(screen.getByRole("button", { name: /Драма/ }));
    expect(onToggleGenre).toHaveBeenCalledWith("Драма");
  });

  it("hides the genre row while the library carries fewer than two genres", () => {
    render(
      <SavedControlPanel
        {...baseProps}
        genreFacets={[{ genre: "Драма", count: 2 }]}
      />
    );
    expect(screen.queryByText("Жанри")).not.toBeInTheDocument();
  });

  it("offers both rating keys in the sort menu", () => {
    const onSortChange = vi.fn();
    render(<SavedControlPanel {...baseProps} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Нещодавно додані/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Оцінка TMDB" }));
    expect(onSortChange).toHaveBeenCalledWith("tmdbRating");
  });

  it("shows the filtered count only while filters are on", () => {
    const { rerender } = render(<SavedControlPanel {...baseProps} />);
    expect(screen.getByText("3 тайтли")).toBeInTheDocument();
    rerender(
      <SavedControlPanel {...baseProps} isFiltered shownCount={1} totalCount={3} />
    );
    expect(screen.getByText("Показано 1 з 3")).toBeInTheDocument();
  });
});
