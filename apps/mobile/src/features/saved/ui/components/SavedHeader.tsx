import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';
import type { ListType } from '../../../../shared/types/lists';

type Stat = {
  value: string | number;
  label: string;
  tone?: 'warm' | 'cool';
};

type Props = {
  activeList: ListType;
  onChangeList: (list: ListType) => void;
  stats: {
    left: Stat;
    middle: Stat;
    right: Stat;
  };
};

export function SavedHeader({ activeList, onChangeList, stats }: Props) {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.header}>{copy.header.savedList}</Text>
      <View style={styles.rowWrap}>
        <FlashList
          horizontal
          data={['follow', 'watchlist', 'favorite', 'watched', 'disliked'] as ListType[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = item === activeList;
            return (
              <Pressable
                style={[styles.tab, isActive ? styles.tabActive : null]}
                onPress={() => onChangeList(item)}
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
            stats.middle.tone === 'warm' ? styles.statWarm : null,
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
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    gap: 18,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  rowWrap: {
    marginHorizontal: -20,
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
  },
  tabActive: {
    borderColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: colors.text,
  },
  rowSeparator: {
    width: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 4,
  },
  statLeft: {
    flex: 1.1,
  },
  statMiddle: {
    flex: 1,
  },
  statRight: {
    flex: 0.9,
  },
  statWarm: {
    borderColor: 'rgba(255,200,120,0.55)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
