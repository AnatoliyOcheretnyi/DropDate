import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../shared/theme/colors';
import { DetailsHero } from './components/DetailsHero';
import { DetailsMetaCard } from './components/DetailsMetaCard';
import { DetailsReleaseCard } from './components/DetailsReleaseCard';
import { DetailsRecommendations } from './components/DetailsRecommendations';
import { useDetailsScreen } from '../hooks/useDetailsScreen';
import { DetailsCast } from './components/DetailsCast';
import { MotionPressable } from '../../../shared/ui/MotionPressable';
import { DetailsPersonalControls } from './components/DetailsPersonalControls';

export default function DetailsScreen() {
  const { details, release, recommendations, isLoading, error, handleAdd, isSuggestionSaved } =
    useDetailsScreen();

  if (isLoading && !details) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.bannerSkeleton} />
        <View style={styles.content}>
          <View style={styles.posterSkeleton} />
          <View style={styles.textSkeleton} />
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <DetailsHero details={details} onAdd={handleAdd} isSaved={isSuggestionSaved} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {details && <DetailsMetaCard details={details} />}
        {details ? <DetailsPersonalControls details={details} /> : null}

        {details ? <MotionPressable
          style={styles.shareButton}
          onPress={() => void Share.share({ message: `${details.title} — подивись у DropDate` })}
        ><Text style={styles.shareText}>Поділитися</Text></MotionPressable> : null}

        {release ? <DetailsReleaseCard release={release} /> : null}

        {details ? <DetailsCast cast={details.cast} directors={details.directors} /> : null}

        <DetailsRecommendations items={recommendations} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingBottom: 32,
  },
  error: {
    color: colors.error,
    marginHorizontal: 20,
    marginTop: 12,
  },
  bannerSkeleton: {
    height: 280,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  posterSkeleton: {
    width: 140,
    height: 210,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  textSkeleton: {
    height: 18,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shareButton: { marginHorizontal: 20, marginTop: 18, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  shareText: { color: colors.text, fontWeight: '800', fontSize: 15 },
});
