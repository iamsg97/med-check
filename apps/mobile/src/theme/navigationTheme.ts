import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";

import type { ThemeColors } from "./colors";

/**
 * Maps the Sage Serenity palette onto React Navigation's theme.
 *
 * React Navigation paints its own container/card with `colors.background`
 * during screen transitions. Left unset it falls back to `DefaultTheme`, whose
 * background is `rgb(242, 242, 242)` — which shows as a light flash when a
 * modal is dismissed in dark mode.
 *
 * The base theme is spread rather than rebuilt so required keys we don't
 * override (notably `fonts`, mandatory in v7) stay intact.
 */
export function toNavigationTheme(
  colors: ThemeColors,
  isDark: boolean,
): NavigationTheme {
  const base = isDark ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
}
