import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { AnimatedProgress } from "../../../../shared/ui/AnimatedProgress";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";

/**
 * Reserved so the footer is the same height before and after an answer. The
 * feedback line and the button appear inside it rather than being pushed into
 * existence, which is what used to shove the options up the screen mid-round.
 */
const FOOTER_HEIGHT = 132;

type Props = {
  /** The game's name, at label size — the question is the headline here. */
  eyebrow: string;
  question: string;
  round: { index: number; total?: number };
  score?: number;
  streak?: number;
  /** Survival only; `null` in round-based formats. */
  lives?: number | null;
  onExit: () => void;
  children: ReactNode;
  /** Feedback and the primary action. Always drawn in the same place. */
  footer?: ReactNode;
};

/**
 * The frame every round is played in. A round is not a document, so it does not
 * get the feature-screen treatment of a 34pt title and a scrolling column: it
 * gets a fixed chrome at the top, one scrolling answer area, and a fixed action
 * area at the bottom that never moves between states.
 */
export function GameShell({
  eyebrow,
  question,
  round,
  score,
  streak,
  lives,
  onExit,
  children,
  footer,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const progress = round.total ? (round.index + 1) / round.total : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <MotionPressable
          style={styles.exit}
          onPress={onExit}
          accessibilityLabel="Вийти з гри"
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </MotionPressable>

        <View style={styles.progressColumn}>
          {round.total ? (
            <AnimatedProgress value={progress} height={5} />
          ) : (
            <View style={styles.endlessRule} />
          )}
          <Text style={styles.roundLabel}>
            {round.total
              ? `Раунд ${round.index + 1} з ${round.total}`
              : `Раунд ${round.index + 1}`}
          </Text>
        </View>

        {typeof score === "number" ? (
          <View style={styles.scoreChip}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreUnit}>очок</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.prompt}>
        <View style={styles.promptMeta}>
          <Text style={styles.eyebrow} numberOfLines={1}>
            {eyebrow.toUpperCase()}
          </Text>
          <View style={styles.tokens}>
            {streak && streak > 1 ? (
              <View style={styles.streak}>
                <Ionicons name="flame" size={12} color={colors.gold} />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            ) : null}
            {typeof lives === "number" ? (
              <View style={styles.lives}>
                {[0, 1, 2].map((slot) => (
                  <Ionicons
                    key={slot}
                    name={slot < lives ? "heart" : "heart-outline"}
                    size={14}
                    color={slot < lives ? colors.error : colors.textMuted}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>
        <Text style={styles.question} numberOfLines={3}>
          {question}
        </Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View style={styles.footer}>{footer}</View>
    </SafeAreaView>
  );
}

/** The footer's two parts, so every game states its result the same way. */
export function GameFeedback({
  correct,
  text,
}: {
  correct: boolean;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        feedbackStyles.text,
        { color: correct ? colors.accent : colors.error },
      ]}
      numberOfLines={2}
    >
      {text}
    </Text>
  );
}

export function GameAction({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <MotionPressable
      style={[styles.action, variant === "ghost" && styles.actionGhost]}
      onPress={onPress}
      disabled={disabled}
      haptic="none"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.actionText,
          variant === "ghost" && styles.actionTextGhost,
        ]}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}

const feedbackStyles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 14,
    },
    exit: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.elevated,
    },
    progressColumn: { flex: 1, gap: 6 },
    endlessRule: { height: 5, borderRadius: 99, backgroundColor: c.border },
    roundLabel: { color: c.textMuted, fontSize: 11.5, fontWeight: "700" },
    scoreChip: { alignItems: "flex-end" },
    scoreValue: { color: c.text, fontSize: 20, fontWeight: "900" },
    scoreUnit: { color: c.eyebrow, fontSize: 10, fontWeight: "700" },
    prompt: { paddingHorizontal: 20, paddingBottom: 18, gap: 8 },
    promptMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    eyebrow: {
      flexShrink: 1,
      color: c.eyebrow,
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 1.6,
    },
    tokens: { flexDirection: "row", alignItems: "center", gap: 10 },
    streak: { flexDirection: "row", alignItems: "center", gap: 3 },
    streakText: { color: c.gold, fontSize: 12.5, fontWeight: "900" },
    lives: { flexDirection: "row", gap: 3 },
    question: {
      color: c.text,
      fontSize: 23,
      lineHeight: 29,
      fontWeight: "900",
    },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
    footer: {
      height: FOOTER_HEIGHT,
      // Centred, so the action sits in the same place whether the round is
      // waiting for an answer or showing the result of one.
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 18,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
    action: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: c.accent,
    },
    actionGhost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: c.border,
    },
    actionText: {
      color: c.isDark ? "#04140f" : "#ffffff",
      fontSize: 15,
      fontWeight: "900",
    },
    actionTextGhost: { color: c.text },
  });
