import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { Suggestion } from "../../../shared/types/release";
import { apiRequest } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { useSaved } from "../../saved/hooks/useSaved";
type Item = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl?: string;
};
export function WheelScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { saved } = useSaved();
  const home = useQuery({
    queryKey: queryKeys.home(18),
    queryFn: ({ signal }) =>
      apiRequest<{
        popular?: { movies?: Suggestion[]; series?: Suggestion[] };
      }>("/home?limit=18", { signal }),
    staleTime: 300_000,
  });
  const watchlist: Item[] = saved
    .filter((x) => x.listTypes.includes("watchlist"))
    .map((x) => ({
      id: x.tmdbId,
      mediaType: x.mediaType,
      title: x.title,
      posterUrl: x.posterUrl,
    }));
  const popular = [
    ...(home.data?.popular?.movies ?? []),
    ...(home.data?.popular?.series ?? []),
  ].map((x) => ({
    id: x.id,
    mediaType: x.mediaType,
    title: x.title,
    posterUrl: x.posterUrl,
  }));
  const source = (watchlist.length >= 2 ? watchlist : popular).slice(0, 16);
  const [result, setResult] = useState<Item | null>(null);
  const [spinning, setSpinning] = useState(false);
  const rotation = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const spin = () => {
    if (spinning || source.length < 2) return;
    setResult(null);
    setSpinning(true);
    const winner = source[Math.floor(Math.random() * source.length)];
    rotation.value = withTiming(rotation.value + 1440 + Math.random() * 360, {
      duration: 2600,
      easing: Easing.out(Easing.cubic),
    });
    setTimeout(() => {
      setResult(winner);
      setSpinning(false);
    }, 2650);
  };
  return (
    <FeatureScreen
      title="Колесо вечора"
      subtitle={
        watchlist.length >= 2
          ? "Крутимо твій список «Хочу подивитись»."
          : "Поки у списку мало тайтлів — крутимо популярне."
      }
    >
      <View style={styles.stage}>
        <Animated.View style={[styles.wheel, animated]}>
          {source.slice(0, 8).map((item, index) => (
            <View
              key={`${item.mediaType}:${item.id}`}
              style={[
                styles.segment,
                {
                  transform: [
                    { rotate: `${index * 45}deg` },
                    { translateY: -92 },
                  ],
                },
              ]}
            >
              <Text numberOfLines={1} style={styles.segmentText}>
                {item.title}
              </Text>
            </View>
          ))}
        </Animated.View>
        <View style={styles.pointer} />
        <MotionPressable
          disabled={spinning || source.length < 2}
          style={styles.spin}
          onPress={spin}
          haptic="success"
        >
          <Text style={styles.spinText}>{spinning ? "…" : "КРУТИТИ"}</Text>
        </MotionPressable>
      </View>
      {result ? (
        <View style={styles.result}>
          {result.posterUrl ? (
            <Image source={{ uri: result.posterUrl }} style={styles.poster} />
          ) : null}
          <Text style={styles.resultKicker}>Сьогодні дивишся</Text>
          <Text style={styles.title}>{result.title}</Text>
          <MotionPressable
            style={styles.primary}
            onPress={() =>
              router.push(`/title/${result.mediaType}/${result.id}` as Href)
            }
          >
            <Text style={styles.primaryText}>Відкрити тайтл</Text>
          </MotionPressable>
          <MotionPressable style={styles.again} onPress={spin}>
            <Text style={styles.againText}>Перекрутити</Text>
          </MotionPressable>
        </View>
      ) : null}
    </FeatureScreen>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    stage: { height: 330, alignItems: "center", justifyContent: "center" },
    wheel: {
      width: 270,
      height: 270,
      borderRadius: 135,
      borderWidth: 8,
      borderColor: c.accent,
      backgroundColor: c.card,
    },
    segment: {
      position: "absolute",
      left: 85,
      top: 115,
      width: 100,
      alignItems: "center",
    },
    segmentText: {
      color: c.text,
      fontSize: 10,
      fontWeight: "800",
      width: 90,
      textAlign: "center",
    },
    pointer: {
      position: "absolute",
      top: 16,
      width: 0,
      height: 0,
      borderLeftWidth: 12,
      borderRightWidth: 12,
      borderTopWidth: 25,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: c.error,
    },
    spin: {
      position: "absolute",
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accent,
    },
    spinText: { color: c.background, fontWeight: "900" },
    result: {
      alignItems: "center",
      gap: 12,
      padding: 18,
      borderRadius: 24,
      backgroundColor: c.card,
    },
    poster: { width: 150, height: 225, borderRadius: 18 },
    resultKicker: {
      color: c.accent,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    title: {
      color: c.text,
      fontSize: 23,
      fontWeight: "900",
      textAlign: "center",
    },
    primary: {
      alignSelf: "stretch",
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      backgroundColor: c.accent,
    },
    primaryText: { color: c.background, fontWeight: "900" },
    again: { minHeight: 44, justifyContent: "center" },
    againText: { color: c.textMuted, fontWeight: "800" },
  });
