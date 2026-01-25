import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { copy } from '../strings';
import { getReleaseStatusLabel, type ReleaseInfo } from '../types/release';

const formatter = new Intl.DateTimeFormat('uk-UA', {
  dateStyle: 'full',
});

type Props = {
  release: ReleaseInfo;
};

export function ReleaseCard({ release }: Props) {
  const date = formatter.format(new Date(release.nextRelease));
  const heroImage = release.backdropUrl ?? release.posterUrl;
  const placeholder = !heroImage;
  const label = getReleaseStatusLabel(release.status, release.type);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.hero, placeholder && styles.heroPlaceholder]}>
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
        ) : (
          <Text style={styles.heroLetter}>{release.title.slice(0, 1)}</Text>
        )}
      </View>
      <View style={styles.infoColumn}>
        <Text style={styles.title}>{release.title}</Text>
        <View style={styles.details}>
          <Detail label={copy.details.labels.type} value={release.type} />
          <Detail label={copy.details.labels.date} value={date} />
          <Detail label={copy.details.labels.source} value={release.source} />
        </View>
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  heroLetter: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
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
