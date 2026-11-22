import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { Details } from "../../../../shared/types/release";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
type Props = {
  details: Details | null;
  onAdd: () => void;
  isSaved: (suggestion: {
    id: number;
    title: string;
    mediaType: Details["mediaType"];
  }) => boolean;
};
export function DetailsHero({ details, onAdd, isSaved }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  if (!details) return null;
  return (
    <>
      <View
        style={{
          height: Math.min(width * 0.88, 460),
          backgroundColor: colors.elevated,
        }}
      >
        <Image
          source={{ uri: details.backdropUrl || details.posterUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
        />
        <LinearGradient
          colors={["#00000050", "transparent", colors.background]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.posterWrap}>
          <Image
            source={{ uri: details.posterUrl }}
            style={s.poster}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />
        </View>
      </View>
      <View style={s.content}>
        <Text style={[s.eyebrow, { color: colors.accent }]}>
          {details.mediaType === "movie" ? "ФІЛЬМ" : "СЕРІАЛ"} /{" "}
          {(details.releaseDate || details.firstAirDate || "").slice(0, 4) ||
            "НЕЗАБАРОМ"}
        </Text>
        <Text
          accessibilityRole="header"
          style={[s.title, { color: colors.text }]}
        >
          {details.title}
        </Text>
        {details.translation?.fields.includes("title") &&
        details.translation.originalTitle ? (
          <Text style={[s.tagline, { color: colors.textMuted }]}>
            {details.translation.originalTitle}
          </Text>
        ) : null}
        {details.tagline ? (
          <Text style={[s.tagline, { color: colors.textMuted }]}>
            {details.tagline}
          </Text>
        ) : null}
        <MotionPressable
          accessibilityLabel={`Списки для ${details.title}`}
          onPress={onAdd}
          style={[s.action, { backgroundColor: colors.accent }]}
        >
          <Ionicons
            name={isSaved(details) ? "bookmark" : "bookmark-outline"}
            size={20}
            color={colors.isDark ? "#10281c" : "#fff"}
          />
          <Text
            style={[
              s.actionText,
              { color: colors.isDark ? "#10281c" : "#fff" },
            ]}
          >
            {isSaved(details) ? "У твоїй колекції" : "Додати до колекції"}
          </Text>
        </MotionPressable>
        <Text style={[s.overview, { color: colors.lead }]}>
          {details.overview || "Опис цієї історії ще готується."}
        </Text>
        {details.translation?.fields.length ? (
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            Автоматичний переклад
          </Text>
        ) : null}
      </View>
    </>
  );
}
const s = StyleSheet.create({
  posterWrap: { position: "absolute", bottom: 8, left: 24 },
  poster: { width: 112, height: 168, borderRadius: 18 },
  content: { padding: 24, paddingTop: 10, gap: 14 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  title: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "700",
    letterSpacing: -1.2,
  },
  tagline: { fontSize: 16, lineHeight: 23, fontStyle: "italic" },
  overview: { fontSize: 16, lineHeight: 26, marginTop: 8 },
  action: {
    minHeight: 54,
    padding: 16,
    borderRadius: 17,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  actionText: { fontSize: 15, fontWeight: "700" },
});
