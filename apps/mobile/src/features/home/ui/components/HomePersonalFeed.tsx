import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import { queryKeys } from "../../../../shared/api/queryKeys";
import { useAuthStore } from "../../../auth/store/authStore";
import {
  getContinueWatching,
  getDailyPick,
  updateDailyPick,
} from "../../api/personalHome";

export function HomePersonalFeed() {
  const authed = useAuthStore((s) => Boolean(s.user && s.accessToken));
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const client = useQueryClient();
  const daily = useQuery({
    queryKey: queryKeys.dailyPick,
    queryFn: ({ signal }) => getDailyPick(signal),
    enabled: authed,
    // Cache for the day: once you've made a choice on this device it stays put
    // and does not flip to another device's choice mid-session. A cold start
    // still fetches fresh.
    staleTime: 43_200_000,
  });
  const continuing = useQuery({
    queryKey: queryKeys.continueWatching,
    queryFn: ({ signal }) => getContinueWatching(signal),
    enabled: authed,
    staleTime: 60_000,
  });
  const update = useMutation({
    mutationFn: updateDailyPick,
    onSuccess: (value) => client.setQueryData(queryKeys.dailyPick, value),
  });
  if (!authed) return null;
  const pick = daily.data?.pick;
  return (
    <View style={styles.root}>
      {pick ? (
        <View style={styles.daily}>
          {pick.posterUrl && daily.data?.revealed ? (
            <Image
              source={{ uri: pick.posterUrl }}
              style={styles.dailyPoster}
              contentFit="cover"
              transition={220}
              cachePolicy="memory-disk"
            />
          ) : null}
          <View style={styles.grow}>
            <Text style={styles.kicker}>ПІК ДНЯ</Text>
            <Text style={styles.title}>
              {daily.data?.revealed
                ? pick.title
                : "Одна персональна рекомендація. Без спойлерів."}
            </Text>
            {daily.data?.revealed ? (
              <Text style={styles.meta}>
                {[pick.year, pick.reason?.text].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {!daily.data?.revealed ? (
                <Action
                  label="Відкрити"
                  onPress={() =>
                    update.mutate({
                      date: daily.data!.date,
                      revealed: true,
                      action: daily.data!.action,
                    })
                  }
                />
              ) : (
                <>
                  <Action
                    label="Деталі"
                    onPress={() =>
                      router.push(
                        `/title/${pick.mediaType}/${pick.tmdbId}` as Href,
                      )
                    }
                  />
                  <Action
                    label={
                      daily.data?.action === "disliked" ? "Не моє ✓" : "Не моє"
                    }
                    muted
                    onPress={() =>
                      update.mutate({
                        date: daily.data!.date,
                        revealed: true,
                        action: "disliked",
                      })
                    }
                  />
                </>
              )}
            </View>
          </View>
        </View>
      ) : null}
      {continuing.data?.length ? (
        <View>
          <Text style={styles.sectionTitle}>Продовжити перегляд</Text>
          <View style={styles.rail}>
            {continuing.data.slice(0, 4).map((item) => (
              <MotionPressable
                key={item.tmdbId}
                style={styles.continueCard}
                onPress={() => router.push(`/title/tv/${item.tmdbId}` as Href)}
              >
                {item.posterUrl ? (
                  <Image
                    source={{ uri: item.posterUrl }}
                    style={styles.poster}
                    contentFit="cover"
                    transition={220}
                    cachePolicy="memory-disk"
                  />
                ) : null}
                <View style={styles.grow}>
                  <Text numberOfLines={1} style={styles.itemTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.meta}>
                    S{item.seasonNumber} · E{item.episodeNumber}
                  </Text>
                </View>
              </MotionPressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
function Action({
  label,
  onPress,
  muted,
}: {
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <MotionPressable
      style={[
        base.action,
        { backgroundColor: muted ? colors.elevated : colors.accent },
      ]}
      onPress={onPress}
    >
      <Text
        style={{
          fontWeight: "900",
          color: muted ? colors.text : colors.background,
        }}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}
const base = StyleSheet.create({
  action: {
    minHeight: 42,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
});
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { gap: 20 },
    daily: {
      minHeight: 170,
      overflow: "hidden",
      flexDirection: "row",
      gap: 14,
      padding: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    dailyPoster: { width: 92, height: 138, borderRadius: 15 },
    grow: { flex: 1 },
    kicker: {
      color: c.accent,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.5,
    },
    title: {
      color: c.text,
      fontSize: 20,
      fontWeight: "900",
      lineHeight: 25,
      marginTop: 7,
    },
    meta: { color: c.textMuted, fontSize: 12, lineHeight: 17, marginTop: 5 },
    actions: { flexDirection: "row", gap: 8, marginTop: 13 },
    sectionTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 10,
    },
    rail: { gap: 8 },
    continueCard: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 8,
      borderRadius: 18,
      backgroundColor: c.card,
    },
    poster: { width: 42, height: 56, borderRadius: 10 },
    itemTitle: { color: c.text, fontWeight: "800" },
  });
