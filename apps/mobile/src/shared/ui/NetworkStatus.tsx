import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from "react-native-reanimated";
import { useAuthStore } from "../../features/auth/store/authStore";
import { useTheme } from "../theme/ThemeProvider";
export function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  useEffect(() => {
    const restore = () => {
      const auth = useAuthStore.getState();
      if (auth.refreshToken && !auth.accessToken)
        void auth.refresh().catch(() => undefined);
    };
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false;
      onlineManager.setOnline(online);
      setOffline(!online);
      if (online) restore();
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") restore();
    });
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);
  if (!offline) return null;
  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.System)}
      style={[
        s.banner,
        {
          top: insets.top + 4,
          backgroundColor: colors.elevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: colors.text, fontSize: 12 }}
      >
        Немає з’єднання · показуємо збережені дані
      </Text>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  banner: {
    position: "absolute",
    alignSelf: "center",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    zIndex: 100,
  },
});
