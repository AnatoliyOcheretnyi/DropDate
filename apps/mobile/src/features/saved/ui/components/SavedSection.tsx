import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";

import { PosterCard } from "../../../../shared/ui/PosterCard";
import { colors } from "../../../../shared/theme/colors";
import type { SavedItem } from "../../store/savedStore";
import type { ListType } from "../../../../shared/types/lists";

type Props = {
  title: string;
  items: SavedItem[];
  activeList: ListType;
  onRemove: (id: string, listType: ListType) => void;
};

export function SavedSection({ title, items, activeList, onRemove }: Props) {
  const router = useRouter();

  const handlePress = useCallback(
    (item: SavedItem) => {
      router.push(`/title/${item.mediaType}/${item.tmdbId}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedItem }) => (
      <View style={styles.savedItem}>
        <PosterCard
          item={{
            id: item.tmdbId,
            title: item.title,
            mediaType: item.mediaType,
            posterUrl: item.posterUrl,
          }}
          size={{ width: 140, height: 210 }}
          onPress={() => handlePress(item)}
        />
        <Pressable
          style={styles.removeButton}
          onPress={() => onRemove(item.id, activeList)}
        >
          <Text style={styles.removeText}>×</Text>
        </Pressable>
      </View>
    ),
    [activeList, handlePress, onRemove],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rowWrap}>
        <FlashList
          horizontal
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          removeClippedSubviews={false}
          contentContainerStyle={styles.row}
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  rowSeparator: {
    width: 12,
  },
  savedItem: {
    width: 140,
  },
  removeButton: {
    position: "absolute",
    top: 10,
    right: 10,
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
    fontWeight: "700",
  },
});
