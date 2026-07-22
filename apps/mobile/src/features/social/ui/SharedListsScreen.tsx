import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { queryKeys } from "../../../shared/api/queryKeys";
import { getSharedLists } from "../api/social";
export default function SharedListsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const q = useQuery({
    queryKey: queryKeys.sharedLists,
    queryFn: ({ signal }) => getSharedLists(signal),
  });
  return (
    <FeatureScreen
      title="Спільні списки"
      subtitle="Добірки, які ви збираєте разом."
    >
      {q.isLoading ? (
        <ScreenState loading title="Завантажуємо списки" />
      ) : q.data?.length ? (
        q.data.map((list) => (
          <MotionPressable
            key={list.ID}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/shared-list/[id]",
                params: { id: list.ID, name: list.Name },
              } as Href)
            }
          >
            <Text style={styles.kicker}>
              {list.Visibility === "public"
                ? "ПУБЛІЧНИЙ"
                : list.Visibility === "friends"
                  ? "ДЛЯ ДРУЗІВ"
                  : "ПРИВАТНИЙ"}
            </Text>
            <Text style={styles.title}>{list.Name}</Text>
            <Text style={styles.meta}>
              {list.ItemCount} тайтлів · {list.MemberCount} учасників
            </Text>
          </MotionPressable>
        ))
      ) : (
        <ScreenState
          title="Списків поки немає"
          message="Створи перший у розділі активності друзів."
        />
      )}
    </FeatureScreen>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: 6,
      padding: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    kicker: {
      color: c.accent,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    title: { color: c.text, fontSize: 20, fontWeight: "900" },
    meta: { color: c.textMuted },
  });
