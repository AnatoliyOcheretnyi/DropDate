export type FriendUser = {
  id: string;
  username: string;
  email: string;
};

export type FriendshipStatus = "pending" | "accepted" | "declined";

export type Friendship = {
  id: string;
  status: FriendshipStatus;
  createdAt: string;
  respondedAt?: string;
  user: FriendUser;
  savedTitles?: number;
  mutualTitles?: number;
  recentPosters?: string[];
};

export type RelationshipStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted";
