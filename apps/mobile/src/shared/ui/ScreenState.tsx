import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { Palette } from '../theme/palette';

type Props = { loading?: boolean; title?: string; message?: string; onRetry?: () => void };

export function ScreenState({ loading, title, message, onRetry }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? <Pressable onPress={onRetry} style={styles.button}><Text style={styles.buttonText}>Спробувати ще</Text></Pressable> : null}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { marginTop: 8, borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: colors.background, fontWeight: '800' },
});
