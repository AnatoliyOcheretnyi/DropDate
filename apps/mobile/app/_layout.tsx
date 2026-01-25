import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '../src/features/auth/store/authStore';
import { useSavedStore } from '../src/features/saved/store/savedStore';
import { queryClient } from '../src/shared/api/queryClient';

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
    <QueryClientProvider client={queryClient}>
      <AppBootstrap />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="title/[mediaType]/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}
