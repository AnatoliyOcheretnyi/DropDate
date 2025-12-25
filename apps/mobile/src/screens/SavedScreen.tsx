import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { PosterCard } from "../components/PosterCard";
import { colors } from "../theme/colors";
import { useSaved } from "../state/SavedContext";

type Section = {
  id: string;
  title: string;
  items: ReturnType<typeof useSaved>["saved"];
};

export default function SavedScreen() {
  const router = useRouter();
  const { saved, removeRelease } = useSaved();

  const sections = useMemo<Section[]>(() => {
    const now = new Date();
    const endWeek = new Date();
    endWeek.setDate(endWeek.getDate() + 7);
    const endMonth = new Date();
    endMonth.setDate(endMonth.getDate() + 30);

    const buckets: Record<string, Section> = {
      today: { id: "today", title: "Сьогодні", items: [] },
      week: { id: "week", title: "Цього тижня", items: [] },
      month: { id: "month", title: "Цього місяця", items: [] },
      later: { id: "later", title: "Пізніше", items: [] },
      ended: { id: "ended", title: "Завершені", items: [] },
    };

    saved.forEach((item) => {
      if (item.status !== "upcoming" || !item.nextRelease) {
        buckets.ended.items.push(item);
        return;
      }
      const date = new Date(item.nextRelease);
      if (Number.isNaN(date.getTime())) {
        buckets.later.items.push(item);
        return;
      }
      if (date.toDateString() === now.toDateString()) {
        buckets.today.items.push(item);
        return;
      }
      if (date <= endWeek) {
        buckets.week.items.push(item);
        return;
      }
      if (date <= endMonth) {
        buckets.month.items.push(item);
        return;
      }
      buckets.later.items.push(item);
    });

    return Object.values(buckets).filter((section) => section.items.length > 0);
  }, [saved]);

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Мій список</Text>
        {saved.length === 0 ? (
          <Text style={styles.hint}>
            Поки що порожньо. Додай перший тайтл з пошуку.
          </Text>
        ) : (
          sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
              >
                {section.items.map((item) => (
                  <View key={item.id} style={styles.savedItem}>
                    <PosterCard
                      item={{
                        id: item.tmdbId,
                        title: item.title,
                        mediaType: item.mediaType,
                        posterUrl: item.posterUrl,
                      }}
                      size={{ width: 140, height: 210 }}
                      onPress={() =>
                        router.push(`/title/${item.mediaType}/${item.tmdbId}`)
                      }
                    />
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removeRelease(item.id)}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 18,
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  row: {
    gap: 12,
    paddingRight: 12,
  },
  savedItem: {
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  removeText: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 18,
  },
});
