import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../../shared/theme/palette';
import { copy } from '../../../../shared/strings';
import type { Suggestion } from '../../../../shared/types/release';
import { MotionPressable } from '../../../../shared/ui/MotionPressable';
import { PosterCard } from '../../../../shared/ui/PosterCard';

type Props = {
  spotlight: Suggestion | null;
  supporting: Suggestion[];
  onSelect: (item: Suggestion) => void;
  onLongPress: (item: Suggestion) => void;
  onSearch: () => void;
  isSaved: (item: Suggestion) => boolean;
};

const SUPPORT_GAP = 12;
const SCREEN_PADDING = 20;
const supportWidth = (Dimensions.get('window').width - SCREEN_PADDING * 2 - SUPPORT_GAP * 2) / 3;
const SUPPORTING_SIZE = { width: supportWidth, height: supportWidth * 1.5 };

const mediaLabel = (item: Suggestion) =>
  `${item.mediaType === 'movie' ? copy.mediaType.movie : copy.mediaType.series}${item.year ? ` · ${item.year}` : ''}`;

export function HomeSpotlight({ spotlight, supporting, onSelect, onLongPress, onSearch, isSaved }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={styles.eyebrow}>Зараз на радарі</Text>
          <Text style={styles.title}>Нові релізи</Text>
        </View>
      </View>

      <MotionPressable style={styles.searchPill} onPress={onSearch} accessibilityLabel={copy.header.searchOpenLabel}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchText}>{copy.header.searchPlaceholder}</Text>
      </MotionPressable>

      {spotlight ? (
        <MotionPressable
          style={styles.feature}
          onPress={() => onSelect(spotlight)}
          onLongPress={() => onLongPress(spotlight)}
          haptic="none"
          accessibilityLabel={spotlight.title}
        >
          {spotlight.posterUrl ? (
            <Image
              source={{ uri: spotlight.posterUrl }}
              style={styles.featureImage}
              contentFit="cover"
              transition={280}
              recyclingKey={`${spotlight.mediaType}-${spotlight.id}`}
            />
          ) : (
            <View style={styles.featureFallback}>
              <Text style={styles.featureFallbackText}>{spotlight.title.slice(0, 1)}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(4,6,14,0.35)', 'rgba(4,6,14,0.92)']}
            locations={[0, 0.5, 1]}
            style={styles.featureScrim}
            pointerEvents="none"
          />
          <View style={styles.featureContent}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Головна премʼєра</Text>
            </View>
            <Text style={styles.featureTitle} numberOfLines={2}>{spotlight.title}</Text>
            <Text style={styles.featureMeta}>{mediaLabel(spotlight)}</Text>
          </View>
        </MotionPressable>
      ) : null}

      {supporting.length > 0 ? (
        <View style={styles.supportingRow}>
          {supporting.slice(0, 3).map((item) => (
            <PosterCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onPress={onSelect}
              onLongPress={onLongPress}
              isSaved={isSaved(item)}
              size={SUPPORTING_SIZE}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: {
    gap: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headCopy: {
    gap: 4,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  feature: {
    height: 420,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureImage: {
    width: '100%',
    height: '100%',
  },
  featureFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  featureFallbackText: {
    color: colors.text,
    fontSize: 64,
    fontWeight: '800',
  },
  featureScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  featureContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.isDark ? '#04140f' : '#04140f',
    fontSize: 12,
    fontWeight: '800',
  },
  featureTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  featureMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  supportingRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
