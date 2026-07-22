import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { getBridge } from "../api/bridge";
export default function BridgeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [type, setType] = useState<"movie" | "tv">("movie");
  const [adventure, setAdventure] = useState(2);
  const [runtime, setRuntime] = useState(0);
  const q = useQuery({
    queryKey: ["bridge", type, adventure, runtime],
    queryFn: ({ signal }) => getBridge(type, adventure, runtime, signal),
  });
  return (
    <FeatureScreen
      title="Культурний міст"
      subtitle="Виходь за межі звичного кіно через країни, які пасують саме твоєму смаку."
    >
      <View style={styles.controls}>
        <View style={styles.row}>
          {(["movie", "tv"] as const).map((x) => (
            <Chip
              key={x}
              active={type === x}
              label={x === "movie" ? "Фільми" : "Серіали"}
              onPress={() => setType(x)}
            />
          ))}
        </View>
        <Text style={styles.label}>Рівень пригоди</Text>
        <View style={styles.row}>
          {[1, 2, 3].map((x) => (
            <Chip
              key={x}
              active={adventure === x}
              label={["Ближче", "Сміливіше", "Несподівано"][x - 1]}
              onPress={() => setAdventure(x)}
            />
          ))}
        </View>
        <Text style={styles.label}>Тривалість</Text>
        <View style={styles.row}>
          <Chip
            active={runtime === 0}
            label="Будь-яка"
            onPress={() => setRuntime(0)}
          />
          <Chip
            active={runtime === 120}
            label="До 2 год"
            onPress={() => setRuntime(120)}
          />
        </View>
      </View>
      {q.isLoading ? (
        <ScreenState loading title="Будуємо маршрут" />
      ) : q.data?.items.length ? (
        q.data.items.map((item) => (
          <MotionPressable
            key={`${item.mediaType}-${item.tmdbId}`}
            style={styles.card}
            onPress={() =>
              router.push(`/title/${item.mediaType}/${item.tmdbId}` as Href)
            }
          >
            {item.posterUrl ? (
              <Image source={{ uri: item.posterUrl }} style={styles.poster} />
            ) : null}
            <View style={styles.grow}>
              <Text style={styles.country}>{item.country}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {[item.year, item.rating ? `★ ${item.rating.toFixed(1)}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={styles.reason}>{item.reason}</Text>
            </View>
          </MotionPressable>
        ))
      ) : (
        <ScreenState
          title="Маршрут не знайдено"
          message="Зміни рівень пригоди або тип контенту."
        />
      )}
    </FeatureScreen>
  );
}
function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <MotionPressable
      style={[
        base.chip,
        {
          backgroundColor: active ? colors.accentSoft : colors.elevated,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={{
          color: active ? colors.accent : colors.textMuted,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}
const base = StyleSheet.create({
  chip: {
    minHeight: 42,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
});
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    controls: {
      gap: 9,
      padding: 16,
      borderRadius: 22,
      backgroundColor: c.card,
    },
    row: { flexDirection: "row", gap: 7 },
    label: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 4,
    },
    card: {
      minHeight: 156,
      flexDirection: "row",
      gap: 14,
      padding: 12,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    poster: { width: 92, borderRadius: 14 },
    grow: { flex: 1 },
    country: {
      color: c.accent,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.3,
      textTransform: "uppercase",
    },
    title: { color: c.text, fontSize: 19, fontWeight: "900", marginTop: 6 },
    meta: { color: c.textMuted, fontSize: 12, marginTop: 4 },
    reason: { color: c.textMuted, lineHeight: 19, marginTop: 10 },
  });
