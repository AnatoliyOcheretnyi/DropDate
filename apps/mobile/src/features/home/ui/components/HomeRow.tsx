import { ScrollView, StyleSheet, View } from "react-native";

import type { Suggestion } from "../../../../shared/types/release";
import { PosterCard } from "../../../../shared/ui/PosterCard";

type Props = {
  items: Suggestion[];
  onPress: (item: Suggestion) => void;
  onAdd: (item: Suggestion) => void;
  onLongPress: (item: Suggestion) => void;
  isSaved: (item: Suggestion) => boolean;
};

/** Rails are short and fixed-size, so a plain ScrollView beats virtualisation. */
const MAX_ITEMS = 20;

export function HomeRow({
  items,
  onPress,
  onAdd,
  onLongPress,
  isSaved,
}: Props) {
  return (
    <View style={styles.rowWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        // Snapping makes flicks land on a card edge instead of mid-poster.
        decelerationRate="fast"
        snapToInterval={POSTER_WIDTH + GAP}
        snapToAlignment="start"
      >
        {items.slice(0, MAX_ITEMS).map((item) => (
          <PosterCard
            key={`${item.mediaType}-${item.id}`}
            item={item}
            onPress={onPress}
            onAdd={onAdd}
            onLongPress={onLongPress}
            isSaved={isSaved(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const POSTER_WIDTH = 120;
const GAP = 14;

const styles = StyleSheet.create({
  rowWrap: {
    marginHorizontal: -20,
  },
  row: {
    gap: GAP,
    paddingHorizontal: 20,
    paddingRight: 28,
  },
});
