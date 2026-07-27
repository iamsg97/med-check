import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MedicineForm, toCreateInput } from "@/components/MedicineForm";
import { useMedicines } from "@/medicines/MedicinesProvider";
import { radius, useTheme } from "@/theme";

export default function AddMedicine() {
  const { colors } = useTheme();
  const { add } = useMedicines();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Add Medicine</Text>
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
            submitLabel="Add to cabinet"
            onSubmit={async (values) => {
              await add(toCreateInput(values));
              router.back();
            }}
          />

          <Text style={[styles.hint, { color: colors.textFaint }]}>
            AI usage, dosage and side-effect info is fetched in the background
            once the medicine is saved.
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
  },
  title: { fontSize: 22, fontWeight: "700" },
  close: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 14 },
  form: { paddingHorizontal: 20, paddingBottom: 40 },
  hint: { fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
