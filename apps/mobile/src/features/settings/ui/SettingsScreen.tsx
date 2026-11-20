import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { ThemeToggle } from "../../../shared/ui/ThemeToggle";
import { useAuthStore } from "../../auth/store/authStore";
import { useToast } from "../../../shared/ui/Toast";

export default function SettingsScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const remove = useAuthStore((s) => s.deleteAccount);
  const router = useRouter();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const links = [
    ["Політика конфіденційності", process.env.EXPO_PUBLIC_PRIVACY_URL],
    ["Умови користування", process.env.EXPO_PUBLIC_TERMS_URL],
    [
      "Написати в підтримку",
      process.env.EXPO_PUBLIC_SUPPORT_EMAIL
        ? `mailto:${process.env.EXPO_PUBLIC_SUPPORT_EMAIL}`
        : undefined,
    ],
  ].filter(([, url]) => Boolean(url));
  const open = async (url?: string) => {
    if (!url) {
      showToast("Контакт ще не налаштований у цій збірці");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      showToast("Не вдалося відкрити посилання");
    }
  };
  const confirmDelete = () =>
    Alert.alert(
      "Видалити акаунт назавжди?",
      "Буде видалено профіль, списки, оцінки, прогрес, дружні зв’язки й створені тобою спільні списки. Відновити ці дані неможливо.",
      [
        { text: "Залишити акаунт", style: "cancel" },
        {
          text: "Видалити назавжди",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            void remove(password)
              .then(() => {
                setPassword("");
                router.replace("/welcome");
              })
              .catch(() =>
                showToast(
                  "Не вдалося видалити акаунт. Перевір пароль і з’єднання та спробуй ще раз.",
                ),
              )
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  return (
    <FeatureScreen
      title="Твій простір"
      subtitle="Налаштування, приватність і трохи турботи."
    >
      <ThemeToggle />
      {links.length > 0 && (
        <View
          style={[
            s.group,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {links.map(([label, url]) => (
            <MotionPressable
              key={label}
              style={s.row}
              onPress={() => void open(url)}
            >
              <Text style={[s.label, { color: colors.text }]}>{label}</Text>
              <Text style={{ color: colors.textMuted }}>↗</Text>
            </MotionPressable>
          ))}
        </View>
      )}
      <View style={[s.note, { backgroundColor: colors.card }]}>
        <Text style={[s.label, { color: colors.text }]}>Про DropDate</Text>
        <Text style={[s.body, { color: colors.textMuted }]}>
          Твій провідник у світі фільмів і серіалів. Застосунок допомагає
          обирати, зберігати та відстежувати кіно; перегляд доступний у
          відповідних сервісах.
        </Text>
        <Text style={[s.body, { color: colors.textMuted }]}>
          Дані про фільми — TMDB. This product uses the TMDB API but is not
          endorsed or certified by TMDB. Доступність перегляду — JustWatch.
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          Версія {Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </View>
      {user ? (
        <View style={[s.note, { borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[s.label, { color: colors.text }]}>
            Керування даними
          </Text>
          <Text style={[s.body, { color: colors.textMuted }]}>
            Ти можеш назавжди видалити акаунт і пов’язані з ним дані.
          </Text>
          {deleting ? (
            <>
              <TextInput
                accessibilityLabel="Поточний пароль для видалення акаунта"
                secureTextEntry
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                placeholder="Підтвердь поточний пароль"
                placeholderTextColor={colors.textMuted}
                style={[
                  s.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
              />
              <MotionPressable
                disabled={!password || busy}
                onPress={confirmDelete}
                style={[s.button, { backgroundColor: colors.error }]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={{ color: colors.background, fontWeight: "700" }}>
                    Видалити акаунт
                  </Text>
                )}
              </MotionPressable>
              <MotionPressable
                disabled={busy}
                style={s.button}
                onPress={() => {
                  setDeleting(false);
                  setPassword("");
                }}
              >
                <Text style={{ color: colors.text }}>Скасувати</Text>
              </MotionPressable>
            </>
          ) : (
            <MotionPressable style={s.row} onPress={() => setDeleting(true)}>
              <Text style={{ color: colors.error, fontWeight: "600" }}>
                Видалити акаунт
              </Text>
            </MotionPressable>
          )}
        </View>
      ) : null}
    </FeatureScreen>
  );
}
const s = StyleSheet.create({
  group: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  label: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  note: { padding: 20, borderRadius: 22, gap: 14 },
  body: { fontSize: 14, lineHeight: 22 },
  input: {
    minHeight: 54,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    fontSize: 16,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
});
