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

import { useAuth } from '../src/state/AuthContext';
import { colors } from '../src/theme/colors';
import { copy } from '../../../libs/shared/src/strings';

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
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
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
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
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
