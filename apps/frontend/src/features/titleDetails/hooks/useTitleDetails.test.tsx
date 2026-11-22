import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useTitleDetails } from "./useTitleDetails";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), lists: () => [], saved: () => undefined }));
vi.mock("../api/detailsApi", () => ({ fetchDetails: mocks.fetch }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ mediaType: "movie", id: "442269" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../../saved/hooks/useSavedReleases", () => ({ useSavedReleases: () => ({
  savedCount: 0, isReady: true, getListTypes: mocks.lists, getSavedItem: mocks.saved,
}) }));
vi.mock("../../../shared/hooks/useSuggestions", () => ({ useSuggestions: () => ({ suggestions: [], isFetching: false }) }));
vi.mock("../../../shared/hooks/useToasts", () => ({ useToasts: () => ({ toasts: [], pushToast: vi.fn(), dismissToast: vi.fn() }) }));

afterEach(() => { focusManager.setFocused(undefined); vi.resetAllMocks(); });

it("refreshes a cached missing description on entry and again when returning to the tab", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  const old = { details: { id: 442269, mediaType: "movie", title: "Jean-Marc ou La Vie conjugale", overview: "" } };
  client.setQueryData(webQueryKeys.details("movie", 442269), old);
  const fresh = { details: { ...old.details, title: "Anatomy of a Marriage: My Days with Jean-Marc", overview: "The story of a couple from Jean-Marc's perspective." } };
  mocks.fetch.mockResolvedValue({ ok: true, payload: fresh });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const view = renderHook(() => useTitleDetails(), { wrapper });
  await waitFor(() => expect(view.result.current.details?.overview).toBe(fresh.details.overview));
  expect(view.result.current.details?.title).toBe(fresh.details.title);

  mocks.fetch.mockResolvedValue({ ok: true, payload: { details: { ...fresh.details, overview: "Оновлений український опис." } } });
  act(() => { focusManager.setFocused(false); focusManager.setFocused(true); });
  await waitFor(() => expect(view.result.current.details?.overview).toBe("Оновлений український опис."));
  expect(mocks.fetch).toHaveBeenCalledTimes(2);

  mocks.fetch.mockRejectedValue(new Error("Temporary network failure"));
  act(() => { focusManager.setFocused(false); focusManager.setFocused(true); });
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(view.result.current.details?.overview).toBe("Оновлений український опис.");
  expect(view.result.current.error).toBeNull();
  view.unmount();
  client.clear();
});
