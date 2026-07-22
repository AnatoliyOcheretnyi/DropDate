import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { storageGetString, storageSetString } from "../utils/storage";
import {
  darkPalette,
  lightPalette,
  type Palette,
  type ThemeMode,
} from "./palette";

const STORAGE_KEY = "dropdate_theme_mode";

type ThemeContextValue = {
  colors: Palette;
  mode: ThemeMode;
  scheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "system" || value === "light" || value === "dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = storageGetString(STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  });

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    storageSetString(STORAGE_KEY, next);
  }, []);

  const scheme: "light" | "dark" =
    mode === "system" ? (systemScheme === "light" ? "light" : "dark") : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: scheme === "light" ? lightPalette : darkPalette,
      mode,
      scheme,
      setMode,
    }),
    [scheme, mode, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback keeps non-wrapped call sites working (dark by default).
    return {
      colors: darkPalette,
      mode: "dark",
      scheme: "dark",
      setMode: () => {},
    };
  }
  return ctx;
}

// Convenience hook for the common case where only colors are needed.
export function useColors(): Palette {
  return useTheme().colors;
}
