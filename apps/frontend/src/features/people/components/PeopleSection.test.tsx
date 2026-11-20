import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PeopleSection } from "./PeopleSection";
import { useFollowedPeopleStore } from "../store/followedPeopleStore";
import { fetchFollows } from "../api/followsApi";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../../../shared/state/auth", () => ({
  useAuth: () => ({
    user: { id: "people-test" },
    accessToken: "token",
    isLoading: false,
  }),
  fetchWithAuth: mocks.fetch,
  AuthError: class extends Error {},
}));
const person = { personId: 287, name: "Бред Пітт", role: "actor" };
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <PeopleSection />
    </QueryClientProvider>,
  );
  return { ...view, client };
}
beforeEach(() => {
  mocks.fetch.mockReset();
  localStorage.clear();
  useFollowedPeopleStore.setState({ people: [], isReady: true });
});

describe("followed people loading", () => {
  it("shows loading instead of a false empty list, then fills it automatically", async () => {
    let finish!: (response: Response) => void;
    mocks.fetch.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    mount();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Завантажуємо твоїх людей",
    );
    expect(
      screen.queryByText("Ти ще ні за ким не стежиш"),
    ).not.toBeInTheDocument();
    finish(new Response(JSON.stringify({ items: [person] })));
    expect(
      await screen.findByRole("link", { name: "Відкрити: Бред Пітт" }),
    ).toBeVisible();
  });

  it("automatically retries a transient failure without clearing cached people", async () => {
    useFollowedPeopleStore
      .getState()
      .setPeople([
        { tmdbId: 287, name: "Бред Пітт", role: "actor", followedAt: 1 },
      ]);
    mocks.fetch
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [person, { ...person, personId: 10, name: "Нова людина" }],
          }),
        ),
      );
    mount();
    const cached = screen.getByRole("link", { name: "Відкрити: Бред Пітт" });
    expect(cached).toBeVisible();
    expect(
      await screen.findByRole(
        "link",
        { name: "Відкрити: Нова людина" },
        { timeout: 2500 },
      ),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Відкрити: Бред Пітт" })).toBe(
      cached,
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("shows a failed refresh and preserves the last loaded list", async () => {
    mocks.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [person] })))
      .mockResolvedValue(new Response("{}", { status: 403 }));
    const { client } = mount();
    const cached = await screen.findByRole("link", {
      name: "Відкрити: Бред Пітт",
    });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["person-follows"] });
    });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Увійди знову"),
    );
    expect(screen.getByRole("link", { name: "Відкрити: Бред Пітт" })).toBe(
      cached,
    );
    expect(useFollowedPeopleStore.getState().people).toHaveLength(1);
    expect(
      JSON.parse(localStorage.getItem("dropdate:followed-people")!),
    ).toHaveLength(1);
  });

  it("only shows empty after the server confirms an empty list", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ items: [] })));
    mount();
    await waitFor(() =>
      expect(screen.getByText("Ти ще ні за ким не стежиш")).toBeVisible(),
    );
  });

  it("rejects an invalid success payload instead of treating it as an empty list", async () => {
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify({ message: "wrong payload" })),
    );
    await expect(fetchFollows("people-test")).rejects.toThrow(
      "Сервер не повернув список людей",
    );
  });
});
