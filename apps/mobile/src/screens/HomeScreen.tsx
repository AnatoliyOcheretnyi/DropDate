import { useCallback, useState } from 'react';
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

export default function HomeScreen() {
  const [title, setTitle] = useState('');
  const { release, error, isLoading, search } = useNextRelease();

  const handleSearch = useCallback(() => {
    search(title);
  }, [search, title]);

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
});
