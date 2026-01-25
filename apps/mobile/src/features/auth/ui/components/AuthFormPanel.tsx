import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';

type Props = {
  mode: 'login' | 'register';
  email: string;
  password: string;
  confirm: string;
  message: string | null;
  isLoading: boolean;
  canSubmit: boolean;
  busy: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirm: (value: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
};

export function AuthFormPanel({
  mode,
  email,
  password,
  confirm,
  message,
  isLoading,
  canSubmit,
  busy,
  onChangeEmail,
  onChangePassword,
  onChangeConfirm,
  onSubmit,
  onToggleMode,
}: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>
        {mode === 'login' ? copy.auth.signIn : copy.auth.submitRegister}
      </Text>
      <Text style={styles.panelLead}>{copy.auth.helperText}</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={copy.auth.emailPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={onChangeEmail}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder={copy.auth.passwordPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={onChangePassword}
        />
        {mode === 'register' ? (
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder={copy.auth.confirmPasswordPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={confirm}
            onChangeText={onChangeConfirm}
          />
        ) : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      <Pressable
        style={[styles.primary, !canSubmit || busy ? styles.primaryDisabled : null]}
        onPress={onSubmit}
      >
        {busy || isLoading ? (
          <ActivityIndicator color="#04140f" />
        ) : (
          <Text style={styles.primaryText}>
            {mode === 'login' ? copy.auth.submitLogin : copy.auth.submitRegister}
          </Text>
        )}
      </Pressable>
      <Pressable style={styles.switch} onPress={onToggleMode}>
        <Text style={styles.switchText}>
          {mode === 'login' ? copy.auth.switchToRegister : copy.auth.switchToLogin}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
