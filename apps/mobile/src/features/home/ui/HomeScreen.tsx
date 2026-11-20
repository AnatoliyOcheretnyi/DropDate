import { useCallback, useRef } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSharedValue } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { ListPickerModal } from "../../../shared/ui/ListPickerModal";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import { AnimatedSection } from "../../../shared/ui/AnimatedScreen";
import { ScreenState } from "../../../shared/ui/ScreenState";
import type { Suggestion } from "../../../shared/types/release";
import { useAuthStore } from "../../auth/store/authStore";
import { HomeSpotlight } from "./components/HomeSpotlight";
import { HomeQuickActions } from "./components/HomeQuickActions";
import { HomeTasteTeaser } from "./components/HomeTasteTeaser";
import { HomeMoodTeaser } from "./components/HomeMoodTeaser";
import { HomeSection } from "./components/HomeSection";
import { HomePersonalFeed } from "./components/HomePersonalFeed";
import { HomeTopBar } from "./components/HomeTopBar";
import { StreakCard } from "../../streak/ui/StreakCard";
import {
  useHomeScreen,
  type HomeSection as Section,
} from "../hooks/useHomeScreen";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  // Anchors the intro animation so recycled cells don't replay it mid-scroll.
  const mountedAt = useRef(Date.now()).current;
  const username = useAuthStore((state) => state.user?.username);

  const {
    sections,
    spotlight,
    supporting,
    isLoading,
    isError,
    isPartial,
    isRefreshing,
    refetch,
    onAdd,
    isSaved,
    pickerItem,
    pickerVisible,
    closePicker,
    applyListTypes,
    getListTypes,
  } = useHomeScreen();

  const handlePress = useCallback(
    (item: Suggestion) => {
      router.push(`/title/${item.mediaType}/${item.id}`);
    },
    [router],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Section; index: number }) => (
      <AnimatedSection index={index} mountedAt={mountedAt}>
        <HomeSection
          title={item.title}
          kicker={item.kicker}
          variant={item.variant}
          items={item.items}
          isLoading={isLoading}
          onPress={handlePress}
          onAdd={onAdd}
          onLongPress={onAdd}
          isSaved={isSaved}
          reasons={item.reasons}
          onSeeAll={
            item.collectionId
              ? () => router.push(`/collection/${item.collectionId}`)
              : undefined
          }
        />
      </AnimatedSection>
    ),
    [handlePress, isLoading, isSaved, mountedAt, onAdd, router],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        {isPartial ? (
          <Text style={{ color: colors.textMuted, lineHeight: 20 }}>
            Частина добірок тимчасово недоступна. Потягни вниз, щоб оновити.
          </Text>
        ) : null}
        {/* Art first: the strongest thing on the screen used to sit below a
            greeting, a heading and a search field. */}
        <HomeSpotlight
          spotlight={spotlight}
          supporting={supporting}
          onSelect={handlePress}
          onLongPress={onAdd}
          isSaved={isSaved}
          isLoading={isLoading}
        />
        {/* Returning users come back to continue something. */}
        <HomePersonalFeed />
        {/* The habit loop sits above the shortcuts: it is the one thing on the
            feed that changes because of what you did yesterday. */}
        <StreakCard />
        <HomeQuickActions />
        <HomeTasteTeaser />
      </View>
    ),
    [
      colors.textMuted,
      handlePress,
      isLoading,
      isPartial,
      isSaved,
      onAdd,
      spotlight,
      supporting,
    ],
  );

  const renderFooter = useCallback(
    () => (
      <View style={styles.footer}>
        <HomeMoodTeaser />
      </View>
    ),
    [],
  );

  if (isError) {
    return (
      <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
        <ScreenState
          title="Не вдалося завантажити"
          message="Перевір зʼєднання — ми спробуємо ще раз."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <HomeTopBar scrollY={scrollY} name={username} />
      <FlashList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter()}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{
          ...styles.container,
          // The hero runs under the top bar, which is transparent until the
          // feed scrolls.
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 12) + 96,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressViewOffset={0}
          />
        }
      />
      <ListPickerModal
        visible={pickerVisible}
        value={pickerItem ? getListTypes(pickerItem) : []}
        onClose={closePicker}
        onApply={applyListTypes}
      />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 148,
  },
  header: {
    gap: 24,
    marginBottom: 24,
  },
  footer: {
    gap: 20,
    marginTop: 26,
  },
  separator: {
    height: 26,
  },
});
