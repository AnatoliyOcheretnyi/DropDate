import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { copy } from '../../../../libs/shared/src/strings';
import type { Suggestion } from '../types/release';

type Props = {
  item: Suggestion;
  onPress: (item: Suggestion) => void;
  onAdd?: (item: Suggestion) => void;
  isSaved?: boolean;
  size?: { width: number; height: number };
};

export function PosterCard({ item, onPress, onAdd, isSaved = false, size }: Props) {
  const handleAdd = (event: any) => {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    onAdd?.(item);
  };

  return (
    <Pressable
      style={[styles.card, size ? { width: size.width, height: size.height } : null]}
      onPress={() => onPress(item)}
    >
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.image} />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>{item.title.slice(0, 1)}</Text>
        </View>
      )}
      {isSaved ? (
        <View style={styles.savedBadge}>
          <Text style={styles.savedText}>{copy.actions.added}</Text>
        </View>
      ) : onAdd ? (
        <Pressable style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addText}>+</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  fallbackText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  addText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  savedBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  savedText: {
    color: colors.text,
    fontSize: 12,
  },
});
