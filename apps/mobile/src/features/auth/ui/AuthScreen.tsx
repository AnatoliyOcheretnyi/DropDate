import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../store/authStore';
import { colors } from '../../../shared/theme/colors';
import { copy } from '../../../shared/strings';
import { AuthBackdrop } from './AuthBackdrop';

export default function AuthScreen() {
  const router = useRouter();
  const { login, register, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = mode === 'login' ? copy.auth.loginTitle : copy.auth.registerTitle;
  const submitLabel = mode === 'login' ? copy.auth.submitLogin : copy.auth.submitRegister;

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (mode === 'register' && password !== confirm) return false;
    return true;
  }, [confirm, email, mode, password]);

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    setMessage(null);
    setBusy(true);
    const action = mode === 'login' ? login : register;
    const result = await action(email.trim(), password.trim());
    setBusy(false);

    if (result.status === 'ok') {
      router.replace('/(tabs)');
      return;
    }
    if (result.status === 'verification_required') {
      setMessage(copy.auth.verifyText);
      return;
    }
    if (result.status === 'email_not_verified') {
      setMessage(copy.auth.verifyErrorExpired);
      return;
    }
    if (result.status === 'error') {
      setMessage(result.message || copy.auth.errorGeneric);
      return;
    }
  };

  return (
    <View style={styles.wrapper}>
      <AuthBackdrop />
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{copy.hero.eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.lead}>{copy.hero.mobileLead}</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{mode === 'login' ? copy.auth.signIn : copy.auth.submitRegister}</Text>
          <Text style={styles.panelLead}>{copy.auth.helperText}</Text>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={copy.auth.emailPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder={copy.auth.passwordPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
            />
            {mode === 'register' ? (
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder={copy.auth.confirmPasswordPlaceholder}
                placeholderTextColor={colors.textMuted}
                value={confirm}
                onChangeText={setConfirm}
              />
            ) : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          <Pressable
            style={[styles.primary, !canSubmit || busy ? styles.primaryDisabled : null]}
            onPress={handleSubmit}
          >
            {busy || isLoading ? (
              <ActivityIndicator color="#04140f" />
            ) : (
              <Text style={styles.primaryText}>{submitLabel}</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.switch}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            <Text style={styles.switchText}>
              {mode === 'login' ? copy.auth.switchToRegister : copy.auth.switchToLogin}
            </Text>
          </Pressable>
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
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  lead: {
    color: colors.lead,
    fontSize: 14,
    lineHeight: 20,
  },
  panel: {
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
  form: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: '#04140f',
    fontWeight: '700',
    fontSize: 16,
  },
  switch: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
