import { ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '../../../shared/theme/colors';
import { copy } from '../../../shared/strings';
import { ProfileCard } from './components/ProfileCard';
import { ProfileActions } from './components/ProfileActions';
import { useProfileScreen } from '../hooks/useProfileScreen';

export default function ProfileScreen() {
  const {
    user,
    isGuest,
    initials,
    handleSignIn,
    handleResetGuest,
    handleSignOut,
  } = useProfileScreen();

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={styles.container}>
      <Text style={styles.header}>{copy.auth.profile}</Text>
      <ProfileCard initials={initials} email={user?.email} verified={user?.verified} />
      <ProfileActions
        isGuest={isGuest}
        hasUser={Boolean(user)}
        onSignIn={handleSignIn}
        onResetGuest={handleResetGuest}
        onSignOut={handleSignOut}
      />
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
});
