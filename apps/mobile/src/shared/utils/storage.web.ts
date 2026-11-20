const memory = new Map<string, string>();
export const storageKeys = {
  refreshToken: "dropdate_refresh_token",
  guestSaved: "dropdate_guest_saved",
  guestMode: "dropdate_guest_mode",
  moodSession: "dropdate_mood_session",
  matchSession: "dropdate_match_session",
  tasteProfile: "dropdate_taste_profile",
  streak: "dropdate_streak",
};
export const storageGetString = (key: string): string | null => {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
};
export const storageSetString = (key: string, value: string) => {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
};
export const storageDelete = (key: string) => {
  memory.delete(key);
  try {
    if (typeof window !== "undefined") localStorage.removeItem(key);
  } catch {}
};
export const storageGetJSON = <T>(key: string): T | null => {
  try {
    const raw = storageGetString(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const storageSetJSON = (key: string, value: unknown) =>
  storageSetString(key, JSON.stringify(value));
