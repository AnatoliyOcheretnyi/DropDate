import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { apiRequest } from "../../../shared/api/client";
import { useAuthStore } from "../../auth/store/authStore";
export default function DevScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const router = useRouter();
  if (!user?.isSuperuser)
    return (
      <FeatureScreen
        title="Немає доступу"
        subtitle="Цей розділ доступний лише superuser."
      >
        <MotionPressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.text}>Назад</Text>
        </MotionPressable>
      </FeatureScreen>
    );
  const reset = async () => {
    setBusy(true);
    setStatus("");
    try {
      const result = await apiRequest<{ cleared?: string[] }>(
        "/dev/cache/reset",
        { method: "POST", auth: true },
      );
      setStatus(`Очищено: ${result.cleared?.join(", ") || "server cache"}`);
    } catch (error) {
      Alert.alert(
        "Не вдалося скинути кеш",
        error instanceof Error ? error.message : "Помилка",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <FeatureScreen
      title="Dev Zone"
      subtitle="Сервісні інструменти для примусового оновлення даних."
    >
      <View style={styles.card}>
        <Text style={styles.heading}>Release та recommendations cache</Text>
        <Text style={styles.text}>
          Очистить серверні кеші. Наступні запити завантажать свіжі дані.
        </Text>
        <MotionPressable
          disabled={busy}
          style={styles.button}
          onPress={() => void reset()}
        >
          <Text style={styles.buttonText}>
            {busy ? "Очищаємо…" : "Скинути кеш"}
          </Text>
        </MotionPressable>
        {status ? <Text style={styles.success}>{status}</Text> : null}
      </View>
    </FeatureScreen>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { gap: 14, padding: 18, borderRadius: 22, backgroundColor: c.card },
    heading: { color: c.text, fontSize: 20, fontWeight: "900" },
    text: { color: c.textMuted, lineHeight: 20 },
    button: {
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: c.accent,
    },
    buttonText: { color: c.background, fontWeight: "900" },
    success: { color: c.accent, fontWeight: "800" },
    secondary: {
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: c.card,
    },
  });
