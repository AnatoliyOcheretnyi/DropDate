import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { focusManager, QueryClientProvider } from "@tanstack/react-query";

import { useAuthStore } from "../src/features/auth/store/authStore";
import { queryClient } from "../src/shared/api/queryClient";
import { BackendWakeOverlay } from "../src/shared/ui/BackendWakeOverlay";
import { ToastProvider } from "../src/shared/ui/Toast";
import { ThemeProvider, useTheme } from "../src/shared/theme/ThemeProvider";
import { AchievementUnlockOverlay } from "../src/features/achievements/ui/AchievementUnlockOverlay";

function AppBootstrap() {
  const initAuth = useAuthStore((state) => state.init);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => subscription.remove();
  }, []);

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
        <Stack.Screen
          name="title/[mediaType]/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="mood" options={{ headerShown: false }} />
        <Stack.Screen name="match" options={{ headerShown: false }} />
        <Stack.Screen name="games" options={{ headerShown: false }} />
        <Stack.Screen name="games/wheel" options={{ headerShown: false }} />
        <Stack.Screen
          name="games/friend-taste"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="games/akinator" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="friends" options={{ headerShown: false }} />
        <Stack.Screen
          name="friends/activity"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="friend/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ headerShown: false }} />
        <Stack.Screen name="calendar" options={{ headerShown: false }} />
        <Stack.Screen name="people" options={{ headerShown: false }} />
        <Stack.Screen name="person/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="bridge" options={{ headerShown: false }} />
        <Stack.Screen name="changelog" options={{ headerShown: false }} />
        <Stack.Screen name="taste" options={{ headerShown: false }} />
        <Stack.Screen name="browse" options={{ headerShown: false }} />
        <Stack.Screen name="collection/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="similar" options={{ headerShown: false }} />
        <Stack.Screen name="shared-lists" options={{ headerShown: false }} />
        <Stack.Screen
          name="shared-list/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="shared/[token]" options={{ headerShown: false }} />
        <Stack.Screen name="profile-dev" options={{ headerShown: false }} />
      </Stack>
      <BackendWakeOverlay />
      <AchievementUnlockOverlay />
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <RootNavigator />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
