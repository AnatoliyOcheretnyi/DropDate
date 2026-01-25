import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../src/state/AuthContext';
import { colors } from '../src/theme/colors';
import { copy } from '../../../libs/shared/src/strings';
import { AuthBackdrop } from '../src/components/AuthBackdrop';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isGuest, isLoading, continueAsGuest } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user || isGuest) {
      router.replace('/(tabs)');
    }
  }, [isGuest, isLoading, router, user]);

  return (
    <View style={styles.wrapper}>
      <AuthBackdrop />
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{copy.hero.eyebrow}</Text>
          <Text style={styles.title}>{copy.appName}</Text>
          <Text style={styles.lead}>{copy.hero.mobileLead}</Text>
        </View>
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>{copy.auth.signIn}</Text>
          <Text style={styles.panelLead}>{copy.auth.helperText}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={() => router.push('/auth')}>
              <Text style={styles.primaryText}>{copy.auth.signIn}</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => {
                continueAsGuest();
                router.replace('/(tabs)');
              }}
            >
              <Text style={styles.secondaryText}>{copy.auth.continueAsGuest}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    gap: 12,
    maxWidth: 320,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 5,
    color: colors.eyebrow,
    fontSize: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  lead: {
    color: colors.lead,
    fontSize: 15,
    lineHeight: 22,
  },
  actionPanel: {
    width: '100%',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 10,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  panelLead: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 10,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#04140f',
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
});
