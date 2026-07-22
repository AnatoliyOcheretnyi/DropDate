import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "../../features/auth/store/authStore";
import { getNotifications } from "../../features/notifications/api/notifications";
import { queryKeys } from "../api/queryKeys";
import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/palette";
import { MotionPressable } from "./MotionPressable";

type Props = {
  /**
   * `false` renders just the button, for screens that own their own top bar
   * layout (Home). Default keeps the legacy floating placement.
   */
  floating?: boolean;
};

export function NotificationBell({ floating = true }: Props = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const authenticated = useAuthStore((state) =>
    Boolean(state.user && state.accessToken),
  );
  const query = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ signal }) => getNotifications(signal),
    enabled: authenticated,
    refetchInterval: 60_000,
  });

  if (!authenticated) return null;
  const count = query.data?.unreadCount ?? 0;
  // The badge is a sibling, not a child: MotionPressable clips its children so
  // the counter would lose the part that overhangs the button's corner.
  const button = (
    <View style={styles.anchor}>
      <MotionPressable
        style={styles.button}
        onPress={() => router.push("/notifications")}
        accessibilityLabel={
          count ? `Сповіщення, ${count} непрочитаних` : "Сповіщення"
        }
      >
        <Ionicons
          name={count ? "notifications" : "notifications-outline"}
          size={22}
          color={colors.text}
        />
      </MotionPressable>
      {count ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </View>
  );

  if (!floating) return button;

  return (
    <View
      style={[styles.position, { top: Math.max(insets.top + 8, 18) }]}
      pointerEvents="box-none"
    >
      {button}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    position: { position: "absolute", right: 20, zIndex: 50 },
    anchor: { width: 44, height: 44 },
    button: {
      width: 44,
      height: 44,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 5,
    },
    badge: {
      position: "absolute",
      top: -6,
      right: -6,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.background,
      // Keeps the counter above the button on Android, where elevation on the
      // button would otherwise paint it over a plain sibling.
      zIndex: 2,
      elevation: 6,
    },
    badgeText: {
      color: colors.isDark ? "#04140f" : "#ffffff",
      fontSize: 10,
      fontWeight: "900",
    },
  });
