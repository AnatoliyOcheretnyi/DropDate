import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type { Details } from "../../../../shared/types/release";
import { colors } from "../../../../shared/theme/colors";
import { copy } from "../../../../shared/strings";

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
  return (
    <>
      <View style={styles.banner}>
        {details?.backdropUrl ? (
          <Image
            source={{ uri: details.backdropUrl }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.bannerFallback} />
        )}
      </View>

      <View style={styles.hero}>
        <View style={styles.poster}>
          {details?.posterUrl ? (
            <Image
              source={{ uri: details.posterUrl }}
              style={styles.posterImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.posterFallback} />
          )}
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.eyebrow}>
            {details?.mediaType === "movie"
              ? copy.details.facts.movie
              : copy.details.facts.series}
          </Text>
          <Text style={styles.title}>{details?.title}</Text>
          <Text style={styles.tagline}>{details?.tagline || " "}</Text>
          <Text style={styles.overview}>
            {details?.overview || copy.hints.noOverview}
          </Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={onAdd}>
              <Text style={styles.actionButtonText}>
                {details &&
                isSaved({
                  id: details.id,
                  title: details.title,
                  mediaType: details.mediaType,
                })
                  ? copy.actions.inList
                  : copy.actions.addToList}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 280,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerFallback: {
    flex: 1,
    backgroundColor: "rgba(80,255,190,0.1)",
  },
  hero: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: -80,
    gap: 16,
  },
  poster: {
    width: 140,
    height: 210,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  posterFallback: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 4,
    color: colors.textMuted,
    fontSize: 11,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 12,
  },
  overview: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  actionButtonText: {
    color: "#001b12",
    fontWeight: "700",
  },
});
