import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SharedValue } from "react-native-reanimated";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import { NotificationBell } from "../../../../shared/ui/NotificationBell";
export const HOME_TOP_BAR_HEIGHT = 76;
export function HomeTopBar({
  name,
}: {
  scrollY: SharedValue<number>;
  name?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        s.root,
        { paddingTop: insets.top + 12, backgroundColor: colors.background },
      ]}
    >
      <View style={s.identity}>
        <Text style={[s.kicker, { color: colors.textMuted }]}>
          {name
            ? `ПРИВІТ, ${name.toUpperCase()}`
            : "ТВІЙ ОСОБИСТИЙ КІНОПРОСТІР"}
        </Text>
        <Text style={[s.title, { color: colors.text }]}>Що подивимось?</Text>
      </View>
      <NotificationBell floating={false} />
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 18,
    gap: 12,
  },
  identity: { flex: 1, gap: 6 },
  kicker: { fontSize: 9, letterSpacing: 1.6, fontWeight: "700" },
  title: { fontSize: 27, fontWeight: "700", letterSpacing: -1 },
});
