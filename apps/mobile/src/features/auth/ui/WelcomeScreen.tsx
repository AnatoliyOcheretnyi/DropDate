import { StyleSheet, View } from 'react-native';

import { colors } from '../../../shared/theme/colors';
import { copy } from '../../../shared/strings';
import { AuthBackdrop } from './AuthBackdrop';
import { AuthHero } from './components/AuthHero';
import { WelcomeActionPanel } from './components/WelcomeActionPanel';
import { useWelcomeScreen } from '../hooks/useWelcomeScreen';

export default function WelcomeScreen() {
  const { handleSignIn, handleContinueAsGuest } = useWelcomeScreen();

  return (
    <View style={styles.wrapper}>
      <AuthBackdrop />
      <View style={styles.content}>
        <AuthHero title={copy.appName} titleSize={36} leadSize={15} />
        <WelcomeActionPanel
          onSignIn={handleSignIn}
          onContinueAsGuest={handleContinueAsGuest}
        />
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
});
