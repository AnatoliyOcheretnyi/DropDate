import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../../shared/theme/palette';
import type { Suggestion } from '../../../../shared/types/release';
import { MotionPressable } from '../../../../shared/ui/MotionPressable';

type Props = {
  items: Suggestion[];
  onPress: (item: Suggestion) => void;
  onLongPress: (item: Suggestion) => void;
};

export function RankedRow({ items, onPress, onLongPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ranked = useMemo(() => items.slice(0, 10), [items]);

  const renderItem = useCallback(
    ({ item, index }: { item: Suggestion; index: number }) => (
      <MotionPressable
        style={styles.card}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        haptic="none"
        accessibilityLabel={`${index + 1}. ${item.title}`}
      >
        <Text style={styles.number}>{index + 1}</Text>
        <View style={styles.poster}>
          {item.posterUrl ? (
            <Image
              source={{ uri: item.posterUrl }}
              style={styles.posterImage}
              contentFit="cover"
              transition={220}
              recyclingKey={`${item.mediaType}-${item.id}`}
            />
          ) : (
            <View style={styles.posterFallback}>
              <Text style={styles.posterFallbackText}>{item.title.slice(0, 1)}</Text>
            </View>
          )}
        </View>
      </MotionPressable>
    ),
    [onLongPress, onPress, styles]
  );

  return (
    <View style={styles.rowWrap}>
      <FlashList
        horizontal
        data={ranked}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  rowWrap: {
    marginHorizontal: -20,
  },
  row: {
    paddingLeft: 20,
    paddingRight: 28,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 8,
  },
  number: {
    fontSize: 96,
    lineHeight: 96,
    fontWeight: '900',
    color: colors.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(13,18,32,0.14)',
    marginRight: -18,
  },
  poster: {
    width: 108,
    height: 162,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  posterFallbackText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
});
