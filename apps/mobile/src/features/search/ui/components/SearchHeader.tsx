import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';

type Props = {
  query: string;
  onChangeQuery: (value: string) => void;
  filter: 'all' | 'movie' | 'tv';
  onChangeFilter: (value: 'all' | 'movie' | 'tv') => void;
};

export function SearchHeader({ query, onChangeQuery, filter, onChangeFilter }: Props) {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.header}>{copy.sections.search}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={copy.search.placeholder}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={onChangeQuery}
          returnKeyType="search"
        />
      </View>
      <View style={styles.filterRow}>
        {(['all', 'movie', 'tv'] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.filterChip, filter === value ? styles.filterActive : null]}
            onPress={() => onChangeFilter(value)}
          >
            <Text style={styles.filterText}>
              {value === 'all'
                ? copy.filters.all
                : value === 'movie'
                ? copy.filters.movies
                : copy.filters.series}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    gap: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterActive: {
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.text,
    fontSize: 12,
  },
});
