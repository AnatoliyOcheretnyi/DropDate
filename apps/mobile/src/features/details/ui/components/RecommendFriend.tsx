import { useMemo, useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Details } from "../../../../shared/types/release";
import { apiRequest } from "../../../../shared/api/client";
import { queryKeys } from "../../../../shared/api/queryKeys";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import { getFriends } from "../../../friends/api/friends";
import { useAuthStore } from "../../../auth/store/authStore";

export function RecommendFriend({ details }: { details: Details }) {
  const authed = useAuthStore((s) => Boolean(s.user));
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [friendId, setFriendId] = useState("");
  const [message, setMessage] = useState("");
  const friends = useQuery({
    queryKey: queryKeys.friends,
    queryFn: ({ signal }) => getFriends(signal),
    enabled: authed && open,
    staleTime: 30_000,
  });
  const send = useMutation({
    mutationFn: () =>
      apiRequest("/social/recommendations", {
        method: "POST",
        auth: true,
        body: {
          recipientId: friendId,
          tmdbId: details.id,
          mediaType: details.mediaType,
          title: details.title,
          posterUrl: details.posterUrl,
          message,
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setFriendId("");
      setMessage("");
      Alert.alert("Надіслано", "Друг отримає сповіщення з рекомендацією.");
    },
  });
  if (!authed) return null;
  return (
    <>
      <MotionPressable style={styles.trigger} onPress={() => setOpen(true)}>
        <View style={styles.icon}>
          <Ionicons name="arrow-up" size={20} color={colors.background} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.title}>Порадити другу</Text>
          <Text style={styles.hint}>Приватна рекомендація</Text>
        </View>
        <Ionicons name="chevron-forward" color={colors.accent} size={20} />
      </MotionPressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.head}>
              <Text style={styles.sheetTitle}>Порадити другу</Text>
              <MotionPressable
                accessibilityLabel="Закрити"
                style={styles.close}
                onPress={() => setOpen(false)}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </MotionPressable>
            </View>
            <Text style={styles.movie}>{details.title}</Text>
            <Text style={styles.label}>Кому</Text>
            <View style={styles.friendList}>
              {friends.data?.friends.map((item) => (
                <MotionPressable
                  key={item.user.id}
                  style={[
                    styles.friend,
                    friendId === item.user.id && styles.selected,
                  ]}
                  onPress={() => setFriendId(item.user.id)}
                >
                  <Text style={styles.friendName}>
                    {item.user.username || item.user.email}
                  </Text>
                  {friendId === item.user.id ? (
                    <Ionicons
                      name="checkmark-circle"
                      color={colors.accent}
                      size={21}
                    />
                  ) : null}
                </MotionPressable>
              ))}
            </View>
            {!friends.isLoading && !friends.data?.friends.length ? (
              <Text style={styles.hint}>Спочатку додай когось у друзі.</Text>
            ) : null}
            <Text style={styles.label}>
              Повідомлення · {message.length}/240
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              maxLength={240}
              multiline
              placeholder="Чому це варто подивитися?"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <MotionPressable
              disabled={!friendId || send.isPending}
              haptic="success"
              style={styles.send}
              onPress={() =>
                void send
                  .mutateAsync()
                  .catch((error) =>
                    Alert.alert("Не вдалося надіслати", error.message),
                  )
              }
            >
              <Text style={styles.sendText}>
                {send.isPending ? "Надсилаємо…" : "Надіслати рекомендацію"}
              </Text>
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
      marginTop: 14,
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accent,
    },
    grow: { flex: 1 },
    title: { color: c.text, fontWeight: "900", fontSize: 16 },
    hint: { color: c.textMuted, fontSize: 13, marginTop: 2 },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,.55)",
    },
    sheet: {
      maxHeight: "85%",
      padding: 20,
      paddingBottom: 36,
      gap: 12,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: c.elevated,
    },
    head: { flexDirection: "row", alignItems: "center" },
    sheetTitle: { flex: 1, color: c.text, fontSize: 24, fontWeight: "900" },
    close: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: c.card,
    },
    movie: { color: c.accent, fontWeight: "800" },
    label: { color: c.textMuted, fontSize: 12, fontWeight: "700" },
    friendList: { gap: 7 },
    friend: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
    },
    selected: { borderColor: c.accent, backgroundColor: c.accentSoft },
    friendName: { color: c.text, fontWeight: "700" },
    input: {
      minHeight: 90,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      color: c.text,
      backgroundColor: c.card,
      textAlignVertical: "top",
    },
    send: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      backgroundColor: c.accent,
    },
    sendText: { color: c.background, fontWeight: "900" },
  });
