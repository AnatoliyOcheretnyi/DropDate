import type { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AnimatedScreenContent } from './AnimatedScreen';
import { MotionPressable } from './MotionPressable';

export function FeatureScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const router = useRouter();
  return <SafeAreaView style={styles.safe}><AnimatedScreenContent><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <MotionPressable accessibilityLabel="Назад" onPress={() => router.back()} style={styles.back} haptic="selection"><Ionicons name="arrow-back" color={colors.text} size={22} /></MotionPressable>
    <Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    <View style={styles.body}>{children}</View>
  </ScrollView></AnimatedScreenContent></SafeAreaView>;
}

export const featureStyles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  option: { padding: 15, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  optionSelected: { borderColor: colors.accent, backgroundColor: 'rgba(84,255,182,0.12)' },
  optionText: { color: colors.text, fontWeight: '700' },
  button: { padding: 15, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center' },
  buttonText: { color: colors.background, fontWeight: '900' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 48 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, marginBottom: 22 },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 23, marginTop: 8 }, body: { marginTop: 24, gap: 16 },
});
