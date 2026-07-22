import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { AnimatedSection } from "../../../shared/ui/AnimatedScreen";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { useFriendsScreen, type FriendsTab } from "../hooks/useFriendsScreen";
import type { Friendship } from "../model/friends";

const tabs: { key: FriendsTab; label: string }[] = [
  { key: "friends", label: "Друзі" },
  { key: "incoming", label: "Вхідні" },
  { key: "outgoing", label: "Надіслані" },
];

export function FriendsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const vm = useFriendsScreen();
  const data = vm.friends.data;
  const active = data?.[vm.tab] ?? [];
  const counts = {
    friends: data?.friends.length ?? 0,
    incoming: data?.incoming.length ?? 0,
    outgoing: data?.outgoing.length ?? 0,
  };

  if (vm.friends.isLoading)
    return <ScreenState loading title="Збираємо друзів" />;
  if (vm.friends.isError)
    return (
      <ScreenState
        title="Друзі зараз недоступні"
        message={vm.friends.error.message}
        onRetry={() => void vm.friends.refetch()}
      />
    );

  return (
    <FeatureScreen
      title="Друзі"
      subtitle="Дивіться, що вас об’єднує, і діліться знахідками."
    >
      <MotionPressable
        style={styles.socialLink}
        onPress={() => router.push("/friends/activity" as Href)}
      >
        <View style={styles.socialIcon}>
          <Ionicons name="sparkles" size={20} color={colors.background} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.name}>Активність і списки</Text>
          <Text style={styles.meta}>
            Рекомендації друзів та спільні добірки
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.accent} />
      </MotionPressable>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={vm.search}
          onChangeText={vm.setSearch}
          placeholder="Нікнейм або email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel="Пошук друзів"
        />
        {vm.results.isFetching ? (
          <ActivityIndicator color={colors.accent} />
        ) : null}
      </View>
      {vm.search.trim().length > 0 && vm.search.trim().length < 3 ? (
        <Text style={styles.helper}>Введи щонайменше 3 символи</Text>
      ) : null}
      {(vm.results.data?.length ?? 0) > 0 ? (
        <View style={styles.results}>
          {vm.results.data?.map((result) => (
            <View key={result.user.id} style={styles.resultRow}>
              <Avatar name={result.user.username || result.user.email} />
              <View style={styles.grow}>
                <Text style={styles.name}>
                  {result.user.username || "Без нікнейму"}
                </Text>
                <Text numberOfLines={1} style={styles.meta}>
                  {result.user.email}
                </Text>
              </View>
              <MotionPressable
                disabled={result.status !== "none" || vm.send.isPending}
                accessibilityLabel={`Додати ${result.user.username}`}
                style={styles.smallButton}
                onPress={() =>
                  void vm.send
                    .mutateAsync(result.user.username || result.user.email)
                    .catch((error) =>
                      Alert.alert("Не вдалося надіслати запит", error.message),
                    )
                }
              >
                <Text style={styles.smallButtonText}>
                  {result.status === "none"
                    ? "Додати"
                    : result.status === "accepted"
                      ? "Друг"
                      : "Очікує"}
                </Text>
              </MotionPressable>
            </View>
          ))}
        </View>
      ) : null}
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map((item) => (
          <MotionPressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: vm.tab === item.key }}
            style={[styles.tab, vm.tab === item.key && styles.tabActive]}
            onPress={() => vm.setTab(item.key)}
          >
            <Text
              style={[
                styles.tabText,
                vm.tab === item.key && styles.tabTextActive,
              ]}
            >
              {item.label}
            </Text>
            {counts[item.key] ? (
              <View
                style={[
                  styles.badge,
                  item.key === "incoming" && styles.alertBadge,
                ]}
              >
                <Text style={styles.badgeText}>{counts[item.key]}</Text>
              </View>
            ) : null}
          </MotionPressable>
        ))}
      </View>
      {active.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>
            {vm.tab === "friends" ? "🤝" : vm.tab === "incoming" ? "📥" : "📤"}
          </Text>
          <Text style={styles.emptyTitle}>
            {vm.tab === "friends" ? "Поки немає друзів" : "Тут поки порожньо"}
          </Text>
          <Text style={styles.meta}>
            Скористайся пошуком вище — запити з’являться у відповідній вкладці.
          </Text>
        </View>
      ) : (
        active.map((item, index) => (
          <AnimatedSection key={item.id} index={index}>
            <FriendRow
              item={item}
              tab={vm.tab}
              onOpen={() => router.push(`/friend/${item.user.id}` as Href)}
              onAccept={() => vm.respond.mutate({ id: item.id, accept: true })}
              onDecline={() =>
                vm.respond.mutate({ id: item.id, accept: false })
              }
              onRemove={() =>
                Alert.alert(
                  vm.tab === "friends" ? "Видалити друга?" : "Скасувати запит?",
                  undefined,
                  [
                    { text: "Ні", style: "cancel" },
                    {
                      text: "Так",
                      style: "destructive",
                      onPress: () => vm.remove.mutate(item.id),
                    },
                  ],
                )
              }
            />
          </AnimatedSection>
        ))
      )}
    </FeatureScreen>
  );
}

function Avatar({ name }: { name: string }) {
  const { colors } = useTheme();
  return (
    <View style={[base.avatar, { backgroundColor: colors.accentSoft }]}>
      <Text style={[base.avatarText, { color: colors.accent }]}>
        {name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function FriendRow({
  item,
  tab,
  onOpen,
  onAccept,
  onDecline,
  onRemove,
}: {
  item: Friendship;
  tab: FriendsTab;
  onOpen: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <MotionPressable
        disabled={tab !== "friends"}
        style={styles.friendIdentity}
        onPress={onOpen}
      >
        <Avatar name={item.user.username || item.user.email} />
        <View style={styles.grow}>
          <Text style={styles.name}>
            {item.user.username || "Без нікнейму"}
          </Text>
          <Text style={styles.meta}>
            {tab === "friends"
              ? `${item.savedTitles ?? 0} у списках · ${item.mutualTitles ?? 0} спільних`
              : item.user.email}
          </Text>
        </View>
        {tab === "friends" ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : null}
      </MotionPressable>
      {tab === "incoming" ? (
        <View style={styles.actions}>
          <MotionPressable
            accessibilityLabel="Прийняти"
            style={styles.iconAccept}
            onPress={onAccept}
            haptic="success"
          >
            <Ionicons name="checkmark" size={21} color={colors.background} />
          </MotionPressable>
          <MotionPressable
            accessibilityLabel="Відхилити"
            style={styles.iconPlain}
            onPress={onDecline}
          >
            <Ionicons name="close" size={21} color={colors.text} />
          </MotionPressable>
        </View>
      ) : (
        <MotionPressable
          accessibilityLabel={
            tab === "friends" ? "Видалити друга" : "Скасувати запит"
          }
          style={styles.iconPlain}
          onPress={onRemove}
        >
          <Ionicons
            name={tab === "friends" ? "ellipsis-horizontal" : "close"}
            size={20}
            color={colors.textMuted}
          />
        </MotionPressable>
      )}
    </View>
  );
}

const base = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "900", fontSize: 16 },
});
const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    searchBox: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 15,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    socialLink: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    socialIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
    helper: { color: colors.textMuted, fontSize: 13 },
    results: { gap: 8 },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.card,
    },
    grow: { flex: 1, minWidth: 0 },
    name: { color: colors.text, fontWeight: "800", fontSize: 16 },
    meta: { color: colors.textMuted, marginTop: 3, lineHeight: 19 },
    smallButton: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 14,
      borderRadius: 99,
      backgroundColor: colors.accentSoft,
    },
    smallButtonText: { color: colors.accent, fontWeight: "800" },
    tabs: {
      flexDirection: "row",
      gap: 6,
      padding: 5,
      borderRadius: 18,
      backgroundColor: colors.card,
    },
    tab: {
      flex: 1,
      minHeight: 44,
      flexDirection: "row",
      gap: 5,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
    },
    tabActive: { backgroundColor: colors.elevated },
    tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
    tabTextActive: { color: colors.text },
    badge: {
      minWidth: 19,
      height: 19,
      paddingHorizontal: 5,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 99,
      backgroundColor: colors.border,
    },
    alertBadge: { backgroundColor: colors.accent },
    badgeText: {
      color: colors.isDark ? "#07130e" : colors.text,
      fontSize: 11,
      fontWeight: "900",
    },
    empty: {
      alignItems: "center",
      gap: 8,
      padding: 28,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    emptyIcon: { fontSize: 36 },
    emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 19 },
    card: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    friendIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 4,
    },
    actions: { flexDirection: "row", gap: 8 },
    iconAccept: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    iconPlain: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.elevated,
    },
  });
