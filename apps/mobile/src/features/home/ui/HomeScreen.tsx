import { useCallback, useRef } from "react";
import {
  RefreshControl,
  StyleSheet,
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
import { HomeGreeting } from "./components/HomeGreeting";
import { HomeQuickActions } from "./components/HomeQuickActions";
import { HomeTasteTeaser } from "./components/HomeTasteTeaser";
import { HomeMoodTeaser } from "./components/HomeMoodTeaser";
import { HomeSection } from "./components/HomeSection";
import { HomePersonalFeed } from "./components/HomePersonalFeed";
import { HomeTopBar, HOME_TOP_BAR_HEIGHT } from "./components/HomeTopBar";
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

  const handleSearch = useCallback(() => {
    router.push("/search");
  }, [router]);

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
        <HomeGreeting name={username} onSearch={handleSearch} />
        {/* Returning users come back to continue something — keep it first. */}
        <HomePersonalFeed />
        <HomeSpotlight
          spotlight={spotlight}
          supporting={supporting}
          onSelect={handlePress}
          onLongPress={onAdd}
          isSaved={isSaved}
          isLoading={isLoading}
        />
        <HomeQuickActions />
        <HomeTasteTeaser />
      </View>
    ),
    [
      handlePress,
      handleSearch,
      isLoading,
      isSaved,
      onAdd,
      spotlight,
      supporting,
      username,
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
      <HomeTopBar scrollY={scrollY} />
      <FlashList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{
          ...styles.container,
          paddingTop: insets.top + HOME_TOP_BAR_HEIGHT + 8,
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
            progressViewOffset={insets.top + HOME_TOP_BAR_HEIGHT}
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
