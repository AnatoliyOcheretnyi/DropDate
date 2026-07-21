import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../shared/api/queryKeys';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../shared/theme/palette';
import { AnimatedSection } from '../../../shared/ui/AnimatedScreen';
import { ScreenState } from '../../../shared/ui/ScreenState';
import { getAchievements, getFriendAchievements } from '../api/achievements';
import { achievementMeta } from '../model/achievements';

export function AchievementsList({ friendId }: { friendId?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const query = useQuery({
    queryKey: friendId ? queryKeys.friendAchievements(friendId) : queryKeys.achievements,
    queryFn: ({ signal }) => friendId ? getFriendAchievements(friendId, signal) : getAchievements(signal),
    staleTime: 60_000,
  });

  if (query.isLoading || query.isError) {
    return <ScreenState loading={query.isLoading} title={query.isError ? 'Не вдалося завантажити нагороди' : 'Завантажуємо нагороди'} onRetry={() => void query.refetch()} />;
  }

  return <View style={styles.list}>{query.data?.map((item, index) => {
    const meta = achievementMeta[item.listKey];
    const target = item.nextTier ?? 1000;
    const fraction = Math.min(item.count / target, 1);
    return <AnimatedSection key={item.listKey} index={index}>
      <View style={styles.card} accessible accessibilityLabel={`${meta.label}: ${item.count} з ${target}`}>
        <View style={styles.icon}><Text style={styles.emoji}>{meta.icon}</Text></View>
        <View style={styles.body}>
          <View style={styles.head}><Text style={styles.title}>{meta.label}</Text><Text style={styles.count}>{item.count}</Text></View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: target, now: Math.min(item.count, target) }} style={styles.track}>
            <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
          </View>
          <Text style={styles.hint}>{item.nextTier ? `Ще ${Math.max(item.nextTier - item.count, 0)} до наступного рівня` : 'Усі рівні відкрито'}</Text>
        </View>
      </View>
    </AnimatedSection>;
  })}</View>;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  list: { gap: 12 },
  card: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  emoji: { fontSize: 24 }, body: { flex: 1, gap: 8 }, head: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16, flex: 1 }, count: { color: colors.accent, fontWeight: '900' },
  track: { height: 7, borderRadius: 99, overflow: 'hidden', backgroundColor: colors.border }, fill: { height: '100%', borderRadius: 99, backgroundColor: colors.accent },
  hint: { color: colors.textMuted, fontSize: 12 },
});
