import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
const releases = [
  {
    version: "1.13.x",
    date: "22 липня 2026",
    title: "Новий трекінг серіалів та ігри про людей кіно",
    items: [
      "Епізоди з кадрами, прогресом і власними оцінками",
      "Компактні рекомендації друзям зі сповіщенням",
      "Режими про акторів і режисерів та гра до 10 раундів або до поразки",
    ],
  },
  {
    version: "1.12.x",
    date: "20 липня 2026",
    title: "Персональний пік дня",
    items: [
      "Щоденна персональна рекомендація",
      "Стан синхронізується між пристроями",
      "Рекомендацію можна зберегти або відхилити",
    ],
  },
  {
    version: "1.11.x",
    date: "18 липня 2026",
    title: "Онбординг смаків",
    items: [
      "Порівняння жанрів і країн",
      "Калібрування рекомендацій тайтлами",
      "Стабільне збереження прогресу на сервері",
    ],
  },
  {
    version: "1.10.x",
    date: "18 липня 2026",
    title: "Кіноакінатор і нові ігри",
    items: [
      "Акінатор фільмів",
      "Таймлайн, квіз року, friend taste і daily challenge",
      "Статистика, серії та таблиця друзів",
    ],
  },
  {
    version: "1.9.x",
    date: "15 липня 2026",
    title: "Соціальні списки й продовження перегляду",
    items: [
      "Активність друзів і спільні добірки",
      "Поради друзям",
      "Прогрес серіалів і наступний епізод",
    ],
  },
];
export default function ChangelogScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <FeatureScreen title="Що нового" subtitle="Історія помітних змін DropDate.">
      {releases.map((x) => (
        <View key={x.version} style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.version}>{x.version}</Text>
            <Text style={styles.date}>{x.date}</Text>
          </View>
          <Text style={styles.title}>{x.title}</Text>
          {x.items.map((item) => (
            <Text key={item} style={styles.item}>
              • {item}
            </Text>
          ))}
        </View>
      ))}
    </FeatureScreen>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: 9,
      padding: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    head: { flexDirection: "row", justifyContent: "space-between" },
    version: { color: c.accent, fontWeight: "900" },
    date: { color: c.textMuted, fontSize: 12 },
    title: { color: c.text, fontSize: 20, fontWeight: "900", lineHeight: 25 },
    item: { color: c.textMuted, lineHeight: 20 },
  });
