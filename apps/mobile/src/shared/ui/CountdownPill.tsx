import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/palette";
import {
  countdownTone,
  daysUntil,
  formatCountdown,
  formatCountdownShort,
} from "../utils/countdown";

type Props = {
  /** ISO date of the next release. A missing or unparsable value renders nothing. */
  date?: string | null;
  size?: "sm" | "md";
  /** Hides the pill once the date has passed — useful on saved cards. */
  hidePast?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The countdown, in the one colour the palette reserves for release dates.
 * Gold is never an action here — you cannot press a countdown, you can only
 * read how close it is.
 */
export function CountdownPill({
  date,
  size = "md",
  hidePast = false,
  style,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const days = daysUntil(date);
  const tone = countdownTone(days);
  const label =
    size === "sm" ? formatCountdownShort(days) : formatCountdown(days);

  if (!label || (hidePast && tone === "past")) return null;

  const isSmall = size === "sm";
  return (
    <View
      style={[
        styles.pill,
        isSmall && styles.pillSm,
        tone === "past" && styles.past,
        tone === "today" && styles.today,
        style,
      ]}
      accessible
      accessibilityLabel={`Реліз: ${label.toLowerCase()}`}
    >
      <Ionicons
        name={tone === "past" ? "checkmark-circle" : "time-outline"}
        size={isSmall ? 11 : 13}
        color={tone === "past" ? colors.textMuted : colors.gold}
      />
      <Text
        style={[
          styles.text,
          isSmall && styles.textSm,
          tone === "past" && styles.textPast,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4.5,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.isDark
        ? "rgba(11,15,20,0.78)"
        : "rgba(255,255,255,0.94)",
    },
    pillSm: { paddingHorizontal: 7, paddingVertical: 3, gap: 3 },
    // Today's release earns the only border the pill ever draws in colour.
    today: { borderColor: colors.gold },
    past: { opacity: 0.85 },
    text: { color: colors.gold, fontSize: 12, fontWeight: "800" },
    textSm: { fontSize: 10.5 },
    textPast: { color: colors.textMuted },
  });
