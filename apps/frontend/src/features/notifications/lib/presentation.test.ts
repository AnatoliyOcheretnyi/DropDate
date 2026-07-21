import { describe, expect, it } from "vitest";
import { formatEpisodeLabel, formatNotificationTitle } from "./presentation";
import type { NotificationItem } from "../types/notifications";

const episode = {
  eventType: "episode_release",
  title: "Severance",
  seasonNumber: 2,
  episodeNumber: 3,
} as NotificationItem;

describe("notification presentation", () => {
  it("formats episode coordinates", () => {
    expect(formatEpisodeLabel(episode)).toBe("S2E3");
    expect(formatNotificationTitle(episode)).toBe("Вийшла серія S2E3");
  });

  it("formats social notifications", () => {
    expect(formatNotificationTitle({
      eventType: "friend_request",
      title: "Оля",
    } as NotificationItem)).toContain("Оля");
  });
});
