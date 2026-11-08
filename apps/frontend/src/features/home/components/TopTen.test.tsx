import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopTen } from "./TopTen";

function mount() {
  const client = new QueryClient();
  const onSelect = vi.fn();
  render(<QueryClientProvider client={client}><TopTen items={[{ id: 1, mediaType: "movie", title: "Popular film" }]} onSelect={onSelect} /></QueryClientProvider>);
  return onSelect;
}
afterEach(() => vi.unstubAllGlobals());
describe("home popularity periods", () => {
  it("keeps separate charts and ignores a late response from an old period", async () => {
    let resolveDay!: (r: Response) => void;
    const fetch = vi.fn().mockImplementation((url: string) => url.includes("window=day") ? new Promise<Response>(resolve => { resolveDay = resolve; }) : Promise.resolve(new Response(JSON.stringify({ movies: [{ id: 3, mediaType: "movie", title: "Week film" }] }))));
    vi.stubGlobal("fetch", fetch);
    const select = mount();
    expect(screen.getByText("Popular film")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сьогодні" }));
    expect(screen.queryByText("Popular film")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Цього тижня" }));
    expect(await screen.findByText("Week film")).toBeInTheDocument();
    resolveDay(new Response(JSON.stringify({ movies: [{ id: 2, mediaType: "movie", title: "Day film" }] })));
    await waitFor(() => expect(screen.queryByText("Day film")).not.toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith("/api/trending?window=day&limit=10", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(fetch).toHaveBeenCalledWith("/api/trending?window=week&limit=10", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: /^Week film/ }));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
    fireEvent.click(screen.getByRole("button", { name: "Популярне зараз" }));
    expect(screen.getByText("Popular film")).toBeInTheDocument();
  });
  it("offers retry for a failed period without showing a different chart", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Сьогодні" }));
    const retry = await screen.findByRole("button", { name: "Повторити" }, { timeout: 3000 });
    expect(screen.queryByText("Popular film")).not.toBeInTheDocument();
    fetch.mockResolvedValue(new Response(JSON.stringify({ movies: [{ id: 2, mediaType: "movie", title: "Recovered" }] })));
    fireEvent.click(retry);
    expect(await screen.findByText("Recovered")).toBeInTheDocument();
  });
});
