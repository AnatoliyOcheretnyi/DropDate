import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { Palette } from '../theme/palette';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost';
};

export function ActionButton({ label, onPress, variant = 'solid' }: ActionButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      style={[styles.base, variant === 'solid' ? styles.solid : styles.ghost]}
      onPress={onPress}
    >
      <Text style={[styles.text, variant === 'solid' ? styles.textDark : styles.textLight]}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: colors.accent,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  textDark: {
    color: colors.isDark ? '#04140f' : '#ffffff',
  },
  textLight: {
    color: colors.text,
  },
});
