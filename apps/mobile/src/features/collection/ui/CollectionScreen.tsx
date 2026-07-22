import { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ListPickerModal } from "../../../shared/ui/ListPickerModal";
import { PosterGrid } from "../../../shared/ui/PosterGrid";
import { ScreenHeader } from "../../../shared/ui/ScreenHeader";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import type { Suggestion } from "../../../shared/types/release";
import { useListPicker } from "../../saved/hooks/useListPicker";
import { useAuthStore } from "../../auth/store/authStore";
import { collectionConfig, isCollectionId } from "../api/collection";

export default function CollectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isAuthenticated = useAuthStore((state) =>
    Boolean(state.user && state.accessToken),
  );
  const picker = useListPicker();

  const collectionId = isCollectionId(id) ? id : null;
  const config = collectionId ? collectionConfig[collectionId] : null;
  const enabled = Boolean(config) && (!config?.requiresAuth || isAuthenticated);

  const query = useQuery({
    queryKey: ["collection", collectionId],
    enabled,
    queryFn: ({ signal }) => config!.load(signal),
    staleTime: 1000 * 60 * 5,
  });

  const handlePress = useCallback(
    (item: Suggestion) => router.push(`/title/${item.mediaType}/${item.id}`),
    [router],
  );

  if (!config) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Добірка" />
        <ScreenState
          title="Такої добірки немає"
          message="Схоже, посилання застаріло."
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  const items = query.data ?? [];

  return (
    <View style={styles.root}>
      <ScreenHeader title={config.title} />
      {query.isError && items.length === 0 ? (
        <ScreenState
          title="Не вдалося завантажити"
          message="Перевір зʼєднання — ми спробуємо ще раз."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <PosterGrid
          items={items}
          isLoading={query.isLoading}
          onPress={handlePress}
          onAdd={picker.openPicker}
          isSaved={picker.isSaved}
          ListHeaderComponent={
            <View style={styles.head}>
              <Text style={styles.kicker}>{config.kicker}</Text>
              {items.length ? (
                <Text style={styles.count}>{items.length} тайтлів</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            query.isLoading ? null : (
              <Text style={styles.empty}>
                {config.requiresAuth && !isAuthenticated
                  ? "Увійди, щоб побачити персональні рекомендації."
                  : "Поки що порожньо."}
              </Text>
            )
          }
        />
      )}
      <ListPickerModal
        visible={picker.pickerVisible}
        value={picker.pickerItem ? picker.getListTypes(picker.pickerItem) : []}
        onClose={picker.closePicker}
        onApply={picker.applyListTypes}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    head: { paddingBottom: 16, gap: 2 },
    kicker: {
      textTransform: "uppercase",
      letterSpacing: 2,
      color: colors.accent,
      fontSize: 11.5,
      fontWeight: "800",
    },
    count: { color: colors.textMuted, fontSize: 13 },
    empty: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      paddingVertical: 40,
    },
  });
