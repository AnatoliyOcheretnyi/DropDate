import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { queryKeys } from "../../../shared/api/queryKeys";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { useAuthStore } from "../../auth/store/authStore";
import { getChallenges } from "../api/games";
export function ChallengeInbox() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const q = useQuery({
    queryKey: queryKeys.gameChallenges,
    queryFn: ({ signal }) => getChallenges(signal),
    enabled: Boolean(user),
  });
  const pending = (q.data ?? []).filter(
    (x) => x.opponentId === user?.id && x.opponentScore == null,
  );
  if (!pending.length) return null;
  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Виклики для тебе</Text>
      {pending.map((x) => (
        <MotionPressable
          key={x.id}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/games",
              params: { challengeId: x.id, mode: x.gameId },
            } as Href)
          }
        >
          <Ionicons name="flash" color={colors.accent} size={22} />
          <View style={styles.grow}>
            <Text style={styles.title}>{label(x.gameId)}</Text>
            <Text style={styles.meta}>
              10 однакових раундів · зіграти зараз
            </Text>
          </View>
          <Ionicons name="play-circle" color={colors.accent} size={27} />
        </MotionPressable>
      ))}
    </View>
  );
}
function label(mode: string) {
  return mode === "rating" ? "Вищий рейтинг" : "Що вийшло раніше?";
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { gap: 8 },
    heading: { color: c.text, fontSize: 20, fontWeight: "900" },
    card: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      padding: 14,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
    },
    grow: { flex: 1 },
    title: { color: c.text, fontWeight: "900" },
    meta: { color: c.textMuted, fontSize: 12, marginTop: 3 },
  });
