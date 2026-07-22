import { darkPalette } from "./palette";

/**
 * Backward-compatible static export. Screens that have not yet migrated to the
 * theme context keep importing `colors` and render with the dark palette.
 * New/migrated screens should use `useTheme()` / `useColors()` instead.
 */
export const colors = darkPalette;

export type { Palette } from "./palette";
