// Sage Serenity palette.
// Source of truth: apps/docs/ref/colour/medcheck-sage-dark.jsx — keep both in
// sync if a token is added or a hex changes.

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceHigh: string;
  primary: string;
  primaryDim: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentDim: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  warningDim: string;
};

export const DARK: ThemeColors = {
  bg: "#1A1E1C", // deepest background
  surface: "#252A27", // card / sheet surface
  surfaceAlt: "#2E3531", // nested surface / input bg
  surfaceHigh: "#363D39", // hover / elevated
  primary: "#7BAF9A", // sage green
  primaryDim: "#4A6A5A", // muted primary for tags
  text: "#E8EAE6", // primary text
  textMuted: "#9AA59F", // secondary text
  textFaint: "#5A6560", // placeholder / disabled
  accent: "#E05C4C", // red — alerts, CTAs, side effects
  accentDim: "#4A2522", // red dim bg
  border: "#3A4240", // subtle dividers
  borderStrong: "#4A5450", // stronger dividers
  success: "#7BAF9A", // same as primary
  warning: "#D4A017", // amber warning
  warningDim: "#3A2A08",
};

export const LIGHT: ThemeColors = {
  bg: "#F5F4F0",
  surface: "#ECEAE3",
  surfaceAlt: "#E2DFD5",
  surfaceHigh: "#D8D5C8",
  primary: "#5C7A6B",
  primaryDim: "#C8DDD6",
  text: "#2C2F2D",
  textMuted: "#6B7570",
  textFaint: "#A0A8A4",
  accent: "#C0392B",
  accentDim: "#F5E0DC",
  border: "#D4D0C7",
  borderStrong: "#BDB9B0",
  success: "#5C7A6B",
  warning: "#B8860B",
  warningDim: "#F5EDD0",
};

// Shared scales pulled off the reference mock so screens don't re-invent them.
export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  card: 16,
  pill: 20,
  sheet: 20,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
} as const;
