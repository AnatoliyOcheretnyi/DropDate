import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContinueWatching } from "./ContinueWatching";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), push: vi.fn() }));
vi.mock("../../../shared/state/auth", () => ({
  useAuth: () => ({ user: { id: "u1" }, accessToken: "token" }),
  fetchWithAuth: mocks.fetch,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <ContinueWatching />
      </QueryClientProvider>,
    ),
  };
}

describe("continue watching visibility", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([200, 401, 503])(
    "hides the whole section without resumable titles (HTTP %s)",
    async (status) => {
      mocks.fetch.mockResolvedValue(
        new Response(JSON.stringify({ items: [] }), { status }),
      );
      const { container, client } = mount();
      await waitFor(() => expect(client.isFetching()).toBe(0));
      expect(container).toBeEmptyDOMElement();
    },
  );
  it("only appears after progress arrives and opens the selected series", async () => {
    let resolve!: (response: Response) => void;
    mocks.fetch.mockReturnValue(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    const { container } = mount();
    expect(container).toBeEmptyDOMElement();
    resolve(
      new Response(
        JSON.stringify({
          items: [
            {
              tmdbId: 42,
              title: "Series",
              seasonNumber: 1,
              episodeNumber: 3,
              watchedCount: 2,
              episodeCount: 8,
            },
          ],
        }),
      ),
    );
    const card = await screen.findByRole("button", { name: "Series" });
    expect(
      screen.getByRole("heading", { name: "Продовжити перегляд" }),
    ).toBeInTheDocument();
    fireEvent.click(card);
    expect(mocks.push).toHaveBeenCalledWith("/title/tv/42");
  });
});
