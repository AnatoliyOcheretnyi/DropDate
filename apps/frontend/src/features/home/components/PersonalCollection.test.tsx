import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalCollection } from "./PersonalCollection";
import type { ListType } from "../../../shared/types/releases";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), signedIn: true }));
vi.mock("../../../shared/state/auth", () => ({
  useAuth: () => ({
    user: mocks.signedIn ? { id: "u1" } : null,
    accessToken: mocks.signedIn ? "token" : null,
  }),
  fetchWithAuth: mocks.fetch,
}));
vi.mock("../../../shared/ui/PosterCard", () => ({
  PosterCard: ({ item }: { item: { title: string } }) => (
    <span>{item.title}</span>
  ),
}));
function mount(
  kind: "released" | "country" = "released",
  lists: ListType[] = [],
) {
  const client = new QueryClient();
  const rendered = render(
    <QueryClientProvider client={client}>
      <PersonalCollection
        kind={kind}
        saved={[]}
        getListTypes={() => lists}
        onChangeLists={vi.fn()}
        onSelect={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { client, ...rendered };
}
beforeEach(() => {
  mocks.signedIn = true;
  mocks.fetch.mockReset();
});
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
  it.each<ListType>(["favorite", "liked", "watched", "disliked"])(
    "immediately removes optimistic %s movies",
    async (list) => {
      mocks.fetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [{ id: 1, mediaType: "movie", title: "Already seen" }],
          }),
        ),
      );
      const { client, container } = mount("released", [list]);
      await waitFor(() => expect(client.isFetching()).toBe(0));
      expect(container).toBeEmptyDOMElement();
    },
  );
  it("links the selected country to its films and qualifies incomplete passport data", async () => {
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            { id: 1, mediaType: "movie", title: "New film", reason: "Драма" },
          ],
          country: "KZ",
          countryName: "Казахстан",
          passportIncomplete: true,
        }),
      ),
    );
    mount("country");
    expect(await screen.findByText("New film")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Казахстан ↗" })).toHaveAttribute(
      "href",
      "/world?country=KZ&view=films",
    );
    expect(
      screen.getByText(/Для частини бібліотеки TMDB не надав даних/),
    ).toBeInTheDocument();
  });
});

it("keeps the loaded row during a library refresh and only removes the saved card", async () => {
  const first = {
    id: 1,
    mediaType: "movie" as const,
    title: "First film",
    reason: "Драма",
  };
  const second = {
    id: 2,
    mediaType: "movie" as const,
    title: "Second film",
    reason: "Драма",
  };
  let finish!: (response: Response) => void;
  mocks.fetch
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [first, second] })),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
  const client = new QueryClient();
  const props = {
    kind: "country" as const,
    onChangeLists: vi.fn(),
    onSelect: vi.fn(),
  };
  const view = render(
    <QueryClientProvider client={client}>
      <PersonalCollection {...props} saved={[]} getListTypes={() => []} />
    </QueryClientProvider>,
  );
  const retained = await screen.findByText("Second film");
  view.rerender(
    <QueryClientProvider client={client}>
      <PersonalCollection
        {...props}
        saved={[
          {
            id: "movie:1",
            tmdbId: 1,
            mediaType: "movie",
            title: "First film",
            type: "movie",
            nextRelease: "",
            source: "tmdb",
            status: "released",
            listTypes: ["watchlist"],
          },
        ]}
        getListTypes={(item) => (item.id === 1 ? ["watchlist"] : [])}
      />
    </QueryClientProvider>,
  );
  expect(screen.getByText("Second film")).toBe(retained);
  expect(view.container.querySelector(".home-collection__skeleton")).toBeNull();
  expect(screen.getByText("First film").closest("article")).toHaveAttribute(
    "data-exiting",
    "true",
  );
  await waitFor(() =>
    expect(screen.queryByText("First film")).not.toBeInTheDocument(),
  );
  expect(screen.getByText("Second film")).toBe(retained);
  finish(
    new Response(
      JSON.stringify({
        items: [second, { ...first, id: 3, title: "Replacement film" }],
      }),
    ),
  );
  expect(await screen.findByText("Replacement film")).toBeInTheDocument();
  expect(screen.getByText("Second film")).toBe(retained);
});

it("preserves loaded cards if a background refresh fails", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  mocks.fetch
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: 1, mediaType: "movie", title: "Keep this film" }],
        }),
      ),
    )
    .mockResolvedValue(new Response("{}", { status: 503 }));
  render(
    <QueryClientProvider client={client}>
      <PersonalCollection
        kind="gems"
        saved={[]}
        getListTypes={() => []}
        onChangeLists={vi.fn()}
        onSelect={vi.fn()}
      />
    </QueryClientProvider>,
  );
  const card = await screen.findByText("Keep this film");
  await act(async () => {
    await client.invalidateQueries({ queryKey: ["home-collection"] });
  });
  expect(
    await screen.findByRole("button", { name: "Повторити" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Keep this film")).toBe(card);
});
