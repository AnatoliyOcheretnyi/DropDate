import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';

import type { Suggestion } from '../../../../shared/types/release';
import { PosterCard } from '../../../../shared/ui/PosterCard';
import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';

type Props = {
  items: Suggestion[];
};

export function DetailsRecommendations({ items }: Props) {
  const router = useRouter();

  const handlePress = useCallback(
    (item: Suggestion) => {
      router.push(`/title/${item.mediaType}/${item.id}`);
    },
    [router]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{copy.sections.similarTitles}</Text>
      <FlashList
        horizontal
        data={items}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        renderItem={({ item }) => <PosterCard item={item} onPress={handlePress} />}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        contentContainerStyle={styles.row}
        estimatedItemSize={160}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    gap: 12,
    paddingRight: 12,
  },
});
