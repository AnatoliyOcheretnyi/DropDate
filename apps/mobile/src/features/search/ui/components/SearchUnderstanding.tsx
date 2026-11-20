import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import type { VibeLabel } from "../../api/vibe";

type Props = {
  labels: VibeLabel[];
  summary?: string;
  broadened: boolean;
  onRemove: (label: VibeLabel) => void;
};

/**
 * "Ми зрозуміли так" — the engine shows its reading of the phrase, and every
 * chip can be dropped. Without it an associative search is a black box: you
 * get a list and no way to tell which word sent it sideways.
 */
export function SearchUnderstanding({
  labels,
  summary,
  broadened,
  onRemove,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (labels.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>МИ ЗРОЗУМІЛИ ТАК</Text>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}

      <View style={styles.chips}>
        {labels.map((label) => (
          <MotionPressable
            key={`${label.kind}-${label.id}`}
            style={styles.chip}
            onPress={() => onRemove(label)}
            accessibilityLabel={`Прибрати «${label.label}» із запиту`}
          >
            {label.emoji ? (
              <Text style={styles.emoji}>{label.emoji}</Text>
            ) : null}
            <Text style={styles.chipText}>{label.label}</Text>
            <Ionicons name="close" size={13} color={colors.textMuted} />
          </MotionPressable>
        ))}
      </View>

      {broadened ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={15} color={colors.gold} />
          <Text style={styles.noticeText}>
            За точним збігом було майже порожньо, тож ми розширили пошук — це
            близькі, а не дослівні відповідники.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      gap: 10,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kicker: {
      color: colors.eyebrow,
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 1.4,
    },
    summary: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "600",
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emoji: { fontSize: 13 },
    chipText: { color: colors.text, fontSize: 12.5, fontWeight: "700" },
    notice: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
      paddingTop: 2,
    },
    noticeText: {
      flex: 1,
      color: colors.textMuted,
      fontSize: 11.5,
      lineHeight: 16,
    },
  });
