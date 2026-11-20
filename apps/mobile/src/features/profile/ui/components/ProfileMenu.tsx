import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";

type Item = {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const ITEMS: Item[] = [
  { href: "/world", icon: "earth-outline", label: "Кінопаспорт світу" },
  {
    href: "/notifications",
    icon: "notifications-outline",
    label: "Сповіщення",
  },
  { href: "/friends", icon: "people-circle-outline", label: "Друзі" },
  { href: "/achievements", icon: "trophy-outline", label: "Досягнення" },
  { href: "/people", icon: "people-outline", label: "Улюблені люди" },
  { href: "/calendar", icon: "calendar-outline", label: "Календар релізів" },
  { href: "/taste", icon: "color-palette-outline", label: "Налаштувати смаки" },
  { href: "/shared-lists", icon: "albums-outline", label: "Спільні списки" },
  { href: "/changelog", icon: "sparkles-outline", label: "Що нового" },
];

const DEV_ITEM: Item = {
  href: "/profile-dev",
  icon: "construct-outline",
  label: "Dev Zone",
};

/**
 * Nine hand-written blocks became one list. Memoised because it has no reason
 * to re-render when the taste rankers or the saved count change — and it costs
 * nine animated pressables every time it does.
 */
export const ProfileMenu = memo(function ProfileMenu({
  isSuperuser,
}: {
  isSuperuser: boolean;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const items = useMemo(
    () => (__DEV__ && isSuperuser ? [...ITEMS, DEV_ITEM] : ITEMS),
    [isSuperuser],
  );

  return (
    <View style={styles.menu}>
      {items.map((item) => (
        <MotionPressable
          key={item.label}
          style={styles.menuItem}
          onPress={() => router.push(item.href)}
          accessibilityLabel={item.label}
        >
          <Ionicons name={item.icon} color={colors.accent} size={23} />
          <Text style={styles.menuText}>{item.label}</Text>
          <Ionicons name="chevron-forward" color={colors.textMuted} size={20} />
        </MotionPressable>
      ))}
    </View>
  );
});

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    menu: {
      gap: 0,
      backgroundColor: colors.card,
      borderRadius: 24,
      overflow: "hidden",
    },
    menuItem: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      borderRadius: 0,
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    menuText: { flex: 1, color: colors.text, fontWeight: "500", fontSize: 15 },
  });
