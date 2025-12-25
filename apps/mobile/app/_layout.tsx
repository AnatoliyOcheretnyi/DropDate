import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SavedProvider } from '../src/state/SavedContext';

export default function RootLayout() {
  return (
    <SavedProvider>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="title/[mediaType]/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </SavedProvider>
  );
}
