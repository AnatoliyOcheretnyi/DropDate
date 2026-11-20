import { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";

import { PosterCard } from "../../../../shared/ui/PosterCard";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import type { SavedItem } from "../../store/savedStore";
import type { ListType } from "../../../../shared/types/lists";
import type { SavedTab } from "../../hooks/useSavedScreen";

type Props = {
  title: string;
  items: SavedItem[];
  activeList: SavedTab;
  onRemove: (id: string, listType: ListType) => void;
};

/** Module scope: a fresh object here would defeat PosterCard's memo. */
const CARD_SIZE = { width: 140, height: 210 };

/**
 * On the union tab there is no single list to remove from, so the title leaves
 * whichever list it actually sits in.
 */
const removalList = (item: SavedItem, activeList: SavedTab): ListType =>
  activeList === "all" ? (item.listTypes?.[0] ?? "follow") : activeList;

function Separator() {
  return <View style={separatorStyles.gap} />;
}

export const SavedSection = memo(function SavedSection({
  title,
  items,
  activeList,
  onRemove,
}: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = useCallback(
    (item: SavedItem) => {
      router.push(`/title/${item.mediaType}/${item.tmdbId}`);
    },
    [router],
  );

  const handleRemove = useCallback(
    (item: SavedItem) => onRemove(item.id, removalList(item, activeList)),
    [activeList, onRemove],
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedItem }) => (
      <Card
        item={item}
        styles={styles}
        onPress={handlePress}
        onRemove={handleRemove}
      />
    ),
    [handlePress, handleRemove, styles],
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
          ItemSeparatorComponent={Separator}
        />
      </View>
    </View>
  );
});

/**
 * A card of its own so the suggestion object is built once per title instead of
 * once per render of the whole section — PosterCard is memoised, and a fresh
 * object literal inside `renderItem` was quietly cancelling that.
 */
const Card = memo(function Card({
  item,
  styles,
  onPress,
  onRemove,
}: {
  item: SavedItem;
  styles: ReturnType<typeof makeStyles>;
  onPress: (item: SavedItem) => void;
  onRemove: (item: SavedItem) => void;
}) {
  const suggestion = useMemo(
    () => ({
      id: item.tmdbId,
      title: item.title,
      mediaType: item.mediaType,
      posterUrl: item.posterUrl,
    }),
    [item.mediaType, item.posterUrl, item.title, item.tmdbId],
  );
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const handleRemove = useCallback(() => onRemove(item), [item, onRemove]);

  return (
    <View style={styles.savedItem}>
      <PosterCard
        item={suggestion}
        size={CARD_SIZE}
        onPress={handlePress}
        releaseDate={item.nextRelease}
      />
      <Pressable
        style={styles.removeButton}
        onPress={handleRemove}
        accessibilityRole="button"
        accessibilityLabel={`Прибрати «${item.title}» зі списку`}
      >
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
  );
});

const separatorStyles = StyleSheet.create({
  gap: { width: 12 },
});

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "700",
    },
  });
