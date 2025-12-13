import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { ReleaseInfo } from '../types/release';

const formatter = new Intl.DateTimeFormat('uk-UA', {
  dateStyle: 'full',
});

type Props = {
  release: ReleaseInfo;
};

export function ReleaseCard({ release }: Props) {
  const date = formatter.format(new Date(release.nextRelease));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Наступний реліз</Text>
      <Text style={styles.title}>{release.title}</Text>
      <View style={styles.details}>
        <Detail label="Тип" value={release.type} />
        <Detail label="Дата" value={date} />
        <Detail label="Джерело" value={release.source} />
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 16,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: colors.eyebrow,
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  details: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'column',
    gap: 4,
  },
  metaLabel: {
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontSize: 12,
    color: colors.textMuted,
  },
  metaValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
