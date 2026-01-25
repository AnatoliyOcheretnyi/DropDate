import { Tabs } from 'expo-router';

import { colors } from '../../src/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: 'rgba(255,255,255,0.08)',
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Головна' }} />
      <Tabs.Screen name="search" options={{ title: 'Пошук' }} />
      <Tabs.Screen name="saved" options={{ title: 'Мій список' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профіль' }} />
    </Tabs>
  );
}
