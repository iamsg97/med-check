import type { CreateMedicineInput } from "@med-check/types";

/**
 * A validated update, normalized for persistence.
 *
 * The wire format allows `null` to mean "clear this field"; validation folds
 * that to `undefined`. The distinction is preserved by key *presence* — a key
 * present with `undefined` clears, an absent key leaves the field alone.
 */
export interface NormalizedUpdate {
  name?: string;
  notes?: string;
  quantity?: number;
  expiryDate?: string;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_NOTES_LENGTH = 500;
export const MAX_QUANTITY = 100_000;

/** Field name → human-readable problem. Empty means valid. */
export type FieldErrors = Record<string, string>;

export interface ValidationResult<T> {
  value?: T;
  errors: FieldErrors;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function checkName(name: unknown, errors: FieldErrors): string | undefined {
  if (typeof name !== "string" || name.trim() === "") {
    errors.name = "Name is required.";
    return undefined;
  }
  const trimmed = name.trim();
  if (trimmed.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
    return undefined;
  }
  return trimmed;
}

function checkNotes(notes: unknown, errors: FieldErrors): string | undefined {
  if (notes === undefined || notes === null || notes === "") return undefined;
  if (typeof notes !== "string") {
    errors.notes = "Notes must be text.";
    return undefined;
  }
  const trimmed = notes.trim();
  if (trimmed.length > MAX_NOTES_LENGTH) {
    errors.notes = `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`;
    return undefined;
  }
  return trimmed === "" ? undefined : trimmed;
}

function checkQuantity(quantity: unknown, errors: FieldErrors): number | undefined {
  if (quantity === undefined || quantity === null || quantity === "") return undefined;
  const n = typeof quantity === "string" ? Number(quantity) : quantity;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    errors.quantity = "Quantity must be a number.";
    return undefined;
  }
  if (!Number.isInteger(n) || n < 0) {
    errors.quantity = "Quantity must be a whole number of 0 or more.";
    return undefined;
  }
  if (n > MAX_QUANTITY) {
    errors.quantity = `Quantity must be ${MAX_QUANTITY} or fewer.`;
    return undefined;
  }
  return n;
}

function checkExpiry(expiryDate: unknown, errors: FieldErrors): string | undefined {
  if (expiryDate === undefined || expiryDate === null || expiryDate === "") {
    return undefined;
  }
  if (typeof expiryDate !== "string" || !ISO_DATE.test(expiryDate)) {
    errors.expiryDate = "Expiry must be a date in YYYY-MM-DD format.";
    return undefined;
  }
  // Reject calendar-invalid dates that still match the pattern (e.g. 2025-02-31).
  const parsed = new Date(`${expiryDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(expiryDate)) {
    errors.expiryDate = "That date does not exist.";
    return undefined;
  }
  return expiryDate;
}

export function validateCreate(body: unknown): ValidationResult<CreateMedicineInput> {
  const errors: FieldErrors = {};
  if (typeof body !== "object" || body === null) {
    return { errors: { body: "Request body must be a JSON object." } };
  }
  const raw = body as Record<string, unknown>;

  const name = checkName(raw.name, errors);
  const notes = checkNotes(raw.notes, errors);
  const quantity = checkQuantity(raw.quantity, errors);
  const expiryDate = checkExpiry(raw.expiryDate, errors);

  if (Object.keys(errors).length > 0 || name === undefined) return { errors };
  return { value: { name, notes, quantity, expiryDate }, errors };
}

export function validateUpdate(body: unknown): ValidationResult<NormalizedUpdate> {
  const errors: FieldErrors = {};
  if (typeof body !== "object" || body === null) {
    return { errors: { body: "Request body must be a JSON object." } };
  }
  const raw = body as Record<string, unknown>;
  const value: NormalizedUpdate = {};

  // Only validate keys the caller actually sent, so a partial update can clear
  // an optional field by sending null without tripping the required-name check.
  if ("name" in raw) {
    const name = checkName(raw.name, errors);
    if (name !== undefined) value.name = name;
  }
  if ("notes" in raw) value.notes = checkNotes(raw.notes, errors);
  if ("quantity" in raw) value.quantity = checkQuantity(raw.quantity, errors);
  if ("expiryDate" in raw) value.expiryDate = checkExpiry(raw.expiryDate, errors);

  if (Object.keys(errors).length > 0) return { errors };
  if (Object.keys(value).length === 0) {
    return { errors: { body: "Provide at least one field to update." } };
  }
  return { value, errors };
}
