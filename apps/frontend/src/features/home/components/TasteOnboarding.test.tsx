import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TasteOnboarding } from "./TasteOnboarding";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), signedIn: true }));
vi.mock("../../../shared/state/auth", () => ({
  useAuth: () => ({ user: mocks.signedIn ? { id: "u1" } : null, accessToken: mocks.signedIn ? "token" : null }),
  fetchWithAuth: mocks.fetch,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("../../../shared/lib/analytics", () => ({ track: vi.fn() }));

const status = { stage: "genre", completed: false, genreComparisons: 0, countryComparisons: 0, targetComparisons: 8 };
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}><TasteOnboarding emphasis="overlay" /></QueryClientProvider>) };
}

describe("optional taste onboarding", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.signedIn = true; });

  it.each([401, 500, 503])("does not show an error panel on the home page for HTTP %s", async (code) => {
    mocks.fetch.mockImplementation(async () => new Response("{}", { status: code }));
    const { container, client } = mount();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hides an unusable tournament even if onboarding status is available", async () => {
    mocks.fetch.mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith("onboarding") ? status : {}), { status: url.endsWith("onboarding") ? 200 : 503 }));
    const { container, client } = mount();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(container).toBeEmptyDOMElement();
  });

  it("does not fetch for guests", async () => {
    mocks.signedIn = false;
    const { container } = mount();
    expect(container).toBeEmptyDOMElement();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("shows usable choices after recovery and scopes requests to the account", async () => {
    mocks.fetch.mockImplementation(async (url: string) => new Response(JSON.stringify(
      url.endsWith("onboarding") ? status : url.includes("/next") ? { kind: "genre", left: "action", right: "comedy", round: 1 } : { items: [] }
    )));
    mount();
    expect(await screen.findByRole("button", { name: "Бойовик" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Комедія" })).toBeInTheDocument();
    expect(mocks.fetch.mock.calls.every((call) => call[2] === "u1")).toBe(true);
  });
});
