export type NotificationItem = {
  id: string;
  tmdbId: number;
  mediaType: "movie" | "tv" | "social";
  title: string;
  eventType: "movie_release" | "episode_release" | "friend_request" | "friend_accepted" | "friend_recommendation" | "game_challenge" | "person_release";
  eventKey: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName?: string;
  releaseDate?: string;
  posterUrl?: string;
  backdropUrl?: string;
  readAt?: string;
  createdAt: string;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};
