import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';

import { ListPickerModal } from '../../../shared/ui/ListPickerModal';
import { colors } from '../../../shared/theme/colors';
import type { Suggestion } from '../../../shared/types/release';
import { HomeHero } from './components/HomeHero';
import { HomeSection } from './components/HomeSection';
import { useHomeScreen } from '../hooks/useHomeScreen';

export default function HomeScreen() {
  const router = useRouter();
  const {
    sections,
    isLoading,
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
    [router]
  );

  return (
    <View style={styles.wrapper}>
      <FlashList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HomeSection
            title={item.title}
            items={item.items}
            isLoading={isLoading}
            onPress={handlePress}
            onAdd={onAdd}
            isSaved={isSaved}
            reasons={item.reasons}
          />
        )}
        ListHeaderComponent={<HomeHero />}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
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

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
});
