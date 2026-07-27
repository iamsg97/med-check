// Shared TypeScript types for MedCheck.
//
// Type-only by design: the mobile app imports these with `import type`, so
// nothing here is emitted into the RN bundle. Keep runtime helpers out.

/** Dosage guidance produced by AI enrichment. */
export interface Dosage {
  standard: string;
  frequency: string;
  timing: string;
}

/** Bedrock enrichment payload, cached per `normalizedName`. */
export interface AiData {
  usage: string;
  sideEffects: string[];
  dosage: Dosage;
  relatedMedicines: string[];
  warnings: string[];
}

/**
 * A medicine in a user's cabinet.
 * DynamoDB: PK `userId`, SK `medicineId` (ULID).
 */
export interface Medicine {
  medicineId: string;
  userId: string;
  name: string;
  /** `name.toLowerCase().trim()` — dedup + AICache key. */
  normalizedName: string;
  notes?: string;
  quantity?: number;
  /** ISO 8601 date, `YYYY-MM-DD`. */
  expiryDate?: string;
  photoS3Key?: string;
  aiData?: AiData;
  /** ISO 8601 timestamp of the last successful enrichment. */
  aiLastUpdated?: string;
  createdAt: string;
  updatedAt: string;
}

/** Tracks the async Bedrock enrichment triggered after a medicine is saved. */
export type EnrichmentStatus = "pending" | "ready" | "failed";

/** A medicine as returned to clients, with derived presentation state. */
export interface MedicineView extends Medicine {
  enrichmentStatus: EnrichmentStatus;
}

/** POST /medicines */
export interface CreateMedicineInput {
  name: string;
  notes?: string;
  quantity?: number;
  expiryDate?: string;
}

/**
 * PUT /medicines/:id — every field optional.
 *
 * Omitting a key leaves that field untouched; sending `null` clears it. That
 * distinction matters because `JSON.stringify` drops `undefined`, so an
 * "omit it" and a "clear it" would otherwise be indistinguishable on the wire.
 */
export interface UpdateMedicineInput {
  name?: string;
  notes?: string | null;
  quantity?: number | null;
  expiryDate?: string | null;
}

/** GET /medicines */
export interface ListMedicinesResponse {
  items: MedicineView[];
  /** Opaque pagination cursor; absent on the final page. */
  nextCursor?: string;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

/** Uniform error body for every non-2xx API response. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level messages, keyed by input field name. */
    details?: Record<string, string>;
  };
}
