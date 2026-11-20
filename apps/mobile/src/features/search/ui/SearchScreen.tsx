import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PosterCard } from "../../../shared/ui/PosterCard";
import { NotificationBell } from "../../../shared/ui/NotificationBell";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { copy } from "../../../shared/strings";
import type { Suggestion } from "../../../shared/types/release";
import { SearchHeader } from "./components/SearchHeader";
import { SearchUnderstanding } from "./components/SearchUnderstanding";
import { useSearchScreen } from "../hooks/useSearchScreen";

/** Seeds for phrase mode — they double as an explanation of what it accepts. */
const EXAMPLES = [
  "комедія з привидами",
  "щось легке про любов",
  "розумна фантастика без екшену",
  "детектив у маленькому місті",
  "молодіжний жах де багато крові",
];

export default function SearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width < 360 ? 2 : width > 700 ? 4 : 3;
  const posterSize = useMemo(
    () => ({
      width: (width - 40 - 12 * (columns - 1)) / columns,
      height: ((width - 40 - 12 * (columns - 1)) / columns) * 1.5,
    }),
    [width, columns],
  );
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    titleError,
    query,
    setQuery,
    mode,
    switchMode,
    filter,
    setFilter,
    sort,
    setSort,
    filteredResults,
    isLoading,
    page,
    totalPages,
    loadResults,
    handleAdd,
    isSuggestionSaved,
    labels,
    summary,
    broadened,
    phraseError,
    phraseHasMore,
    runPhraseSearch,
    loadMorePhrase,
    removeLabel,
    suggestPhraseSearch,
  } = useSearchScreen();

  const handlePress = useCallback(
    (item: Suggestion) => {
      router.push(`/title/${item.mediaType}/${item.id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Suggestion }) => (
      <PosterCard
        item={item}
        size={posterSize}
        onPress={handlePress}
        onAdd={handleAdd}
        isSaved={isSuggestionSaved(item)}
      />
    ),
    [handleAdd, handlePress, isSuggestionSaved, posterSize],
  );

  const header = (
    <View style={styles.header}>
      <Text style={{ color: colors.textMuted, fontSize: 10, letterSpacing: 2 }}>
        ЩОСЬ ОСОБЛИВЕ ДЛЯ ТЕБЕ
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: 34,
          fontWeight: "700",
          letterSpacing: -1,
          marginBottom: 8,
        }}
      >
        Знайди свою історію.
      </Text>
      {mode === "title" && titleError ? (
        <MotionPressable onPress={() => void loadResults(page, page > 1)}>
          <Text style={styles.error}>{titleError}</Text>
        </MotionPressable>
      ) : null}
      <SearchHeader
        query={query}
        onChangeQuery={setQuery}
        mode={mode}
        onChangeMode={switchMode}
        onSubmit={() => runPhraseSearch()}
        filter={filter}
        onChangeFilter={setFilter}
        sort={sort}
        onChangeSort={setSort}
      />

      {/* The bridge: a title query that reads like a sentence gets offered to
          the other engine instead of returning nothing useful. */}
      {suggestPhraseSearch ? (
        <MotionPressable
          style={styles.bridge}
          onPress={() => runPhraseSearch()}
          accessibilityLabel="Шукати за описом"
        >
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={styles.bridgeText}>
            Схоже на опис, а не назву. Пошукати за змістом?
          </Text>
          <Ionicons name="arrow-forward" size={15} color={colors.accent} />
        </MotionPressable>
      ) : null}

      {mode === "phrase" ? (
        <SearchUnderstanding
          labels={labels}
          summary={summary}
          broadened={broadened}
          onRemove={removeLabel}
        />
      ) : null}

      {phraseError ? <Text style={styles.error}>{phraseError}</Text> : null}
    </View>
  );

  const empty = () => {
    if (isLoading) {
      return <ActivityIndicator color={colors.accent} style={styles.loader} />;
    }
    if (mode === "phrase" && labels.length === 0) {
      return (
        <View style={styles.examples}>
          <Text style={styles.examplesTitle}>
            Опиши настрій, сюжет чи відчуття — і ми зберемо добірку.
          </Text>
          {EXAMPLES.map((phrase) => (
            <MotionPressable
              key={phrase}
              style={styles.example}
              onPress={() => runPhraseSearch(phrase)}
              accessibilityLabel={`Пошук: ${phrase}`}
            >
              <Text style={styles.exampleText}>{phrase}</Text>
              <Ionicons
                name="arrow-forward"
                size={15}
                color={colors.textMuted}
              />
            </MotionPressable>
          ))}
        </View>
      );
    }
    if (query.trim().length < 2) {
      return (
        <Text style={styles.hint}>
          Введи назву — або перемкнись на «За описом».
        </Text>
      );
    }
    return <Text style={styles.hint}>{copy.search.empty}</Text>;
  };

  const canLoadMore = mode === "phrase" ? phraseHasMore : page < totalPages;

  return (
    <View style={styles.wrapper}>
      <NotificationBell />
      <FlashList
        data={filteredResults}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        numColumns={columns}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          canLoadMore ? (
            <MotionPressable
              style={styles.loadMore}
              onPress={() =>
                mode === "phrase"
                  ? loadMorePhrase()
                  : loadResults(page + 1, true)
              }
              disabled={isLoading}
              accessibilityLabel={copy.actions.loadMore}
            >
              <Text style={styles.loadMoreText}>
                {isLoading ? copy.hints.loadingResults : copy.actions.loadMore}
              </Text>
            </MotionPressable>
          ) : null
        }
        contentContainerStyle={{
          ...styles.container,
          // Clears the floating bell, which sits at insets.top + 8 and is 44 tall.
          paddingTop: Math.max(insets.top + 8, 18) + 56,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
      paddingHorizontal: 20,
      paddingBottom: 148,
    },
    header: { gap: 12, paddingBottom: 16 },
    bridge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 13,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    bridgeText: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
    },
    error: {
      color: colors.error,
      fontSize: 13,
    },
    loader: { marginTop: 24 },
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 8,
    },
    examples: { gap: 10, marginTop: 4 },
    examplesTitle: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 2,
    },
    example: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 15,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    exampleText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    loadMore: {
      alignSelf: "center",
      marginTop: 18,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },
    loadMoreText: {
      color: colors.text,
      fontWeight: "700",
    },
  });
