import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ReleaseCard } from '../components/ReleaseCard';
import { useNextRelease } from '../hooks/useNextRelease';
import { colors } from '../theme/colors';
import type { Suggestion } from '../types/release';
import { getBackendURL } from '../utils/config';

export default function HomeScreen() {
  const [title, setTitle] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const { release, error, isLoading, search } = useNextRelease();
  const backendURL = useMemo(() => getBackendURL(), []);

  useEffect(() => {
    const trimmed = title.trim();
    let isCancelled = false;

    if (trimmed.length < 2) {
      setSuggestions([]);
      setSelectedSuggestion(null);
      setIsFetchingSuggestions(false);
      return;
    }

    if (
      selectedSuggestion &&
      selectedSuggestion.title.toLowerCase() === trimmed.toLowerCase()
    ) {
      setSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }

    if (
      selectedSuggestion &&
      selectedSuggestion.title.toLowerCase() !== trimmed.toLowerCase()
    ) {
      setSelectedSuggestion(null);
    }

    setIsFetchingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const url = `${backendURL}/suggest?query=${encodeURIComponent(trimmed)}&limit=5`;
        const response = await fetch(url, { headers: { accept: 'application/json' } });
        const payload = await response.json();
        if (!isCancelled) {
          if (response.ok) {
            setSuggestions((payload?.results as Suggestion[]) ?? []);
          } else {
            setSuggestions([]);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingSuggestions(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [backendURL, selectedSuggestion, title]);

  const handleSearch = useCallback(() => {
    search({
      title,
      tmdbId: selectedSuggestion?.id,
      mediaType: selectedSuggestion?.mediaType,
    });
    setSuggestions([]);
  }, [search, selectedSuggestion, title]);

  const handleSuggestionPress = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setTitle(suggestion.title);
    setSuggestions([]);
    search({
      title: suggestion.title,
      tmdbId: suggestion.id,
      mediaType: suggestion.mediaType,
    });
  };

  return (
    <View style={styles.wrapper}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>beta</Text>
            <Text style={styles.title}>DropDate</Text>
            <Text style={styles.lead}>
              Вводиш назву — отримуєш дату наступного релізу. Простий спосіб не прогавити нову серію.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Назва</Text>
            <TextInput
              style={styles.input}
              placeholder="Наприклад, Dune"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.button} onPress={handleSearch} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#001b12" /> : <Text style={styles.buttonText}>Знайти</Text>}
            </TouchableOpacity>
            {isFetchingSuggestions ? <Text style={styles.hint}>Підбираємо варіанти…</Text> : null}
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={`${suggestion.mediaType}-${suggestion.id}`}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                <Text style={styles.suggestionMeta}>
                  {suggestion.mediaType === 'movie' ? 'Фільм' : 'Серіал'}
                  {suggestion.year ? ` · ${suggestion.year}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          {release ? <ReleaseCard release={release} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 28,
  },
  hero: {
    gap: 12,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 6,
    color: colors.eyebrow,
    fontSize: 13,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text,
  },
  lead: {
    color: colors.lead,
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 12,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonText: {
    color: '#001b12',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: colors.error,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  suggestionItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  suggestionMeta: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
});
