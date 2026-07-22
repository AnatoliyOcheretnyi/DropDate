import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";

import type { Suggestion } from "../../../../shared/types/release";
import { PosterCard } from "../../../../shared/ui/PosterCard";

type Props = {
  items: Suggestion[];
  onPress: (item: Suggestion) => void;
  onAdd: (item: Suggestion) => void;
  onLongPress: (item: Suggestion) => void;
  isSaved: (item: Suggestion) => boolean;
};

export function HomeRow({
  items,
  onPress,
  onAdd,
  onLongPress,
  isSaved,
}: Props) {
  const renderItem = useCallback(
    ({ item }: { item: Suggestion }) => (
      <PosterCard
        item={item}
        onPress={onPress}
        onAdd={onAdd}
        onLongPress={onLongPress}
        isSaved={isSaved(item)}
      />
    ),
    [isSaved, onAdd, onLongPress, onPress],
  );

  return (
    <View style={styles.rowWrap}>
      <FlashList
        horizontal
        data={items}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        renderItem={renderItem}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        contentContainerStyle={styles.row}
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    marginHorizontal: -20,
  },
  row: {
    paddingHorizontal: 20,
    paddingRight: 28,
  },
  rowSeparator: {
    width: 14,
  },
});
