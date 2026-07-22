import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { copy } from "../../../../shared/strings";

type Props = {
  initials: string;
  email?: string | null;
  verified?: boolean;
};

export function ProfileCard({ initials, email, verified }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.name}>{email ?? copy.auth.guestTitle}</Text>
        <Text style={styles.status}>
          {verified === false ? copy.auth.verifyRequired : copy.auth.guestHint}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: colors.accent,
      fontSize: 22,
      fontWeight: "700",
    },
    meta: {
      flex: 1,
      gap: 6,
    },
    name: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    status: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
