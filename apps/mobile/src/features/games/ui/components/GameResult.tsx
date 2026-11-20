import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { AnimatedCounter } from "../../../../shared/ui/AnimatedCounter";
import { GameAction } from "./GameShell";

type Props = {
  /** The game just played, at label size. */
  eyebrow: string;
  score: number;
  /** What the number means: "з 10 правильних", "очок". */
  caption: string;
  /** Two or three facts worth keeping; anything more is a report, not a result. */
  stats?: { label: string; value: string }[];
  onRestart: () => void;
  onExit: () => void;
};

/**
 * One result screen for every game. The score is the whole page — it rolls up
 * to its value, and the two things you can do next sit under it in the same
 * place they occupied during the round.
 */
export function GameResult({
  eyebrow,
  score,
  caption,
  stats,
  onRestart,
  onExit,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
        <AnimatedCounter
          value={score}
          style={styles.score}
          accessibilityLabel={`Результат ${score}`}
        />
        <Text style={styles.caption}>{caption}</Text>
        {stats?.length ? (
          <View style={styles.stats}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <GameAction label="Зіграти ще" onPress={onRestart} />
        <GameAction label="До ігрової зали" onPress={onExit} variant="ghost" />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    body: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 6,
    },
    eyebrow: {
      color: c.eyebrow,
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 1.6,
    },
    score: {
      color: c.accent,
      fontSize: 76,
      lineHeight: 84,
      fontWeight: "900",
    },
    caption: { color: c.textMuted, fontSize: 15, textAlign: "center" },
    stats: { flexDirection: "row", gap: 10, marginTop: 22 },
    stat: {
      minWidth: 104,
      alignItems: "center",
      gap: 3,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    statValue: { color: c.text, fontSize: 20, fontWeight: "900" },
    statLabel: { color: c.eyebrow, fontSize: 10.5, fontWeight: "700" },
    actions: { gap: 10, paddingHorizontal: 20, paddingBottom: 20 },
  });
