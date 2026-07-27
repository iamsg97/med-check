import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MedicineView } from "@med-check/types";

import { Pill, Tag } from "@/components/Chips";
import { useMedicines } from "@/medicines/MedicinesProvider";
import { radius, useTheme } from "@/theme";

const LOW_STOCK_THRESHOLD = 10;

export default function Home() {
  const { colors, isDark, toggle } = useTheme();
  const { medicines, state, error, refresh } = useMedicines();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q) ||
        m.aiData?.usage.toLowerCase().includes(q),
    );
  }, [medicines, search]);

  const lowStock = medicines.filter(
    (m) => m.quantity !== undefined && m.quantity <= LOW_STOCK_THRESHOLD,
  ).length;
  const expiringSoon = medicines.filter((m) => isExpiringSoon(m.expiryDate)).length;

  const stats = [
    { label: "Total", value: medicines.length, color: colors.primary },
    { label: "Low stock", value: lowStock, color: colors.accent },
    { label: "Expiring", value: expiringSoon, color: colors.warning },
  ];

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.heading, { color: colors.text }]}>
              My Medicines
            </Text>
            <Text style={[styles.subheading, { color: colors.textMuted }]}>
              {state === "loading" && medicines.length === 0
                ? "Loading…"
                : `${filtered.length} items in cabinet`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggle}
              accessibilityRole="button"
              accessibilityLabel={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
              style={[
                styles.iconButton,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <Text style={styles.iconButtonText}>{isDark ? "☀️" : "🌙"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/add-medicine")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Add medicine"
              style={[styles.addButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.search,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.searchIcon, { color: colors.textFaint }]}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search medicines or symptoms…"
            placeholderTextColor={colors.textFaint}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
          />
        </View>

        <View style={styles.statRow}>
          {stats.map(({ label, value, color }) => (
            <View
              key={label}
              style={[
                styles.statCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Cabinet
          </Text>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>
            Sort ↕
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {state === "loading" && medicines.length === 0 && (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        )}

        {state === "error" && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.accentDim, borderLeftColor: colors.accent },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} accessibilityRole="button">
              <Text style={[styles.retry, { color: colors.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {filtered.map((med) => (
          <MedicineCard key={med.medicineId} medicine={med} />
        ))}

        {state === "ready" && medicines.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
              Your cabinet is empty
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textFaint }]}>
              Add your first medicine to get AI usage and dosage info.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/add-medicine")}
              activeOpacity={0.85}
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.emptyCtaText, { color: colors.bg }]}>
                Add Medicine
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {state === "ready" && medicines.length > 0 && filtered.length === 0 && (
          <Text style={[styles.noMatch, { color: colors.textFaint }]}>
            No medicines match “{search.trim()}”
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MedicineCard({ medicine }: { medicine: MedicineView }) {
  const { colors } = useTheme();
  const low =
    medicine.quantity !== undefined && medicine.quantity <= LOW_STOCK_THRESHOLD;
  const ai = medicine.aiData;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/medicine/${medicine.medicineId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${medicine.name}`}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardIdentity}>
          <View style={[styles.cardIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={styles.cardIconText}>💊</Text>
          </View>
          <View style={styles.cardIdentityText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {medicine.name}
            </Text>

            {ai ? (
              <View style={styles.pillRow}>
                {ai.relatedMedicines.slice(0, 3).map((t) => (
                  <Pill key={t} label={t} />
                ))}
              </View>
            ) : (
              <Text style={[styles.pendingText, { color: colors.textFaint }]}>
                {medicine.enrichmentStatus === "failed"
                  ? "AI info unavailable"
                  : "Fetching AI info…"}
              </Text>
            )}
          </View>
        </View>

        {ai && ai.sideEffects.length > 0 && (
          <Tag
            label="⚠ Side FX"
            color={colors.accent}
            background={colors.accentDim}
          />
        )}
      </View>

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.cardDose, { color: colors.textMuted }]}>
          {ai
            ? `${ai.dosage.standard} · ${ai.dosage.frequency}`
            : (medicine.notes ?? "No dosage info yet")}
        </Text>
        {medicine.quantity !== undefined && (
          <Text
            style={[styles.cardQty, { color: low ? colors.accent : colors.textFaint }]}
          >
            {medicine.quantity} left
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/** True when the medicine expires within 30 days (or has already expired). */
function isExpiringSoon(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(`${expiryDate}T00:00:00Z`).getTime();
  if (Number.isNaN(expiry)) return false;
  const days = (expiry - Date.now()) / 86_400_000;
  return days <= 30;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 10 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitleGroup: { flexShrink: 1 },
  heading: { fontSize: 24, fontWeight: "700", lineHeight: 29 },
  subheading: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  iconButtonText: { fontSize: 14 },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },

  search: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchIcon: { fontSize: 13 },
  searchInput: { flex: 1, fontSize: 12, paddingVertical: 10 },

  statRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 9, marginTop: 1 },

  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  sectionAction: { fontSize: 11, fontWeight: "600" },

  listContent: { paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 },
  loader: { marginTop: 40 },

  errorBox: {
    borderRadius: radius.md,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 12, lineHeight: 18 },
  retry: { fontSize: 12, fontWeight: "700", marginTop: 8 },

  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardIdentity: { flexDirection: "row", gap: 10, flex: 1 },
  cardIdentityText: { flex: 1 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: { fontSize: 16 },
  cardTitle: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  pendingText: { fontSize: 11, fontStyle: "italic" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
  },
  cardDose: { fontSize: 11, flex: 1 },
  cardQty: { fontSize: 10, fontWeight: "600", marginLeft: 8 },

  empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  emptyBody: { fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 18 },
  emptyCta: {
    borderRadius: radius.xl,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  emptyCtaText: { fontSize: 14, fontWeight: "700" },

  noMatch: { textAlign: "center", paddingTop: 40, fontSize: 13 },
});
