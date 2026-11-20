import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Suggestion } from "../../../../shared/types/release";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import { SpotlightSkeleton } from "../../../../shared/ui/Shimmer";

type Props = {
  spotlight: Suggestion | null;
  supporting: Suggestion[];
  onSelect: (item: Suggestion) => void;
  onLongPress: (item: Suggestion) => void;
  isSaved: (item: Suggestion) => boolean;
  isLoading: boolean;
};
export function HomeSpotlight({
  spotlight,
  onSelect,
  onLongPress,
  isSaved,
  isLoading,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const height = Math.min((width - 40) * 1.28, 510);
  if (!spotlight)
    return isLoading ? <SpotlightSkeleton heroHeight={height} /> : null;
  return (
    <View style={[s.hero, { minHeight: height, backgroundColor: colors.card }]}>
      <MotionPressable
        accessibilityLabel={`Відкрити ${spotlight.title}`}
        onPress={() => onSelect(spotlight)}
        haptic="none"
        style={StyleSheet.absoluteFill}
      >
        <Image
          source={{ uri: spotlight.posterUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="top"
          transition={180}
          cachePolicy="memory-disk"
          priority="high"
        />
      </MotionPressable>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,.12)", "rgba(0,0,0,0)", "rgba(10,18,14,.94)"]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.tag} pointerEvents="none">
        <View style={s.dot} />
        <Text style={s.tagText}>У ЦЕНТРІ УВАГИ</Text>
      </View>
      <View style={s.content} pointerEvents="box-none">
        <Text style={s.meta}>
          {spotlight.mediaType === "movie" ? "ФІЛЬМ" : "СЕРІАЛ"}
          {spotlight.year ? `  /  ${spotlight.year}` : ""}
        </Text>
        <Text style={s.title} numberOfLines={3}>
          {spotlight.title}
        </Text>
        <View style={s.actions}>
          <MotionPressable
            style={s.primary}
            onPress={() => onSelect(spotlight)}
          >
            <Text style={s.primaryText}>Відкрити історію</Text>
            <Ionicons name="arrow-forward" size={18} color="#11251a" />
          </MotionPressable>
          <MotionPressable
            accessibilityLabel={
              isSaved(spotlight) ? "Змінити списки" : "Додати до списку"
            }
            style={s.save}
            onPress={() => onLongPress(spotlight)}
          >
            <Ionicons
              name={isSaved(spotlight) ? "bookmark" : "bookmark-outline"}
              size={22}
              color="#fff"
            />
          </MotionPressable>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  hero: {
    borderRadius: 28,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: 22,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "rgba(12,20,15,.65)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#a4ebc1" },
  tagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  content: { gap: 12, paddingTop: 140 },
  meta: {
    color: "#ffffffb8",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "600",
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.1,
    fontWeight: "700",
    color: "#fff",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  primary: {
    backgroundColor: "#a4ebc1",
    borderRadius: 16,
    minHeight: 52,
    padding: 14,
    flex: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: { color: "#11251a", fontSize: 14, fontWeight: "700" },
  save: {
    width: 52,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#ffffff24",
    alignItems: "center",
    justifyContent: "center",
  },
});
