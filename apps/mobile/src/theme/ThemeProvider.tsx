import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { DARK, LIGHT, type ThemeColors } from "./colors";

type Scheme = "light" | "dark";

type ThemeContextValue = {
  colors: ThemeColors;
  scheme: Scheme;
  isDark: boolean;
  /** Flip to the opposite scheme, pinning it against the OS preference. */
  toggle: () => void;
  /** Drop the manual pin and follow the OS again. */
  useSystemScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // null = follow the OS; otherwise the user has pinned a scheme this session.
  const [override, setOverride] = useState<Scheme | null>(null);

  // app.json sets userInterfaceStyle "automatic", so useColorScheme reflects the
  // OS. It reports null before the native module resolves — default to dark,
  // which is the palette's primary mode.
  const scheme: Scheme = override ?? (systemScheme === "light" ? "light" : "dark");

  const toggle = useCallback(() => {
    setOverride(scheme === "dark" ? "light" : "dark");
  }, [scheme]);

  const useSystemScheme = useCallback(() => setOverride(null), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: scheme === "dark" ? DARK : LIGHT,
      scheme,
      isDark: scheme === "dark",
      toggle,
      useSystemScheme,
    }),
    [scheme, toggle, useSystemScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
