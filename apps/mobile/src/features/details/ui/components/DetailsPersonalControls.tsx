import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Details } from "../../../../shared/types/release";
import { useSaved } from "../../../saved/hooks/useSaved";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import { useToast } from "../../../../shared/ui/Toast";
import type { Palette } from "../../../../shared/theme/palette";
export function DetailsPersonalControls({ details }: { details: Details }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const { findByTmdbId, updateStats: update } = useSaved();
  const item = findByTmdbId(details.id, details.mediaType);
  if (!item) return null;
  const listType = item.listTypes.includes("watched")
    ? "watched"
    : item.listTypes[0];
  if (!listType) return null;
  const save = async (stats: {
    userRating?: number;
    watchCount?: number;
    lastWatchedAt?: string;
  }) => {
    if (busy) return;
    setBusy(true);
    try {
      await update(details, listType, stats);
    } catch {
      showToast("Не вдалося зберегти. Спробуй ще раз.");
    } finally {
      setBusy(false);
    }
  };
  const rating = item.userRating ?? 0;
  const count = item.watchCount ?? 0;
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Твій перегляд</Text>
      <Text style={styles.label}>Оцінка · {rating || "–"} / 10</Text>
      <View style={styles.scale}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
          <MotionPressable
            key={value}
            disabled={busy}
            accessibilityLabel={`Оцінити на ${value} з 10`}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === rating, disabled: busy }}
            style={[styles.pip, value <= rating && styles.pipOn]}
            onPress={() => void save({ userRating: value })}
          >
            <Text style={[styles.pipText, value <= rating && styles.pipTextOn]}>
              {value}
            </Text>
          </MotionPressable>
        ))}
      </View>
      <Text style={styles.label}>Кількість переглядів</Text>
      <View style={styles.stepper}>
        <MotionPressable
          disabled={busy || count <= 0}
          accessibilityLabel="Зменшити кількість переглядів"
          style={styles.step}
          onPress={() => void save({ watchCount: Math.max(0, count - 1) })}
        >
          <Text style={styles.stepText}>−</Text>
        </MotionPressable>
        <Text style={styles.count}>{count}</Text>
        <MotionPressable
          disabled={busy}
          accessibilityLabel="Збільшити кількість переглядів"
          style={styles.step}
          onPress={() =>
            void save({
              watchCount: count + 1,
              lastWatchedAt: new Date().toISOString(),
            })
          }
        >
          <Text style={styles.stepText}>+</Text>
        </MotionPressable>
      </View>
    </View>
  );
}
const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {
      marginHorizontal: 20,
      marginTop: 20,
      padding: 16,
      gap: 12,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { color: colors.text, fontSize: 20, fontWeight: "900" },
    label: { color: colors.textMuted, fontWeight: "700" },
    scale: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pip: {
      width: "17%",
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    pipText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
    pipTextOn: { color: colors.background },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 18,
    },
    step: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepText: { color: colors.text, fontSize: 24, fontWeight: "700" },
    count: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "900",
      minWidth: 28,
      textAlign: "center",
    },
  });
