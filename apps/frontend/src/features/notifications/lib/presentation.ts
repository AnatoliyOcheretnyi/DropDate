import type { NotificationItem } from "../types/notifications";

export function formatNotificationDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
  }).format(parsed);
}

export function formatEpisodeLabel(item: NotificationItem) {
  return item.seasonNumber && item.episodeNumber
    ? `S${item.seasonNumber}E${item.episodeNumber}`
    : "";
}

export function formatNotificationTitle(item: NotificationItem) {
  if (item.eventType === "friend_request") return `${item.title} запрошує вас у друзі`;
  if (item.eventType === "friend_accepted") return `${item.title} прийняв ваше запрошення`;
  if (item.eventType === "friend_recommendation") {
    const sender = item.episodeName?.split("\n", 1)[0]?.trim() || "Друг";
    return `${sender} радить: ${item.title}`;
  }
  if (item.eventType === "game_challenge") return "Друг викликає тебе на кінодуель";
  if (item.eventType === "person_release") return `Новий реліз: ${item.title}`;
  if (item.eventType === "episode_release") {
    const episode = formatEpisodeLabel(item);
    return episode ? `Вийшла серія ${episode}` : "Вийшла нова серія";
  }
  return "Вийшов фільм";
}
