import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
const actions: {
  route: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}[] = [
  {
    route: "/mood",
    icon: "sparkles-outline",
    title: "За настроєм",
    detail: "Кіно саме на цей вечір",
  },
  {
    route: "/world",
    icon: "earth-outline",
    title: "Кіно без кордонів",
    detail: "Подорожуй історіями",
  },
  {
    route: "/match",
    icon: "options-outline",
    title: "Кінометч",
    detail: "Знайди своє попадання",
  },
  {
    route: "/bridge",
    icon: "git-compare-outline",
    title: "Кіноміст",
    detail: "Між улюбленими фільмами",
  },
  {
    route: "/calendar",
    icon: "calendar-outline",
    title: "Скоро на екранах",
    detail: "Усі очікувані прем’єри",
  },
  {
    route: "/browse",
    icon: "grid-outline",
    title: "Увесь каталог",
    detail: "Від класики до відкриттів",
  },
];
export function HomeQuickActions() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={s.section}>
      <Text style={[s.eyebrow, { color: colors.textMuted }]}>
        ЯКИМ БУДЕ ТВІЙ ВЕЧІР?
      </Text>
      <View style={s.grid}>
        {actions.map((a) => (
          <MotionPressable
            key={a.title}
            onPress={() => router.push(a.route)}
            style={[
              s.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={s.top}>
              <Ionicons name={a.icon} size={24} color={colors.accent} />
              <Ionicons
                name="arrow-forward"
                size={16}
                color={colors.textMuted}
              />
            </View>
            <Text style={[s.title, { color: colors.text }]}>{a.title}</Text>
            <Text style={[s.detail, { color: colors.textMuted }]}>
              {a.detail}
            </Text>
          </MotionPressable>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  section: { gap: 16 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    flexBasis: "45%",
    flexGrow: 1,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    gap: 6,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3 },
  detail: { fontSize: 12, lineHeight: 18 },
});
