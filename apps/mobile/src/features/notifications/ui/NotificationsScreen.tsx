import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { queryKeys } from "../../../shared/api/queryKeys";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import {
  getNotifications,
  markNotificationsRead,
  notificationCopy,
  type NotificationItem,
  type NotificationsResponse,
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
    // Apply the read state locally straight away: the user usually taps a
    // notification and navigates off the screen in the same gesture, so
    // waiting for the round-trip left the card looking unread on return.
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: queryKeys.notifications });
      const previous = client.getQueryData<NotificationsResponse>(
        queryKeys.notifications,
      );
      client.setQueryData<NotificationsResponse>(
        queryKeys.notifications,
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          const all = !ids || ids.length === 0;
          const target = new Set(ids ?? []);
          const items = old.items.map((item) =>
            (all || target.has(item.id)) && !item.readAt
              ? { ...item, readAt: now }
              : item,
          );
          return {
            ...old,
            items,
            unreadCount: items.filter((item) => !item.readAt).length,
          };
        },
      );
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) {
        client.setQueryData(queryKeys.notifications, context.previous);
      }
    },
    onSettled: () =>
      client.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  // Snapshot which notifications were unread the moment the screen first got
  // data, before we mark them read. Opening the screen is the acknowledgement,
  // but we still want the user to see what was new during this visit, so the
  // highlight is driven by this snapshot rather than the live `readAt`.
  const newThisVisit = useRef<Set<string> | null>(null);
  if (newThisVisit.current === null && query.data) {
    newThisVisit.current = new Set(
      query.data.items.filter((item) => !item.readAt).map((item) => item.id),
    );
  }

  // Mark everything read as soon as the screen has data — that clears the bell
  // badge without the user having to tap each item.
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || !query.data) return;
    marked.current = true;
    if (query.data.items.some((item) => !item.readAt)) {
      read.mutate(undefined);
    }
  }, [query.data, read]);

  if (query.isLoading) return <ScreenState loading title="Оновлюємо події" />;
  if (query.isError)
    return (
      <ScreenState
        title="Сповіщення недоступні"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  const newCount = newThisVisit.current?.size ?? 0;

  return (
    <FeatureScreen
      title="Сповіщення"
      subtitle={newCount ? `${newCount} нових` : "Усі прочитані"}
      animateLayout={false}
    >
      {query.data?.items.length ? (
        query.data.items.map((item) => (
          <MotionPressable
            key={item.id}
            style={[
              styles.card,
              newThisVisit.current?.has(item.id) && styles.unread,
            ]}
            onPress={() => router.push(targetOf(item))}
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
