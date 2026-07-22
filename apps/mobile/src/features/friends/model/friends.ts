export type FriendUser = { id: string; username: string; email: string };
export type Friendship = {
  id: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt?: string;
  user: FriendUser;
  savedTitles?: number;
  mutualTitles?: number;
  recentPosters?: string[];
};
export type RelationshipStatus =
  "none" | "pending_outgoing" | "pending_incoming" | "accepted";
export type FriendSearchResult = {
  user: FriendUser;
  status: RelationshipStatus;
};
export type FriendsResponse = {
  friends: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
};
