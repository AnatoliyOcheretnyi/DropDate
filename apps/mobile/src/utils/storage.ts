import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'dropdate' });

export const storageKeys = {
  refreshToken: 'dropdate_refresh_token',
  guestSaved: 'dropdate_guest_saved',
  guestMode: 'dropdate_guest_mode',
};

export const storageGetString = (key: string): string | null => {
  const value = storage.getString(key);
  return value ?? null;
};

export const storageSetString = (key: string, value: string) => {
  storage.set(key, value);
};

export const storageDelete = (key: string) => {
  storage.delete(key);
};

export const storageGetJSON = <T>(key: string): T | null => {
  const raw = storageGetString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const storageSetJSON = (key: string, value: unknown) => {
  storageSetString(key, JSON.stringify(value));
};
