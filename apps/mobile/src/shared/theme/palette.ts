export type Palette = {
  isDark: boolean;
  // Surfaces
  background: string;
  surface: string;
  elevated: string;
  overlay: string;
  // Text
  text: string;
  textMuted: string;
  eyebrow: string;
  lead: string;
  // Chrome
  card: string;
  border: string;
  shadow: string;
  // Accent
  accent: string;
  accentDark: string;
  accentSoft: string;
  accentGradient: readonly [string, string];
  // Status
  error: string;
};

export const darkPalette: Palette = {
  isDark: true,
  background: "#0a0c18",
  surface: "rgba(255, 255, 255, 0.05)",
  elevated: "rgba(255, 255, 255, 0.08)",
  overlay: "rgba(6, 8, 16, 0.86)",
  text: "#f5f5f5",
  textMuted: "rgba(245, 245, 245, 0.7)",
  eyebrow: "rgba(245, 245, 245, 0.6)",
  lead: "rgba(245, 245, 245, 0.8)",
  card: "rgba(255, 255, 255, 0.05)",
  border: "rgba(255, 255, 255, 0.12)",
  shadow: "#000000",
  accent: "#54ffb6",
  accentDark: "#29c986",
  accentSoft: "rgba(84, 255, 182, 0.14)",
  accentGradient: ["#54ffb6", "#22b98a"],
  error: "#ff7a85",
};

export const lightPalette: Palette = {
  isDark: false,
  background: "#f4f6fb",
  surface: "#ffffff",
  elevated: "#ffffff",
  overlay: "rgba(255, 255, 255, 0.86)",
  text: "#0d1220",
  textMuted: "rgba(13, 18, 32, 0.62)",
  eyebrow: "rgba(13, 18, 32, 0.55)",
  lead: "rgba(13, 18, 32, 0.78)",
  card: "rgba(13, 18, 32, 0.045)",
  border: "rgba(13, 18, 32, 0.1)",
  shadow: "rgba(13, 18, 32, 0.18)",
  accent: "#00b673",
  accentDark: "#009c62",
  accentSoft: "rgba(0, 182, 115, 0.12)",
  accentGradient: ["#00d488", "#00996a"],
  error: "#e5484d",
};

export type ThemeMode = "system" | "light" | "dark";

export const palettes: Record<"light" | "dark", Palette> = {
  light: lightPalette,
  dark: darkPalette,
};
