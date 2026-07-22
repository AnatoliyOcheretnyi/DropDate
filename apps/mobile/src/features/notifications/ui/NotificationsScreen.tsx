import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { AnimatedSection } from "../../../shared/ui/AnimatedScreen";
import { queryKeys } from "../../../shared/api/queryKeys";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import {
  getNotifications,
  markNotificationsRead,
  notificationCopy,
  type NotificationItem,
} from "../api/notifications";
const targetOf = (item: NotificationItem): Href => {
  if (
    item.eventType === "friend_request" ||
    item.eventType === "friend_accepted"
  )
    return "/friends" as Href;
  if (item.eventType === "game_challenge") return "/games" as Href;
  if (
    item.tmdbId > 0 &&
    (item.mediaType === "movie" || item.mediaType === "tv")
  )
    return `/title/${item.mediaType}/${item.tmdbId}` as Href;
  return "/notifications" as Href;
};
export function NotificationsScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const query = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ signal }) => getNotifications(signal),
  });
  const read = useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
  if (query.isLoading) return <ScreenState loading title="Оновлюємо події" />;
  if (query.isError)
    return (
      <ScreenState
        title="Сповіщення недоступні"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <FeatureScreen
      title="Сповіщення"
      subtitle={`${query.data?.unreadCount ?? 0} непрочитаних`}
    >
      {(query.data?.unreadCount ?? 0) > 0 ? (
        <MotionPressable
          style={styles.readAll}
          onPress={() => read.mutate(undefined)}
          haptic="success"
        >
          <Text style={styles.readAllText}>Прочитати все</Text>
        </MotionPressable>
      ) : null}
      {query.data?.items.length ? (
        query.data.items.map((item, index) => (
          <AnimatedSection key={item.id} index={index}>
            <MotionPressable
              style={[styles.card, !item.readAt && styles.unread]}
              onPress={() => {
                if (!item.readAt) read.mutate([item.id]);
                router.push(targetOf(item));
              }}
            >
              {item.posterUrl ? (
                <Image source={{ uri: item.posterUrl }} style={styles.poster} />
              ) : (
                <View style={styles.icon}>
                  <Ionicons
                    name={
                      item.eventType.startsWith("friend")
                        ? "people"
                        : item.eventType === "game_challenge"
                          ? "game-controller"
                          : "notifications"
                    }
                    size={22}
                    color={colors.accent}
                  />
                </View>
              )}
              <View style={styles.grow}>
                <Text style={styles.title}>{notificationCopy(item)}</Text>
                {item.episodeName?.includes("\n") ? (
                  <Text numberOfLines={2} style={styles.body}>
                    {item.episodeName.split("\n").slice(1).join(" ")}
                  </Text>
                ) : null}
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString("uk-UA", {
                    day: "numeric",
                    month: "long",
                  })}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </MotionPressable>
          </AnimatedSection>
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={styles.title}>Тут поки тихо</Text>
          <Text style={styles.body}>
            Релізи, друзі, рекомендації та виклики з’являться тут.
          </Text>
        </View>
      )}
    </FeatureScreen>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    readAll: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: c.accent,
    },
    readAllText: { color: c.background, fontWeight: "900" },
    card: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    unread: { borderColor: c.accent, backgroundColor: c.accentSoft },
    poster: { width: 48, height: 66, borderRadius: 12 },
    icon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.elevated,
    },
    grow: { flex: 1 },
    title: { color: c.text, fontSize: 16, fontWeight: "900" },
    body: { color: c.textMuted, lineHeight: 19, marginTop: 3 },
    date: { color: c.textMuted, fontSize: 11, marginTop: 6 },
    empty: { padding: 26, gap: 7, borderRadius: 20, backgroundColor: c.card },
  });
