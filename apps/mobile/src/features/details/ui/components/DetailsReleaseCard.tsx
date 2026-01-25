import { StyleSheet, Text, View } from 'react-native';

import type { ReleaseInfo } from '../../../../shared/types/release';
import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';
import { getReleaseStatusLabel } from '../../../../shared/types/release';
import { formatFullDate } from '../../../../shared/utils/date';

type Props = {
  release: ReleaseInfo;
};

export function DetailsReleaseCard({ release }: Props) {
  const formatted = formatFullDate(release.nextRelease) ?? copy.misc.dash;

  return (
    <View style={styles.releaseCard}>
      <Text style={styles.sectionTitle}>{copy.sections.nextRelease}</Text>
      <Text style={styles.releaseLabel}>
        {getReleaseStatusLabel(release.status, release.type)}
      </Text>
      <Text style={styles.releaseDate}>{formatted}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  releaseCard: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  releaseLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  releaseDate: {
    color: colors.text,
    fontSize: 16,
    marginTop: 4,
  },
});
