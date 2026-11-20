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
  /** Ratings, countdowns and release dates — never actions. */
  gold: string;
  accentDark: string;
  accentSoft: string;
  accentGradient: readonly [string, string];
  // Status
  error: string;
};

// "Опівнічна": a neutral near-black instead of the old blue-violet #0a0c18,
// which tinted every poster, plus a real third surface level so a card on a
// card is distinguishable.
export const darkPalette: Palette = {
  isDark: true,
  background: "#101412",
  surface: "#191e1b",
  elevated: "#252c27",
  overlay: "rgba(6, 9, 13, 0.88)",
  text: "#f2f6f8",
  textMuted: "rgba(242, 246, 248, 0.68)",
  eyebrow: "rgba(242, 246, 248, 0.5)",
  lead: "rgba(242, 246, 248, 0.8)",
  card: "#191e1b",
  border: "rgba(255, 255, 255, 0.1)",
  shadow: "#000000",
  accent: "#a4ebc1",
  gold: "#ffc46b",
  accentDark: "#25c48c",
  accentSoft: "rgba(90, 240, 180, 0.14)",
  accentGradient: ["#a4ebc1", "#22b98a"],
  error: "#ff7a85",
};

// "Денна": the same structure with an opaque card level, and an accent dark
// enough to carry white button text.
export const lightPalette: Palette = {
  isDark: false,
  background: "#f6f5f0",
  surface: "#ffffff",
  elevated: "#eeeee7",
  overlay: "rgba(255, 255, 255, 0.88)",
  text: "#101412",
  textMuted: "rgba(11, 15, 20, 0.64)",
  eyebrow: "rgba(11, 15, 20, 0.5)",
  lead: "rgba(11, 15, 20, 0.78)",
  card: "#ffffff",
  border: "rgba(11, 15, 20, 0.1)",
  shadow: "rgba(11, 15, 20, 0.16)",
  accent: "#087b58",
  gold: "#b27a16",
  accentDark: "#00875a",
  accentSoft: "rgba(0, 160, 107, 0.12)",
  accentGradient: ["#00c07f", "#00875a"],
  error: "#e5484d",
};

export type ThemeMode = "system" | "light" | "dark";

export const palettes: Record<"light" | "dark", Palette> = {
  light: lightPalette,
  dark: darkPalette,
};
