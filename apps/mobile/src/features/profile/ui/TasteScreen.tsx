import { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { queryKeys } from "../../../shared/api/queryKeys";
import {
  compareTaste,
  getTaste,
  getTastePair,
  getTasteStatus,
  updateTasteStatus,
  type TasteKind,
} from "../api/taste";
export default function TasteScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [kind, setKind] = useState<TasteKind>("genre");
  const client = useQueryClient();
  const router = useRouter();
  const ranking = useQuery({
    queryKey: queryKeys.taste(kind),
    queryFn: ({ signal }) => getTaste(kind, signal),
  });
  const pair = useQuery({
    queryKey: queryKeys.tasteNext(kind),
    queryFn: ({ signal }) => getTastePair(kind, signal),
  });
  const status = useQuery({
    queryKey: queryKeys.tasteOnboarding,
    queryFn: ({ signal }) => getTasteStatus(signal),
  });
  const compare = useMutation({
    mutationFn: (winner: "left" | "right" | "tie") =>
      compareTaste(kind, pair.data!, winner),
    onSuccess: async (next) => {
      client.setQueryData(queryKeys.tasteNext(kind), next);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.taste(kind) }),
        client.invalidateQueries({ queryKey: queryKeys.tasteOnboarding }),
        client.invalidateQueries({ queryKey: queryKeys.recommendations }),
      ]);
    },
  });
  const feedback = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      updateTasteStatus(payload),
    onSuccess: (next) => {
      client.setQueryData(queryKeys.tasteOnboarding, next);
      void client.invalidateQueries({ queryKey: queryKeys.recommendations });
    },
  });
  return (
    <FeatureScreen
      title="Твій кінопочерк"
      subtitle="Порівнюй жанри й країни — рекомендації одразу навчаються на сервері."
    >
      <View style={styles.segment}>
        {(["genre", "country"] as const).map((x) => (
          <MotionPressable
            key={x}
            style={[styles.tab, kind === x && styles.active]}
            onPress={() => setKind(x)}
          >
            <Text
              style={[styles.tabText, kind === x && { color: colors.accent }]}
            >
              {x === "genre" ? "Жанри" : "Країни"}
            </Text>
          </MotionPressable>
        ))}
      </View>
      {pair.isLoading ? (
        <ScreenState loading title="Готуємо пару" />
      ) : pair.data ? (
        <View style={styles.duel}>
          <Text style={styles.kicker}>ЩО БЛИЖЧЕ?</Text>
          <Choice
            label={pair.data.left}
            onPress={() => compare.mutate("left")}
          />
          <Text style={styles.or}>або</Text>
          <Choice
            label={pair.data.right}
            onPress={() => compare.mutate("right")}
          />
          <MotionPressable
            style={styles.tie}
            onPress={() => compare.mutate("tie")}
          >
            <Text style={styles.tabText}>Однаково</Text>
          </MotionPressable>
        </View>
      ) : null}
      {ranking.data?.length ? (
        <View style={styles.ranking}>
          <Text style={styles.heading}>Твій рейтинг</Text>
          {ranking.data.slice(0, 8).map((item, index) => (
            <View key={item.id} style={styles.rank}>
              <Text style={styles.number}>{index + 1}</Text>
              <Text style={styles.rankName}>{item.id}</Text>
              <Text style={styles.conf}>
                {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {status.data?.titles?.length && !status.data.completed ? (
        <View style={styles.ranking}>
          <Text style={styles.heading}>Калібрування тайтлами</Text>
          {status.data.titles.slice(0, 5).map((title) => (
            <View
              key={`${title.mediaType}-${title.tmdbId}`}
              style={styles.titleRow}
            >
              {title.posterUrl ? (
                <Image
                  source={{ uri: title.posterUrl }}
                  style={styles.poster}
                />
              ) : null}
              <MotionPressable
                style={styles.grow}
                onPress={() =>
                  router.push(
                    `/title/${title.mediaType}/${title.tmdbId}` as Href,
                  )
                }
              >
                <Text style={styles.rankName}>{title.title}</Text>
                <Text style={styles.conf}>{title.year}</Text>
              </MotionPressable>
              <MotionPressable
                style={styles.love}
                onPress={() =>
                  feedback.mutate(
                    { action: "feedback", ...title, sentiment: "liked" },
                    { onError: (e) => Alert.alert("Помилка", e.message) },
                  )
                }
              >
                <Text>♥</Text>
              </MotionPressable>
            </View>
          ))}
        </View>
      ) : null}
    </FeatureScreen>
  );
}
function Choice({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <MotionPressable
      style={[
        base.choice,
        { borderColor: colors.accent, backgroundColor: colors.accentSoft },
      ]}
      onPress={onPress}
    >
      <Text
        style={{
          color: colors.text,
          fontWeight: "900",
          fontSize: 19,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}
const base = StyleSheet.create({
  choice: {
    minHeight: 78,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
});
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    segment: {
      flexDirection: "row",
      gap: 7,
      padding: 5,
      borderRadius: 18,
      backgroundColor: c.card,
    },
    tab: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
    },
    active: { backgroundColor: c.elevated },
    tabText: { color: c.textMuted, fontWeight: "800" },
    duel: { gap: 9, padding: 18, borderRadius: 24, backgroundColor: c.card },
    kicker: {
      color: c.accent,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.4,
      textAlign: "center",
    },
    or: { color: c.textMuted, textAlign: "center" },
    tie: { minHeight: 42, alignItems: "center", justifyContent: "center" },
    ranking: { gap: 8, padding: 17, borderRadius: 22, backgroundColor: c.card },
    heading: {
      color: c.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 4,
    },
    rank: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    number: { width: 25, color: c.accent, fontWeight: "900" },
    rankName: { flex: 1, color: c.text, fontWeight: "800" },
    conf: { color: c.textMuted, fontSize: 12 },
    titleRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    poster: { width: 40, height: 56, borderRadius: 9 },
    grow: { flex: 1 },
    love: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: c.accentSoft,
    },
  });
