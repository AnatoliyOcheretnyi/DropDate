import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { copy } from "../../../shared/strings";
import { ProfileCard } from "./components/ProfileCard";
import { ProfileActions } from "./components/ProfileActions";
import { useProfileScreen } from "../hooks/useProfileScreen";
import { ThemeToggle } from "../../../shared/ui/ThemeToggle";
import { NotificationBell } from "../../../shared/ui/NotificationBell";
import { useSaved } from "../../saved/hooks/useSaved";
import { ProfileMenu } from "./components/ProfileMenu";
import { ProfileTaste } from "./components/ProfileTaste";
import { UsernameEditor } from "./components/UsernameEditor";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { saved } = useSaved();
  const {
    user,
    isGuest,
    initials,
    handleSignIn,
    handleResetGuest,
    handleSignOut,
  } = useProfileScreen();

  // One pass instead of two filters re-run on every render of the screen.
  const stats = useMemo(() => {
    let watched = 0;
    let series = 0;
    for (const item of saved) {
      if (item.listTypes.includes("watched")) watched += 1;
      if (item.mediaType === "tv") series += 1;
    }
    return { total: saved.length, watched, series };
  }, [saved]);

  return (
    <View style={styles.wrapper}>
      <NotificationBell />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <Text style={styles.header}>{copy.auth.profile}</Text>
        <ProfileCard
          initials={initials}
          email={user?.email}
          verified={user?.verified}
        />
        {user ? <UsernameEditor /> : null}
        <View style={styles.stats}>
          {[
            { value: stats.total, label: "У списках" },
            { value: stats.watched, label: "Переглянуто" },
            { value: stats.series, label: "Серіали" },
          ].map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        <ThemeToggle />
        <MotionPressable
          style={[styles.stat, { flex: undefined }]}
          onPress={() => router.push("/settings")}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
            Налаштування та підтримка →
          </Text>
        </MotionPressable>
        {user ? <ProfileMenu isSuperuser={Boolean(user.isSuperuser)} /> : null}
        <ProfileActions
          isGuest={isGuest}
          hasUser={Boolean(user)}
          onSignIn={handleSignIn}
          onResetGuest={handleResetGuest}
          onSignOut={handleSignOut}
        />
        {user ? <ProfileTaste /> : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      paddingTop: 40,
      paddingHorizontal: 20,
      paddingBottom: 148,
      gap: 16,
    },
    header: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.text,
    },
    stats: { flexDirection: "row", gap: 10 },
    stat: {
      flex: 1,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: { color: colors.accent, fontSize: 24, fontWeight: "900" },
    statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  });
