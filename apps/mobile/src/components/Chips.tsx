import { StyleSheet, Text, View } from "react-native";

import { radius, useTheme } from "@/theme";

/** Small solid-background label — e.g. "Analgesic", "⚠ Side FX". */
export function Tag({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.tag, { backgroundColor: background }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

/** Rounded muted chip used for symptom keywords on a medicine card. */
export function Pill({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.pillText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  tag: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  tagText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontSize: 10, fontWeight: "500" },
  divider: { height: 1, marginVertical: 14 },
});
