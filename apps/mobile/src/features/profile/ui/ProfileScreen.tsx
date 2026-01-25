import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '../../../shared/theme/colors';
import { useAuth } from '../../auth/store/authStore';
import { copy } from '../../../shared/strings';
import { ActionButton } from '../../../shared/ui/ActionButton';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isGuest, logout, resetGuest } = useAuth();

  const initials = user?.email ? user.email.charAt(0).toUpperCase() : 'G';

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={styles.container}>
      <Text style={styles.header}>{copy.auth.profile}</Text>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.name}>
            {user?.email ?? copy.auth.guestTitle}
          </Text>
          <Text style={styles.status}>
            {user?.verified === false
              ? copy.auth.verifyRequired
              : copy.auth.guestHint}
          </Text>
        </View>
      </View>

      {isGuest || !user ? (
        <View style={styles.actions}>
          <ActionButton
            label={copy.auth.signIn}
            onPress={() => router.push('/auth')}
          />
          <ActionButton
            label={copy.auth.resetGuest}
            variant="ghost"
            onPress={() => {
              resetGuest();
              router.replace('/welcome');
            }}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <ActionButton
            label={copy.auth.signOut}
            variant="ghost"
            onPress={async () => {
              await logout();
              router.replace('/welcome');
            }}
          />
        </View>
      )}
    </ScrollView>
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
    gap: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    color: colors.textMuted,
    fontSize: 13,
  },
  actions: {
    gap: 10,
  },
});
