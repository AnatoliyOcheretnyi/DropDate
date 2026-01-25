import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { colors } from '../../../shared/theme/colors';
import { copy } from '../../../shared/strings';
import { SavedHeader } from './components/SavedHeader';
import { SavedSection } from './components/SavedSection';
import { useSavedScreen } from '../hooks/useSavedScreen';

export default function SavedScreen() {
  const {
    activeList,
    setActiveList,
    listItems,
    sections,
    stats,
    removeRelease,
  } = useSavedScreen();

  return (
    <View style={styles.wrapper}>
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
          />
        }
        ListEmptyComponent={
          listItems.length === 0 ? <Text style={styles.hint}>{copy.hints.listEmpty}</Text> : null
        }
        contentContainerStyle={styles.container}
        estimatedItemSize={280}
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
    paddingBottom: 32,
    gap: 18,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
