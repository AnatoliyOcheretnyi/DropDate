import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { PosterCard } from "../components/PosterCard";
import { colors } from "../theme/colors";
import type { Details, ReleaseInfo, Suggestion } from "../types/release";
import { getReleaseStatusLabel } from "../types/release";
import { getBackendURL } from "../utils/config";
import { buildFallbackRelease } from "../utils/release";
import { useSaved } from "../state/SavedContext";

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
  recommendations?: Suggestion[];
};

const formatDate = (value?: string) => {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

export default function DetailsScreen() {
  const { mediaType, id } = useLocalSearchParams<{
    mediaType: string;
    id: string;
  }>();
  const router = useRouter();
  const backendURL = useMemo(() => getBackendURL(), []);
  const { addRelease, isSuggestionSaved } = useSaved();

  const [details, setDetails] = useState<Details | null>(null);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [recommendations, setRecommendations] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!id || (mediaType !== "movie" && mediaType !== "tv")) {
      setError("Невірний запит.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${backendURL}/details?tmdbId=${id}&mediaType=${mediaType}`,
        {
          headers: { accept: "application/json" },
        }
      );
      const payload = (await response.json()) as DetailsPayload;
      if (!response.ok) {
        setError("Не вдалося завантажити деталі.");
        return;
      }
      setDetails(payload.details);
      setRelease(payload.release || null);
      setRecommendations(payload.recommendations || []);
    } catch {
      setError("Не вдалося завантажити деталі.");
    } finally {
      setIsLoading(false);
    }
  }, [backendURL, id, mediaType]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const handleAdd = useCallback(() => {
    if (!details) {
      return;
    }
    const releaseInfo =
      release || buildFallbackRelease(details, details.mediaType);
    if (!releaseInfo) {
      return;
    }
    addRelease(releaseInfo, {
      tmdbId: details.id,
      mediaType: details.mediaType,
      details,
    });
  }, [addRelease, details, release]);

  if (isLoading && !details) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.bannerSkeleton} />
        <View style={styles.content}>
          <View style={styles.posterSkeleton} />
          <View style={styles.textSkeleton} />
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.banner}>
          {details?.backdropUrl ? (
            <Image
              source={{ uri: details.backdropUrl }}
              style={styles.bannerImage}
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
              />
            ) : (
              <View style={styles.posterFallback} />
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.eyebrow}>
              {details?.mediaType === "movie" ? "movie" : "series"}
            </Text>
            <Text style={styles.title}>{details?.title}</Text>
            <Text style={styles.tagline}>{details?.tagline || " "}</Text>
            <Text style={styles.overview}>
              {details?.overview || "Опис поки відсутній."}
            </Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionButton} onPress={handleAdd}>
                <Text style={styles.actionButtonText}>
                  {details &&
                  isSuggestionSaved({
                    id: details.id,
                    title: details.title,
                    mediaType: details.mediaType,
                  })
                    ? "У списку"
                    : "Додати у список"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {details && (
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Статус</Text>
              <Text style={styles.metaValue}>{details.status || "—"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Реліз</Text>
              <Text style={styles.metaValue}>
                {formatDate(details.releaseDate || details.firstAirDate)}
              </Text>
            </View>
            {details.nextAirDate ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Наступна серія</Text>
                <Text style={styles.metaValue}>
                  {formatDate(details.nextAirDate)}
                </Text>
              </View>
            ) : null}
            {details.lastAirDate ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Остання серія</Text>
                <Text style={styles.metaValue}>
                  {formatDate(details.lastAirDate)}
                </Text>
              </View>
            ) : null}
            {details.genres?.length ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Жанри</Text>
                <Text style={styles.metaValue}>
                  {details.genres.join(", ")}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {release ? (
          <View style={styles.releaseCard}>
            <Text style={styles.sectionTitle}>Наступний реліз</Text>
            <Text style={styles.releaseLabel}>
              {getReleaseStatusLabel(release.status, release.type)}
            </Text>
            <Text style={styles.releaseDate}>
              {formatDate(release.nextRelease)}
            </Text>
          </View>
        ) : null}

        {recommendations.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Схожі тайтли</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}
            >
              {recommendations.map((item) => (
                <PosterCard
                  key={`${item.mediaType}-${item.id}`}
                  item={item}
                  onPress={(selected) =>
                    router.push(`/title/${selected.mediaType}/${selected.id}`)
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingBottom: 32,
  },
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
  metaCard: {
    marginTop: 24,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  releaseCard: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  releaseLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  releaseDate: {
    color: colors.text,
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    gap: 12,
    paddingRight: 12,
  },
  error: {
    color: colors.error,
    marginHorizontal: 20,
    marginTop: 12,
  },
  bannerSkeleton: {
    height: 280,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  content: {
    padding: 20,
    gap: 12,
  },
  posterSkeleton: {
    width: 140,
    height: 210,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  textSkeleton: {
    height: 18,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
