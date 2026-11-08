import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalCollection } from "./PersonalCollection";
import type { ListType } from "../../../shared/types/releases";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), signedIn: true }));
vi.mock("../../../shared/state/auth", () => ({ useAuth: () => ({ user: mocks.signedIn ? { id: "u1" } : null, accessToken: mocks.signedIn ? "token" : null }), fetchWithAuth: mocks.fetch }));
vi.mock("../../../shared/ui/PosterCard", () => ({ PosterCard: ({ item }: { item: { title: string } }) => <span>{item.title}</span> }));
function mount(kind: "released" | "country" = "released", lists: ListType[] = []) {
  const client = new QueryClient();
  const rendered = render(<QueryClientProvider client={client}><PersonalCollection kind={kind} saved={[]} getListTypes={() => lists} onChangeLists={vi.fn()} onSelect={vi.fn()} /></QueryClientProvider>);
  return { client, ...rendered };
}
beforeEach(() => { mocks.signedIn = true; mocks.fetch.mockReset(); });
describe("personal home rails", () => {
  it("does not request or show personal collections to guests", () => {
    mocks.signedIn = false;
    const { container } = mount();
    expect(container).toBeEmptyDOMElement();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("hides genuine empty collections", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ items: [] })));
    const { client, container } = mount();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(container).toBeEmptyDOMElement();
  });
  it.each<ListType>(["favorite", "liked", "watched", "disliked"])("immediately removes optimistic %s movies", async list => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ items: [{ id: 1, mediaType: "movie", title: "Already seen" }] })));
    const { client, container } = mount("released", [list]);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(container).toBeEmptyDOMElement();
  });
  it("links the selected country to its films and qualifies incomplete passport data", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ items: [{ id: 1, mediaType: "movie", title: "New film", reason: "Драма" }], country: "KZ", countryName: "Казахстан", passportIncomplete: true })));
    mount("country");
    expect(await screen.findByText("New film")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Казахстан ↗" })).toHaveAttribute("href", "/world?country=KZ&view=films");
    expect(screen.getByText(/Для частини бібліотеки TMDB не надав даних/)).toBeInTheDocument();
  });
});
