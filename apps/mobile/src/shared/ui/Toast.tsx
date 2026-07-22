import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeOutDown,
  ReduceMotion,
} from "react-native-reanimated";

import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/palette";
import { MotionPressable } from "./MotionPressable";

type ToastAction = { label: string; onPress: () => void };
type Toast = { id: number; message: string; action?: ToastAction };

type ToastContextValue = {
  showToast: (message: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

const DURATION = 4000;
/** Clears the floating tab bar so the toast never sits under it. */
const TAB_BAR_CLEARANCE = 108;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, action?: ToastAction) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, action });
    timer.current = setTimeout(() => setToast(null), DURATION);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.springify()
            .damping(18)
            .reduceMotion(ReduceMotion.System)}
          exiting={FadeOutDown.duration(180).reduceMotion(ReduceMotion.System)}
          style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
          pointerEvents="box-none"
        >
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action ? (
              <MotionPressable
                style={styles.action}
                accessibilityLabel={toast.action.label}
                onPress={() => {
                  toast.action?.onPress();
                  dismiss();
                }}
              >
                <Text style={styles.actionText}>{toast.action.label}</Text>
              </MotionPressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 80,
    },
    toast: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingLeft: 16,
      paddingRight: 8,
      paddingVertical: 10,
      borderRadius: 18,
      backgroundColor: colors.isDark ? "#1b1f2e" : "#12172a",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    message: {
      flex: 1,
      color: "#ffffff",
      fontSize: 14.5,
      fontWeight: "600",
      lineHeight: 19,
    },
    action: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    actionText: {
      color: colors.accent,
      fontSize: 14.5,
      fontWeight: "900",
    },
  });
