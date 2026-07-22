import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/palette";
import { MotionPressable } from "./MotionPressable";

type Props = {
  title: string;
  subtitle?: string;
  /** Rendered on the trailing edge — filters, actions, etc. */
  right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, right }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <MotionPressable
        style={styles.back}
        onPress={() => router.back()}
        accessibilityLabel="Назад"
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </MotionPressable>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    back: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    copy: { flex: 1 },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    spacer: { width: 44 },
  });
