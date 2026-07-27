import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { MedicineForm, toUpdateInput } from "@/components/MedicineForm";
import { useMedicines } from "@/medicines/MedicinesProvider";
import { radius, useTheme } from "@/theme";

export default function EditMedicine() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findById, update, remove } = useMedicines();
  const [deleting, setDeleting] = useState(false);

  const medicine = id ? findById(id) : undefined;

  // The cabinet is loaded before this screen can be reached, so a miss means
  // the medicine was deleted (or the route was opened directly).
  if (!medicine || !id) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.missing}>
          <Text style={[styles.missingText, { color: colors.textMuted }]}>
            This medicine is no longer in your cabinet.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.missingCta, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.missingCtaText, { color: colors.bg }]}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function confirmDelete() {
    Alert.alert(
      "Delete medicine?",
      `"${medicine!.name}" will be removed from your cabinet. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void performDelete(),
        },
      ],
    );
  }

  async function performDelete() {
    setDeleting(true);
    try {
      await remove(id!);
      router.back();
    } catch (err) {
      setDeleting(false);
      Alert.alert(
        "Couldn't delete",
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            Edit Medicine
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: colors.surfaceAlt }]}
          >
            <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <MedicineForm
            medicine={medicine}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await update(id, toUpdateInput(values));
              router.back();
            }}
          />

          <TouchableOpacity
            onPress={confirmDelete}
            disabled={deleting}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[
              styles.delete,
              {
                borderColor: colors.accent,
                backgroundColor: colors.accentDim,
                opacity: deleting ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.deleteText, { color: colors.accent }]}>
              {deleting ? "Deleting…" : "Delete medicine"}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.meta, { color: colors.textFaint }]}>
            Added {new Date(medicine.createdAt).toLocaleDateString()}
            {medicine.updatedAt !== medicine.createdAt &&
              ` · edited ${new Date(medicine.updatedAt).toLocaleDateString()}`}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: "700", flex: 1 },
  close: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 14 },

  form: { paddingHorizontal: 20, paddingBottom: 40 },

  delete: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  deleteText: { fontSize: 14, fontWeight: "700" },

  meta: { fontSize: 11, textAlign: "center", marginTop: 20 },

  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  missingText: { fontSize: 14, textAlign: "center" },
  missingCta: {
    borderRadius: radius.xl,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  missingCtaText: { fontSize: 14, fontWeight: "700" },
});
