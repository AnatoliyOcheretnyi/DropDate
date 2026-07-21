import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '../src/features/auth/store/authStore';
import { useSavedStore } from '../src/features/saved/store/savedStore';
import { queryClient } from '../src/shared/api/queryClient';
import { BackendWakeOverlay } from '../src/shared/ui/BackendWakeOverlay';
import { ThemeProvider, useTheme } from '../src/shared/theme/ThemeProvider';

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

function RootNavigator() {
  const { scheme } = useTheme();
  return (
    <>
      <AppBootstrap />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="title/[mediaType]/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="mood" options={{ headerShown: false }} />
        <Stack.Screen name="match" options={{ headerShown: false }} />
        <Stack.Screen name="games" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="friends" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="calendar" options={{ headerShown: false }} />
        <Stack.Screen name="people" options={{ headerShown: false }} />
        <Stack.Screen name="person/[id]" options={{ headerShown: false }} />
      </Stack>
      <BackendWakeOverlay />
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
