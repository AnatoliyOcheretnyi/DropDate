import { useMemo, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Details } from "../../../../shared/types/release";
import { queryKeys } from "../../../../shared/api/queryKeys";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import { useAuthStore } from "../../../auth/store/authStore";
import {
  addTitleToSharedList,
  getSharedLists,
} from "../../../social/api/social";

export function AddToSharedList({ details }: { details: Details }) {
  const authed = useAuthStore((s) => Boolean(s.user));
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const lists = useQuery({
    queryKey: queryKeys.sharedLists,
    queryFn: ({ signal }) => getSharedLists(signal),
    enabled: authed && open,
    staleTime: 30_000,
  });
  const add = useMutation({
    mutationFn: (listId: string) =>
      addTitleToSharedList(listId, {
        tmdbId: details.id,
        mediaType: details.mediaType,
        title: details.title,
        posterUrl: details.posterUrl,
      }),
    onSuccess: async () => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: queryKeys.sharedLists });
      Alert.alert("Додано", "Тайтл з’явився у спільному списку.");
    },
  });
  if (!authed) return null;
  return (
    <>
      <MotionPressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Ionicons name="albums-outline" size={21} color={colors.accent} />
        <Text style={styles.triggerText}>До спільного списку</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </MotionPressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Обери список</Text>
            <Text style={styles.subtitle}>{details.title}</Text>
            {lists.data?.map((list) => (
              <MotionPressable
                disabled={add.isPending}
                key={list.ID}
                style={styles.list}
                onPress={() =>
                  void add
                    .mutateAsync(list.ID)
                    .catch((error) =>
                      Alert.alert("Не вдалося додати", error.message),
                    )
                }
              >
                <View>
                  <Text style={styles.listName}>{list.Name}</Text>
                  <Text style={styles.meta}>
                    {list.ItemCount} тайтлів ·{" "}
                    {list.Visibility === "public"
                      ? "публічний"
                      : list.Visibility === "friends"
                        ? "для друзів"
                        : "приватний"}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={25} color={colors.accent} />
              </MotionPressable>
            ))}
            {!lists.isLoading && !lists.data?.length ? (
              <Text style={styles.meta}>
                Спочатку створи список у розділі друзів.
              </Text>
            ) : null}
            <MotionPressable
              style={styles.close}
              onPress={() => setOpen(false)}
            >
              <Text style={styles.closeText}>Закрити</Text>
            </MotionPressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    trigger: {
      marginHorizontal: 20,
      marginTop: 10,
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 15,
      borderRadius: 17,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    triggerText: { flex: 1, color: c.text, fontWeight: "800" },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,.58)",
    },
    sheet: {
      padding: 20,
      paddingBottom: 36,
      gap: 10,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: c.elevated,
    },
    title: { color: c.text, fontSize: 24, fontWeight: "900" },
    subtitle: { color: c.accent, fontWeight: "800", marginBottom: 5 },
    list: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      borderRadius: 18,
      backgroundColor: c.card,
    },
    listName: { color: c.text, fontWeight: "900" },
    meta: { color: c.textMuted, fontSize: 12, marginTop: 4 },
    close: { minHeight: 48, alignItems: "center", justifyContent: "center" },
    closeText: { color: c.text, fontWeight: "800" },
  });
