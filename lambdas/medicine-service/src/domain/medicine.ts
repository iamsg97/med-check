import { ulid } from "ulid";

import type {
  CreateMedicineInput,
  Medicine,
  MedicineView,
} from "@med-check/types";

import { normalizeName } from "./normalize";

/**
 * Builds the record written to DynamoDB.
 * `medicineId` is a ULID (not a UUID) so the sort key orders chronologically.
 */
export function buildMedicine(
  userId: string,
  input: CreateMedicineInput,
  now = new Date(),
): Medicine {
  const timestamp = now.toISOString();
  return {
    medicineId: ulid(now.getTime()),
    userId,
    name: input.name,
    normalizedName: normalizeName(input.name),
    notes: input.notes,
    quantity: input.quantity,
    expiryDate: input.expiryDate,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Adds the derived enrichment state clients render against.
 *
 * AI enrichment runs asynchronously after save, so a freshly created medicine
 * has no `aiData` yet — the app shows a pending state instead of empty fields.
 */
export function toView(medicine: Medicine): MedicineView {
  return {
    ...medicine,
    enrichmentStatus: medicine.aiData ? "ready" : "pending",
  };
}
