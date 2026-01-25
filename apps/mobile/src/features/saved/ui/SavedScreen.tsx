import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";

import { PosterCard } from "../../../shared/ui/PosterCard";
import { colors } from "../../../shared/theme/colors";
import { useSaved } from "../store/savedStore";
import { copy } from "../../../shared/strings";
import type { ListType } from "../../../shared/types/lists";

type Section = {
  id: string;
  title: string;
  items: ReturnType<typeof useSaved>["saved"];
};

export default function SavedScreen() {
  const router = useRouter();
  const { saved, removeRelease } = useSaved();
  const [activeList, setActiveList] = useState<ListType>("follow");

  const listItems = useMemo(
    () => saved.filter((item) => item.listTypes?.includes(activeList)),
    [activeList, saved]
  );

  const sections = useMemo<Section[]>(() => {
    const now = new Date();
    const endWeek = new Date();
    endWeek.setDate(endWeek.getDate() + 7);
    const endMonth = new Date();
    endMonth.setDate(endMonth.getDate() + 30);

    const buckets: Record<string, Section> = {
      today: { id: "today", title: copy.saved.sectionTitles.today, items: [] },
      week: { id: "week", title: copy.saved.sectionTitles.week, items: [] },
      month: { id: "month", title: copy.saved.sectionTitles.month, items: [] },
      later: { id: "later", title: copy.saved.sectionTitles.later, items: [] },
      ended: { id: "ended", title: copy.saved.sectionTitles.ended, items: [] },
    };

    listItems.forEach((item) => {
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
  }, [listItems]);

  const stats = useMemo(() => {
    const total = listItems.length;
    const seriesCount = listItems.filter((item) => item.mediaType === "tv").length;

    if (activeList === "follow") {
      const now = new Date();
      const endWeek = new Date();
      endWeek.setDate(endWeek.getDate() + 7);
      const thisWeek = listItems.filter((item) => {
        if (!item.nextRelease) return false;
        const date = new Date(item.nextRelease);
        return date >= now && date <= endWeek;
      }).length;
      return {
        left: { value: total, label: copy.listStats.total },
        middle: { value: thisWeek, label: copy.listStats.thisWeek, tone: "warm" as const },
        right: { value: seriesCount, label: copy.listStats.series, tone: "cool" as const },
      };
    }

    if (activeList === "watchlist") {
      const watchedCount = listItems.reduce((acc, item) => acc + (item.watchCount ?? 0), 0);
      return {
        left: { value: total, label: copy.listStats.total },
        middle: { value: watchedCount, label: copy.listStats.watched, tone: "warm" as const },
        right: { value: seriesCount, label: copy.listStats.series, tone: "cool" as const },
      };
    }

    if (activeList === "favorite") {
      const rewatches = listItems.reduce((acc, item) => {
        const count = item.watchCount ?? 0;
        return acc + Math.max(count - 1, 0);
      }, 0);
      return {
        left: { value: total, label: copy.listStats.total },
        middle: { value: rewatches, label: copy.listStats.rewatches, tone: "warm" as const },
        right: { value: seriesCount, label: copy.listStats.series, tone: "cool" as const },
      };
    }

    if (activeList === "watched") {
      const views = listItems.reduce((acc, item) => acc + (item.watchCount ?? 0), 0);
      return {
        left: { value: total, label: copy.listStats.total },
        middle: { value: views, label: copy.listStats.views, tone: "warm" as const },
        right: { value: seriesCount, label: copy.listStats.series, tone: "cool" as const },
      };
    }

    const ratings = listItems
      .map((item) => item.userRating)
      .filter((value): value is number => typeof value === "number");
    const avg = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    return {
      left: { value: total, label: copy.listStats.total },
      middle: { value: `${avg}`, label: copy.listStats.avgRating, tone: "warm" as const },
      right: { value: seriesCount, label: copy.listStats.series, tone: "cool" as const },
    };
  }, [activeList, listItems]);

  return (
    <View style={styles.wrapper}>
      <FlashList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <View style={styles.rowWrap}>
              <FlashList
                horizontal
                data={item.items}
                keyExtractor={(entry) => String(entry.id)}
                renderItem={({ item: entry }) => (
                  <View style={styles.savedItem}>
                    <PosterCard
                      item={{
                        id: entry.tmdbId,
                        title: entry.title,
                        mediaType: entry.mediaType,
                        posterUrl: entry.posterUrl,
                      }}
                      size={{ width: 140, height: 210 }}
                      onPress={() =>
                        router.push(`/title/${entry.mediaType}/${entry.tmdbId}`)
                      }
                    />
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removeRelease(entry.id, activeList)}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  </View>
                )}
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                removeClippedSubviews={false}
                contentContainerStyle={styles.row}
                ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
                estimatedItemSize={160}
              />
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.header}>{copy.header.savedList}</Text>
            <View style={styles.rowWrap}>
              <FlashList
                horizontal
                data={["follow", "watchlist", "favorite", "watched", "disliked"] as ListType[]}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const isActive = item === activeList;
                  return (
                    <Pressable
                      style={[styles.tab, isActive ? styles.tabActive : null]}
                      onPress={() => setActiveList(item)}
                    >
                      <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                        {copy.lists[item]}
                      </Text>
                    </Pressable>
                  );
                }}
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                removeClippedSubviews={false}
                contentContainerStyle={styles.tabs}
                ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
                estimatedItemSize={90}
              />
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.statLeft]}>
                <Text style={styles.statValue}>{stats.left.value}</Text>
                <Text style={styles.statLabel}>{stats.left.label}</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  styles.statMiddle,
                  stats.middle.tone === "warm" ? styles.statWarm : null,
                ]}
              >
                <Text style={styles.statValue}>{stats.middle.value}</Text>
                <Text style={styles.statLabel}>{stats.middle.label}</Text>
              </View>
              <View style={[styles.statCard, styles.statRight]}>
                <Text style={styles.statValue}>{stats.right.value}</Text>
                <Text style={styles.statLabel}>{stats.right.label}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          listItems.length === 0 ? (
            <Text style={styles.hint}>{copy.hints.listEmpty}</Text>
          ) : null
        }
        contentContainerStyle={styles.container}
        estimatedItemSize={280}
        showsVerticalScrollIndicator={false}
      />
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
  headerWrap: {
    gap: 18,
  },
  tabs: {
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  tabActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(91, 255, 200, 0.08)",
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.text,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(91, 255, 200, 0.2)",
    backgroundColor: "rgba(21, 31, 28, 0.7)",
    gap: 6,
  },
  statLeft: {
    borderColor: "rgba(91, 255, 200, 0.25)",
  },
  statMiddle: {
    borderColor: "rgba(216, 180, 76, 0.3)",
    backgroundColor: "rgba(26, 28, 16, 0.7)",
  },
  statRight: {
    borderColor: "rgba(79, 139, 255, 0.3)",
    backgroundColor: "rgba(10, 20, 34, 0.7)",
  },
  statWarm: {
    borderColor: "rgba(216, 180, 76, 0.35)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  rowWrap: {
    marginHorizontal: -20,
  },
  row: {
    paddingHorizontal: 20,
    paddingRight: 28,
  },
  rowSeparator: {
    width: 12,
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
