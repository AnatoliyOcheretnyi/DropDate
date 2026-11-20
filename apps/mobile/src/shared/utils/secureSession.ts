import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { storageDelete, storageGetString, storageKeys } from "./storage";

const key = "dropdate.session.refresh";
// Serialize writes so a late token rotation cannot undo a sign-out.
let queue: Promise<void> = Promise.resolve();
let webToken: string | null = null;
export function writeRefreshToken(token: string | null): Promise<void> {
  const write = async () => {
    if (Platform.OS === "web") webToken = token;
    else if (token)
      await SecureStore.setItemAsync(key, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    else await SecureStore.deleteItemAsync(key);
    storageDelete(storageKeys.refreshToken);
  };
  queue = queue.catch(() => undefined).then(write);
  return queue;
}
export async function readRefreshToken(): Promise<string | null> {
  await queue.catch(() => undefined);
  if (Platform.OS === "web") return webToken;
  const current = await SecureStore.getItemAsync(key);
  if (current) {
    storageDelete(storageKeys.refreshToken);
    return current;
  }
  const legacy = storageGetString(storageKeys.refreshToken);
  // Delete the legacy value only after Keychain / Keystore accepted it.
  if (legacy) await writeRefreshToken(legacy);
  return legacy;
}
