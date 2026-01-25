import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';

type Props = {
  onSignIn: () => void;
  onContinueAsGuest: () => void;
};

export function WelcomeActionPanel({ onSignIn, onContinueAsGuest }: Props) {
  return (
    <View style={styles.actionPanel}>
      <Text style={styles.panelTitle}>{copy.auth.signIn}</Text>
      <Text style={styles.panelLead}>{copy.auth.helperText}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={onSignIn}>
          <Text style={styles.primaryText}>{copy.auth.signIn}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onContinueAsGuest}>
          <Text style={styles.secondaryText}>{copy.auth.continueAsGuest}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
