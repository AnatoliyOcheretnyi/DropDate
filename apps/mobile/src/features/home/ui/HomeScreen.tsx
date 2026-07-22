import { useCallback, useMemo } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";

import { ListPickerModal } from "../../../shared/ui/ListPickerModal";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import { AnimatedSection } from "../../../shared/ui/AnimatedScreen";
import { NotificationBell } from "../../../shared/ui/NotificationBell";
import type { Suggestion } from "../../../shared/types/release";
import { HomeSpotlight } from "./components/HomeSpotlight";
import { HomeQuickActions } from "./components/HomeQuickActions";
import { HomeTasteChips } from "./components/HomeTasteChips";
import { HomeMoodTeaser } from "./components/HomeMoodTeaser";
import { HomeSection } from "./components/HomeSection";
import { HomePersonalFeed } from "./components/HomePersonalFeed";
import { useHomeScreen } from "../hooks/useHomeScreen";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    sections,
    spotlight,
    supporting,
    isLoading,
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

  const ListHeader = useMemo(
    () => (
      <View style={styles.header}>
        <HomeSpotlight
          spotlight={spotlight}
          supporting={supporting}
          onSelect={handlePress}
          onLongPress={onAdd}
          onSearch={handleSearch}
          isSaved={isSaved}
        />
        <HomeQuickActions />
        <HomePersonalFeed />
        <View style={styles.taste}>
          <HomeTasteChips />
        </View>
      </View>
    ),
    [spotlight, supporting, handlePress, onAdd, handleSearch, isSaved],
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <NotificationBell />
      <FlashList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AnimatedSection index={index}>
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
            />
          </AnimatedSection>
        )}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={<HomeMoodTeaser />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 148,
  },
  header: {
    gap: 22,
    marginBottom: 24,
  },
  taste: {
    gap: 8,
  },
  separator: {
    height: 26,
  },
});
