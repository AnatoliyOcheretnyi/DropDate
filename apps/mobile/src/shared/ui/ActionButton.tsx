import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost';
};

export function ActionButton({ label, onPress, variant = 'solid' }: ActionButtonProps) {
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

const styles = StyleSheet.create({
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
    color: '#04140f',
  },
  textLight: {
    color: colors.text,
  },
});
