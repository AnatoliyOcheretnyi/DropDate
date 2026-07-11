import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../src/features/auth/store/authStore';
import { getNotifications } from '../../src/features/notifications/api/notifications';
import { queryKeys } from '../../src/shared/api/queryKeys';
import { FloatingTabBar } from '../../src/shared/ui/FloatingTabBar';

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
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
