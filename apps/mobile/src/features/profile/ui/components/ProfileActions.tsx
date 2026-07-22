import { StyleSheet, View } from "react-native";

import { ActionButton } from "../../../../shared/ui/ActionButton";
import { copy } from "../../../../shared/strings";

type Props = {
  isGuest: boolean;
  hasUser: boolean;
  onSignIn: () => void;
  onResetGuest: () => void;
  onSignOut: () => void;
};

export function ProfileActions({
  isGuest,
  hasUser,
  onSignIn,
  onResetGuest,
  onSignOut,
}: Props) {
  return (
    <View style={styles.actions}>
      {isGuest || !hasUser ? (
        <>
          <ActionButton label={copy.auth.signIn} onPress={onSignIn} />
          <ActionButton
            label={copy.auth.resetGuest}
            variant="ghost"
            onPress={onResetGuest}
          />
        </>
      ) : (
        <ActionButton
          label={copy.auth.signOut}
          variant="ghost"
          onPress={onSignOut}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
});
