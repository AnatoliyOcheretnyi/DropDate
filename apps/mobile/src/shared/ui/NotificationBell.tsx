import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../../features/auth/store/authStore';
import { getNotifications } from '../../features/notifications/api/notifications';
import { queryKeys } from '../api/queryKeys';
import { useTheme } from '../theme/ThemeProvider';
import type { Palette } from '../theme/palette';
import { MotionPressable } from './MotionPressable';

export function NotificationBell() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const authenticated = useAuthStore((state) => Boolean(state.user && state.accessToken));
  const query = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ signal }) => getNotifications(signal),
    enabled: authenticated,
    refetchInterval: 60_000,
  });

  if (!authenticated) return null;
  const count = query.data?.unreadCount ?? 0;
  return (
    <View style={[styles.position, { top: Math.max(insets.top + 8, 18) }]} pointerEvents="box-none">
      <MotionPressable
        style={styles.button}
        onPress={() => router.push('/notifications')}
        accessibilityLabel={count ? `Сповіщення, ${count} непрочитаних` : 'Сповіщення'}
      >
        <Ionicons name={count ? 'notifications' : 'notifications-outline'} size={22} color={colors.text} />
        {count ? <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text></View> : null}
      </MotionPressable>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  position: { position: 'absolute', right: 20, zIndex: 50 },
  button: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadow, shadowOpacity: 0.16, shadowRadius: 10, elevation: 5 },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.background },
  badgeText: { color: colors.isDark ? '#04140f' : '#ffffff', fontSize: 10, fontWeight: '900' },
});
