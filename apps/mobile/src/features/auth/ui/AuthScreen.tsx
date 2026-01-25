import { StyleSheet, View } from 'react-native';

import { colors } from '../../../shared/theme/colors';
import { AuthBackdrop } from './AuthBackdrop';
import { AuthHero } from './components/AuthHero';
import { AuthFormPanel } from './components/AuthFormPanel';
import { useAuthScreen } from '../hooks/useAuthScreen';

export default function AuthScreen() {
  const {
    mode,
    email,
    password,
    confirm,
    message,
    busy,
    isLoading,
    title,
    canSubmit,
    setEmail,
    setPassword,
    setConfirm,
    handleSubmit,
    toggleMode,
  } = useAuthScreen();

  return (
    <View style={styles.wrapper}>
      <AuthBackdrop />
      <View style={styles.content}>
        <AuthHero title={title} />
        <AuthFormPanel
          mode={mode}
          email={email}
          password={password}
          confirm={confirm}
          message={message}
          isLoading={isLoading}
          canSubmit={canSubmit}
          busy={busy}
          onChangeEmail={setEmail}
          onChangePassword={setPassword}
          onChangeConfirm={setConfirm}
          onSubmit={handleSubmit}
          onToggleMode={toggleMode}
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
