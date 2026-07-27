import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type {
  CreateMedicineInput,
  MedicineView,
  UpdateMedicineInput,
} from "@med-check/types";

import { ApiError } from "@/api/client";
import { radius, useTheme } from "@/theme";

export interface MedicineFormValues {
  name: string;
  quantity: string;
  expiryDate: string;
  notes: string;
}

export function initialValues(medicine?: MedicineView): MedicineFormValues {
  return {
    name: medicine?.name ?? "",
    quantity: medicine?.quantity !== undefined ? String(medicine.quantity) : "",
    expiryDate: medicine?.expiryDate ?? "",
    notes: medicine?.notes ?? "",
  };
}

/** Form text → create payload. Blank optional fields are omitted, not sent as "". */
export function toCreateInput(values: MedicineFormValues): CreateMedicineInput {
  const quantity = values.quantity.trim();
  const expiryDate = values.expiryDate.trim();
  const notes = values.notes.trim();
  return {
    name: values.name.trim(),
    quantity: quantity === "" ? undefined : Number(quantity),
    expiryDate: expiryDate === "" ? undefined : expiryDate,
    notes: notes === "" ? undefined : notes,
  };
}

/**
 * Form text → update payload.
 *
 * Blanked fields become `null` rather than `undefined`: `JSON.stringify` strips
 * `undefined`, so omitting them would leave the old value in place and clearing
 * a field would silently do nothing.
 */
export function toUpdateInput(values: MedicineFormValues): UpdateMedicineInput {
  const quantity = values.quantity.trim();
  const expiryDate = values.expiryDate.trim();
  const notes = values.notes.trim();
  return {
    name: values.name.trim(),
    quantity: quantity === "" ? null : Number(quantity),
    expiryDate: expiryDate === "" ? null : expiryDate,
    notes: notes === "" ? null : notes,
  };
}

/**
 * Shared add/edit form.
 *
 * `onSubmit` throws on failure; this component catches ApiError and renders the
 * server's field-level `details` inline, so validation rules stay owned by the
 * Lambda rather than being duplicated here.
 */
export function MedicineForm({
  medicine,
  submitLabel,
  onSubmit,
}: {
  medicine?: MedicineView;
  submitLabel: string;
  /** Receives raw field values; convert with toCreateInput / toUpdateInput. */
  onSubmit: (values: MedicineFormValues) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [values, setValues] = useState<MedicineFormValues>(() =>
    initialValues(medicine),
  );
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();

  const canSubmit = values.name.trim() !== "" && !submitting;

  function set<K extends keyof MedicineFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(undefined);

    try {
      await onSubmit(values);
      // Caller navigates away on success; leave `submitting` true so the button
      // can't be double-tapped during the transition.
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) setFieldErrors(err.details);
        if (!err.details || Object.keys(err.details).length === 0) {
          setFormError(err.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <Field
        label="Name"
        required
        value={values.name}
        onChangeText={(t) => set("name", t)}
        placeholder="e.g. Pan-40"
        error={fieldErrors.name}
        autoFocus={medicine === undefined}
      />
      <Field
        label="Quantity"
        value={values.quantity}
        onChangeText={(t) => set("quantity", t)}
        placeholder="e.g. 10"
        keyboardType="number-pad"
        error={fieldErrors.quantity}
      />
      <Field
        label="Expiry date"
        value={values.expiryDate}
        onChangeText={(t) => set("expiryDate", t)}
        placeholder="YYYY-MM-DD"
        error={fieldErrors.expiryDate}
      />
      <Field
        label="Notes"
        value={values.notes}
        onChangeText={(t) => set("notes", t)}
        placeholder="e.g. take before meals"
        multiline
        error={fieldErrors.notes}
      />

      {formError && (
        <View
          style={[
            styles.formError,
            { backgroundColor: colors.accentDim, borderLeftColor: colors.accent },
          ]}
        >
          <Text style={[styles.formErrorText, { color: colors.text }]}>
            {formError}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={submit}
        disabled={!canSubmit}
        activeOpacity={0.85}
        accessibilityRole="button"
        style={[
          styles.submit,
          { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.5 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={[styles.submitText, { color: colors.bg }]}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

function Field({
  label,
  required,
  error,
  multiline,
  ...input
}: {
  label: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {label}
        {required && <Text style={{ color: colors.accent }}> *</Text>}
      </Text>
      <TextInput
        {...input}
        multiline={multiline}
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: error ? colors.accent : colors.border,
            color: colors.text,
          },
        ]}
      />
      {error && (
        <Text style={[styles.fieldError, { color: colors.accent }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  fieldError: { fontSize: 11, marginTop: 5 },

  formError: {
    borderRadius: radius.md,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 16,
  },
  formErrorText: { fontSize: 12, lineHeight: 18 },

  submit: {
    borderRadius: radius.xl,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { fontSize: 15, fontWeight: "700" },
});
