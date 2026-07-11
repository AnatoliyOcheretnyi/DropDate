import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../../shared/theme/palette';
import { MotionPressable } from '../../../../shared/ui/MotionPressable';

type Action = {
  route: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  gradient: readonly [string, string];
};

const ACTIONS: Action[] = [
  { route: '/mood', icon: 'sparkles', title: 'Настрій', gradient: ['#7c5cff', '#4a2fd6'] },
  { route: '/match', icon: 'options', title: 'Кінометч', gradient: ['#ff7eb3', '#e2557f'] },
  { route: '/games', icon: 'game-controller', title: 'Кіногра', gradient: ['#54ffb6', '#1fb98b'] },
  { route: '/saved', icon: 'bookmark', title: 'Мій список', gradient: ['#ffd76a', '#e9a13b'] },
];

export function HomeQuickActions() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.grid}>
      {ACTIONS.map((action) => (
        <MotionPressable
          key={action.title}
          style={styles.cell}
          onPress={() => router.push(action.route)}
          accessibilityLabel={action.title}
        >
          <LinearGradient
            colors={action.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name={action.icon} size={22} color="#04140f" />
          </LinearGradient>
          <Text style={styles.label}>{action.title}</Text>
        </MotionPressable>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
