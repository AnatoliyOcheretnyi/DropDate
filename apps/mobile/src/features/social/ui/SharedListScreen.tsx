import { useMemo } from "react";
import { Image, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { queryKeys } from "../../../shared/api/queryKeys";
import { getPublicSharedList, getSharedListItems } from "../api/social";

export default function SharedListScreen({
  publicMode = false,
}: {
  publicMode?: boolean;
}) {
  const params = useLocalSearchParams<{
    id?: string;
    token?: string;
    name?: string;
  }>();
  const key = publicMode ? params.token : params.id;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const query = useQuery({
    queryKey: publicMode
      ? queryKeys.publicList(key ?? "")
      : queryKeys.sharedListItems(key ?? ""),
    enabled: Boolean(key),
    queryFn: async ({ signal }) => {
      if (publicMode) {
        const value = await getPublicSharedList(key!, signal);
        return { name: value.list.Name, items: value.items };
      }
      return {
        name: params.name,
        items: await getSharedListItems(key!, signal),
      };
    },
  });
  const items = query.data?.items ?? [];
  const name = query.data?.name ?? params.name;
  return (
    <FeatureScreen
      title={name || "Спільний список"}
      subtitle={
        publicMode
          ? "Добірка, якою поділилися з тобою."
          : "Усі учасники можуть додавати тайтли з екрана деталей."
      }
    >
      {!publicMode && key ? (
        <MotionPressable
          style={styles.share}
          onPress={() =>
            void Share.share({
              message: `DropDate · ${name || "Спільний список"}`,
            })
          }
        >
          <Text style={styles.shareText}>Поділитися списком</Text>
        </MotionPressable>
      ) : null}
      {query.isLoading ? (
        <ScreenState loading title="Завантажуємо добірку" />
      ) : query.error ? (
        <ScreenState title="Список недоступний" message={query.error.message} />
      ) : items.length ? (
        <View style={styles.grid}>
          {items.map((item) => (
            <MotionPressable
              key={item.ID}
              style={styles.card}
              onPress={() =>
                router.push(`/title/${item.MediaType}/${item.TMDBID}` as Href)
              }
            >
              {item.PosterURL ? (
                <Image source={{ uri: item.PosterURL }} style={styles.poster} />
              ) : (
                <View
                  style={[styles.poster, { backgroundColor: colors.elevated }]}
                />
              )}
              <Text numberOfLines={2} style={styles.title}>
                {item.Title}
              </Text>
            </MotionPressable>
          ))}
        </View>
      ) : (
        <ScreenState
          title="Список порожній"
          message="Додай перший фільм або серіал з екрана деталей."
        />
      )}
    </FeatureScreen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    share: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: c.accent,
    },
    shareText: { color: c.background, fontWeight: "900" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    card: { width: "47%", gap: 8 },
    poster: { width: "100%", aspectRatio: 2 / 3, borderRadius: 17 },
    title: { color: c.text, fontWeight: "800", lineHeight: 19 },
  });
