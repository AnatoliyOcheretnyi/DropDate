import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { copy } from "../../../../shared/strings";
import type { Suggestion } from "../../../../shared/types/release";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import { PosterCard } from "../../../../shared/ui/PosterCard";
import { SpotlightSkeleton } from "../../../../shared/ui/Shimmer";

type Props = {
  spotlight: Suggestion | null;
  supporting: Suggestion[];
  onSelect: (item: Suggestion) => void;
  onLongPress: (item: Suggestion) => void;
  isSaved: (item: Suggestion) => boolean;
  isLoading: boolean;
};

const SUPPORT_GAP = 12;
const SCREEN_PADDING = 20;
/** Poster art is 2:3; anything taller than this crops faces off the top. */
const HERO_RATIO = 1.32;
const HERO_MAX_HEIGHT = 460;

const mediaLabel = (item: Suggestion) =>
  `${item.mediaType === "movie" ? copy.mediaType.movie : copy.mediaType.series}${item.year ? ` · ${item.year}` : ""}`;

export function HomeSpotlight({
  spotlight,
  supporting,
  onSelect,
  onLongPress,
  isSaved,
  isLoading,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Read live, not at module scope: split view, rotation and foldables all
  // change this after the bundle has been evaluated.
  const { width } = useWindowDimensions();

  const contentWidth = width - SCREEN_PADDING * 2;
  const supportWidth = (contentWidth - SUPPORT_GAP * 2) / 3;
  const supportingSize = useMemo(
    () => ({ width: supportWidth, height: supportWidth * 1.5 }),
    [supportWidth],
  );
  const heroHeight = Math.min(contentWidth * HERO_RATIO, HERO_MAX_HEIGHT);

  if (isLoading && !spotlight) {
    return <SpotlightSkeleton heroHeight={heroHeight} />;
  }

  return (
    <View style={styles.wrap}>
      {spotlight ? (
        <MotionPressable
          style={[styles.feature, { height: heroHeight }]}
          onPress={() => onSelect(spotlight)}
          onLongPress={() => onLongPress(spotlight)}
          haptic="none"
          accessibilityLabel={`Головна премʼєра: ${spotlight.title}. ${mediaLabel(spotlight)}`}
        >
          {spotlight.posterUrl ? (
            <Image
              source={{ uri: spotlight.posterUrl }}
              style={styles.featureImage}
              contentFit="cover"
              contentPosition="top"
              transition={280}
              cachePolicy="memory-disk"
              priority="high"
              recyclingKey={`${spotlight.mediaType}-${spotlight.id}`}
            />
          ) : (
            <View style={styles.featureFallback}>
              <Text style={styles.featureFallbackText}>
                {spotlight.title.slice(0, 1)}
              </Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(4,6,14,0.35)", "rgba(4,6,14,0.92)"]}
            locations={[0, 0.5, 1]}
            style={styles.featureScrim}
            pointerEvents="none"
          />
          <View style={styles.featureContent}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Головна премʼєра</Text>
            </View>
            <Text style={styles.featureTitle} numberOfLines={2}>
              {spotlight.title}
            </Text>
            <Text style={styles.featureMeta}>{mediaLabel(spotlight)}</Text>
          </View>
        </MotionPressable>
      ) : null}

      {supporting.length > 0 ? (
        <View style={styles.supportingRow}>
          {supporting.slice(0, 3).map((item) => (
            <PosterCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onPress={onSelect}
              onLongPress={onLongPress}
              isSaved={isSaved(item)}
              size={supportingSize}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      gap: 16,
    },
    feature: {
      borderRadius: 26,
      overflow: "hidden",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    featureImage: {
      width: "100%",
      height: "100%",
    },
    featureFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    featureFallbackText: {
      color: colors.text,
      fontSize: 64,
      fontWeight: "800",
    },
    featureScrim: {
      ...StyleSheet.absoluteFillObject,
    },
    featureContent: {
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 20,
      gap: 8,
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    badgeText: {
      color: "#04140f",
      fontSize: 12,
      fontWeight: "800",
    },
    featureTitle: {
      color: "#ffffff",
      fontSize: 26,
      fontWeight: "900",
    },
    featureMeta: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: "600",
    },
    supportingRow: {
      flexDirection: "row",
      gap: SUPPORT_GAP,
    },
  });
