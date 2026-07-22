import { StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { NotificationBell } from "../../../shared/ui/NotificationBell";

import { colors } from "../../../shared/theme/colors";
import { copy } from "../../../shared/strings";
import { SavedHeader } from "./components/SavedHeader";
import { SavedSection } from "./components/SavedSection";
import { useSavedScreen } from "../hooks/useSavedScreen";

export default function SavedScreen() {
  const {
    activeList,
    setActiveList,
    sort,
    setSort,
    listItems,
    sections,
    stats,
    removeRelease,
  } = useSavedScreen();

  return (
    <View style={styles.wrapper}>
      <NotificationBell />
      <FlashList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SavedSection
            title={item.title}
            items={item.items}
            activeList={activeList}
            onRemove={removeRelease}
          />
        )}
        ListHeaderComponent={
          <SavedHeader
            activeList={activeList}
            onChangeList={setActiveList}
            stats={stats}
            sort={sort}
            onChangeSort={setSort}
          />
        }
        ListEmptyComponent={
          listItems.length === 0 ? (
            <Text style={styles.hint}>{copy.hints.listEmpty}</Text>
          ) : null
        }
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 148,
    gap: 18,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
