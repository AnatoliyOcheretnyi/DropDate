import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/palette";
import { AnimatedScreenContent } from "./AnimatedScreen";
import { MotionPressable } from "./MotionPressable";

export function FeatureScreen({
  title,
  subtitle,
  children,
  /**
   * A screen that lives in the tab bar has nowhere to go back to, and its
   * content has to clear the floating bar.
   */
  asTab = false,
  /**
   * For screens that are a step inside a route rather than a route of their
   * own — picking a game format, say. Without it the arrow pops the whole
   * route and drops the player out of the tab they were in.
   */
  onBack,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  asTab?: boolean;
  onBack?: () => void;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safe}>
      <AnimatedScreenContent>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            asTab ? styles.contentTab : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {asTab ? null : (
            <MotionPressable
              accessibilityLabel="Назад"
              onPress={
                onBack ??
                (() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace("/(tabs)"))
              }
              style={styles.back}
              haptic="selection"
            >
              <Ionicons name="arrow-back" color={colors.text} size={22} />
            </MotionPressable>
          )}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </ScrollView>
      </AnimatedScreenContent>
    </SafeAreaView>
  );
}

// Kept for compact legacy feature screens; new screens should create styles
// from useTheme so light/dark changes are reflected immediately.
const createFeatureStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      gap: 12,
    },
    heading: { color: colors.text, fontSize: 20, fontWeight: "800" },
    text: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
    option: {
      padding: 15,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    optionSelected: {
      borderColor: colors.accent,
      backgroundColor: "rgba(84,255,182,0.12)",
    },
    optionText: { color: colors.text, fontWeight: "700" },
    button: {
      padding: 15,
      borderRadius: 999,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    buttonText: { color: colors.background, fontWeight: "900" },
  });

export function useFeatureStyles() {
  const { colors } = useTheme();
  return useMemo(() => createFeatureStyles(colors), [colors]);
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 48 },
    contentTab: { paddingTop: 20, paddingBottom: 120 },
    back: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      marginBottom: 22,
    },
    title: {
      color: colors.text,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "700",
      letterSpacing: -1,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 16,
      lineHeight: 23,
      marginTop: 8,
    },
    body: { marginTop: 24, gap: 16 },
  });
