import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SavedProvider } from '../src/state/SavedContext';
import { AuthProvider } from '../src/state/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SavedProvider>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="title/[mediaType]/[id]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </SavedProvider>
    </AuthProvider>
  );
}
