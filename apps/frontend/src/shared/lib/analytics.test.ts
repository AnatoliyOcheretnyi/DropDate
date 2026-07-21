import { describe, expect, it, vi } from "vitest";
import { track } from "./analytics";

describe("track", () => {
  it("publishes a vendor-neutral browser event", () => {
    const listener = vi.fn();
    window.addEventListener("dropdate:analytics", listener);

    track("daily_pick_revealed", { mediaType: "movie" });

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      event: "daily_pick_revealed",
      mediaType: "movie",
    });
  });

  it("forwards events to a configured dataLayer", () => {
    window.dataLayer = [];
    track("page_view", { path: "/changelog" });
    expect(window.dataLayer).toContainEqual({
      event: "page_view",
      path: "/changelog",
    });
  });
});
