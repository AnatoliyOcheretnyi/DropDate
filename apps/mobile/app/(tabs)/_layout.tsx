import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { colors } from '../../src/shared/theme/colors';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { getNotifications } from '../../src/features/notifications/api/notifications';
import { queryKeys } from '../../src/shared/api/queryKeys';

export default function TabsLayout() {
  const authenticated = useAuthStore((state) => Boolean(state.user && state.accessToken));
  const notifications = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ signal }) => getNotifications(signal),
    enabled: authenticated,
    refetchInterval: 60_000,
  });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: 'rgba(91,255,200,0.22)',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 6,
          shadowColor: 'rgba(91,255,200,0.35)',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          elevation: 12,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Головна',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Пошук',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Відкрити',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Мій список',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarBadge: notifications.data?.unreadCount || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.background },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
