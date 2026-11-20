import { getSiteURL } from "../../../shared/utils/config";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useListPicker } from "../../saved/hooks/useListPicker";
import { ListPickerModal } from "../../../shared/ui/ListPickerModal";
import { useToast } from "../../../shared/ui/Toast";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { DetailsHero } from "./components/DetailsHero";
import { DetailsMetaCard } from "./components/DetailsMetaCard";
import { DetailsReleaseCard } from "./components/DetailsReleaseCard";
import { DetailsRecommendations } from "./components/DetailsRecommendations";
import { useDetailsScreen } from "../hooks/useDetailsScreen";
import { DetailsCast } from "./components/DetailsCast";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { DetailsPersonalControls } from "./components/DetailsPersonalControls";
import { WatchProviders } from "./components/WatchProviders";
import { RecommendFriend } from "./components/RecommendFriend";
import { EpisodeTracker } from "./components/EpisodeTracker";
import { AddToSharedList } from "./components/AddToSharedList";

export default function DetailsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const picker = useListPicker();
  const { showToast } = useToast();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    details,
    release,
    recommendations,
    isLoading,
    error,
    refetch,
    isSuggestionSaved,
  } = useDetailsScreen();

  const backButton = (
    <MotionPressable
      accessibilityLabel="Назад"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 20,
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.overlay,
        alignItems: "center",
        justifyContent: "center",
      }}
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
    >
      <Ionicons name="arrow-back" size={23} color={colors.text} />
    </MotionPressable>
  );

  if (isLoading && !details) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.bannerSkeleton} />
        <View style={styles.content}>
          <View style={styles.posterSkeleton} />
          <View style={styles.textSkeleton} />
          <ActivityIndicator color={colors.accent} />
        </View>
        {backButton}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <DetailsHero
          details={details}
          onAdd={() => details && picker.openPicker(details)}
          isSaved={isSuggestionSaved}
        />

        {error ? (
          <ScreenState title={error} onRetry={() => void refetch()} />
        ) : null}

        {details && <DetailsMetaCard details={details} />}
        {details ? <DetailsPersonalControls details={details} /> : null}
        {details ? <RecommendFriend details={details} /> : null}
        {details ? <AddToSharedList details={details} /> : null}

        {details ? (
          <MotionPressable
            style={styles.shareButton}
            onPress={() =>
              void Share.share({
                message: `${details.title} — ${getSiteURL()}/title/${details.mediaType}/${details.id}`,
              }).catch(() => showToast("Не вдалося поділитися"))
            }
          >
            <Text style={styles.shareText}>Поділитися</Text>
          </MotionPressable>
        ) : null}

        {release ? <DetailsReleaseCard release={release} /> : null}
        {details ? <WatchProviders providers={details.watchProviders} /> : null}
        {details ? <EpisodeTracker details={details} /> : null}

        {details ? (
          <DetailsCast cast={details.cast} directors={details.directors} />
        ) : null}

        <DetailsRecommendations items={recommendations} />
      </ScrollView>
      {backButton}
      <ListPickerModal
        visible={picker.pickerVisible}
        value={picker.pickerItem ? picker.getListTypes(picker.pickerItem) : []}
        onClose={picker.closePicker}
        onApply={picker.applyListTypes}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
      backgroundColor: colors.elevated,
    },
    content: {
      padding: 20,
      gap: 12,
    },
    posterSkeleton: {
      width: 140,
      height: 210,
      borderRadius: 18,
      backgroundColor: colors.elevated,
    },
    textSkeleton: {
      height: 18,
      borderRadius: 6,
      backgroundColor: colors.elevated,
    },
    shareButton: {
      marginHorizontal: 20,
      marginTop: 18,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    shareText: { color: colors.text, fontWeight: "800", fontSize: 15 },
  });
