import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore } from '../src/features/auth/store/authStore';
import { useSavedStore } from '../src/features/saved/store/savedStore';

function AppBootstrap() {
  const initAuth = useAuthStore((state) => state.init);
  const user = useAuthStore((state) => state.user);
  const isGuest = useAuthStore((state) => state.isGuest);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshSaved = useSavedStore((state) => state.refreshFromAuth);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    void refreshSaved();
  }, [accessToken, isGuest, refreshSaved, user]);

  return null;
}

export default function RootLayout() {
  return (
    <>
      <AppBootstrap />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="title/[mediaType]/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
