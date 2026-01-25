import { StyleSheet, Text, View } from 'react-native';

import type { Details } from '../../../../shared/types/release';
import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';
import { formatFullDate } from '../../../../shared/utils/date';

type Props = {
  details: Details;
};

export function DetailsMetaCard({ details }: Props) {
  const formatDate = (value?: string) => formatFullDate(value) ?? copy.misc.dash;

  return (
    <View style={styles.metaCard}>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{copy.details.labels.status}</Text>
        <Text style={styles.metaValue}>{details.status || copy.misc.dash}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{copy.details.labels.release}</Text>
        <Text style={styles.metaValue}>
          {formatDate(details.releaseDate || details.firstAirDate)}
        </Text>
      </View>
      {details.nextAirDate ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{copy.details.labels.nextEpisode}</Text>
          <Text style={styles.metaValue}>{formatDate(details.nextAirDate)}</Text>
        </View>
      ) : null}
      {details.lastAirDate ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{copy.details.labels.lastEpisode}</Text>
          <Text style={styles.metaValue}>{formatDate(details.lastAirDate)}</Text>
        </View>
      ) : null}
      {details.genres?.length ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{copy.details.labels.genres}</Text>
          <Text style={styles.metaValue}>{details.genres.join(', ')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metaCard: {
    marginTop: 24,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
});
