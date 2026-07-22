import { useCallback, useMemo, type ReactElement } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";

import type { Suggestion } from "../types/release";
import { PosterCard } from "./PosterCard";
import { Shimmer } from "./Shimmer";

type Props = {
  items: Suggestion[];
  isLoading: boolean;
  onPress: (item: Suggestion) => void;
  onAdd: (item: Suggestion) => void;
  isSaved: (item: Suggestion) => boolean;
  ListHeaderComponent?: ReactElement | null;
  ListEmptyComponent?: ReactElement | null;
  onEndReached?: () => void;
  ListFooterComponent?: ReactElement | null;
  contentPaddingTop?: number;
};

const H_PADDING = 20;
const GAP = 12;
/** Below this width three columns leave posters too narrow to read. */
const NARROW_SCREEN = 360;

export function PosterGrid({
  items,
  isLoading,
  onPress,
  onAdd,
  isSaved,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  onEndReached,
  contentPaddingTop = 0,
}: Props) {
  const { width } = useWindowDimensions();
  const columns = width < NARROW_SCREEN ? 2 : width > 700 ? 4 : 3;
  const cardWidth = (width - H_PADDING * 2 - GAP * (columns - 1)) / columns;
  const size = useMemo(
    () => ({ width: cardWidth, height: cardWidth * 1.5 }),
    [cardWidth],
  );

  const renderItem = useCallback(
    ({ item }: { item: Suggestion }) => (
      <View style={styles.cell}>
        <PosterCard
          item={item}
          size={size}
          onPress={onPress}
          onAdd={onAdd}
          onLongPress={onAdd}
          isSaved={isSaved(item)}
        />
      </View>
    ),
    [isSaved, onAdd, onPress, size],
  );

  if (isLoading && items.length === 0) {
    return (
      <View
        style={[styles.skeletonWrap, { paddingTop: contentPaddingTop }]}
        pointerEvents="none"
      >
        {Array.from({ length: columns * 4 }, (_, i) => (
          <Shimmer
            key={i}
            width={cardWidth}
            height={cardWidth * 1.5}
            radius={18}
          />
        ))}
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      numColumns={columns}
      keyExtractor={(item) => `${item.mediaType}-${item.id}`}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: H_PADDING,
        paddingTop: contentPaddingTop,
        paddingBottom: 148,
      }}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    paddingBottom: GAP,
    // FlashList hands each cell an equal-width slot; centring spreads the
    // leftover gap evenly instead of piling it up on the right edge.
    alignItems: "center",
  },
  skeletonWrap: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    paddingHorizontal: H_PADDING,
  },
});
