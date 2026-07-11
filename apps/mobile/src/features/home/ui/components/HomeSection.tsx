import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Suggestion } from '../../../../shared/types/release';
import { colors } from '../../../../shared/theme/colors';
import { HomeRow } from './HomeRow';

type Props = {
  title: string;
  items: Suggestion[];
  isLoading: boolean;
  onPress: (item: Suggestion) => void;
  onAdd: (item: Suggestion) => void;
  isSaved: (item: Suggestion) => boolean;
  reasons?: string[];
};

export function HomeSection({ title, items, isLoading, onPress, onAdd, isSaved, reasons }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {reasons?.map((reason) => <Text key={reason} style={styles.reason}>{reason}</Text>)}
      {isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <HomeRow items={items} onPress={onPress} onAdd={onAdd} isSaved={isSaved} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  reason: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
