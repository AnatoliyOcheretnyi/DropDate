import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MovieInfoButton } from "./MovieInfoButton";
import { MovieCardSurface } from "./MovieCardSurface";
const request = vi.hoisted(() => vi.fn());
const savedLists = vi.hoisted(() => ({ getListTypes: vi.fn(() => ["watchlist"]), setSuggestionLists: vi.fn() }));
vi.mock("../api/http", () => ({ requestApi: request }));
vi.mock("../../features/saved/hooks/useSavedReleases", () => ({ useSavedReleases: () => savedLists }));
beforeEach(() => {
  savedLists.setSuggestionLists.mockClear();
  request.mockReset().mockImplementation(async ({ params }) => ({ ok: true, payload: { details: { id: params.tmdbId, mediaType: params.mediaType, title: `${params.mediaType} detail`, overview: "An overview" } } }));
});
describe("shared movie previews", () => {
  it("opens a portal outside the clipped card on hover and keeps film/TV caches distinct", async () => {
    const { container, unmount } = render(<div style={{ overflow: "hidden" }}><MovieInfoButton tmdbId={81001} mediaType="movie" title="Movie" /></div>);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Опис: Movie" }));
    const dialog = await screen.findByRole("dialog", { name: "movie detail" });
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
    unmount();
    render(<MovieInfoButton tmdbId={81001} mediaType="tv" title="Series" />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Опис: Series" }));
    expect(await screen.findByRole("dialog", { name: "tv detail" })).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("opens on tap/focus without activating the card and closes with Escape", async () => {
    const activate = vi.fn();
    render(<MovieCardSurface tmdbId={81002} mediaType="movie" title="Card" onActivate={activate}><span>Poster</span></MovieCardSurface>);
    const info = screen.getByRole("button", { name: "Опис: Card" });
    fireEvent.click(info);
    const dialog = await screen.findByRole("dialog", { name: "movie detail" });
    expect(activate).not.toHaveBeenCalled();
    fireEvent.keyDown(info, { key: "Enter" });
    expect(activate).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.keyDown(screen.getByRole("button", { name: "Card" }), { key: "Enter" });
    expect(activate).toHaveBeenCalledOnce();
  });
  it("shows an unavailable state instead of an endless skeleton", async () => {
    request.mockResolvedValue({ ok: false });
    render(<MovieInfoButton tmdbId={81003} mediaType="movie" title="Failure" />);
    fireEvent.focus(screen.getByRole("button", { name: "Опис: Failure" }));
    expect(await screen.findByText(/Не вдалося завантажити опис/)).toBeInTheDocument();
    expect(screen.queryByText("Завантажуємо…")).not.toBeInTheDocument();
  });
  it("makes the preview content a details link and restores shared quick list actions", async () => {
    const activate = vi.fn();
    render(<MovieInfoButton tmdbId={81004} mediaType="movie" title="Movie" onActivate={activate} />);
    fireEvent.click(screen.getByRole("button", { name: "Опис: Movie" }));
    const dialog = await screen.findByRole("dialog", { name: "movie detail" });
    const link = within(dialog).getByRole("link", { name: "movie detail" });
    expect(link).toHaveAttribute("href", "/title/movie/81004");
    expect(link).toContainElement(within(dialog).getByText("An overview"));
    expect(screen.queryByText("Детальніше про фільм ↗")).not.toBeInTheDocument();
    const lists = within(dialog).getByRole("group", { name: "Списки" });
    expect(link).not.toContainElement(lists);
    fireEvent.click(within(lists).getByRole("button", { name: /Улюблене/ }));
    expect(savedLists.setSuggestionLists).toHaveBeenCalledWith(
      expect.objectContaining({ id: 81004, mediaType: "movie" }),
      expect.arrayContaining(["favorite"]),
      expect.objectContaining({ title: "movie detail", source: "tmdb" }),
    );
    expect(activate).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByText("An overview"));
    expect(activate).toHaveBeenCalledOnce();
  });
});
