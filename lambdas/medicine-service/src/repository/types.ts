import type { Medicine } from "@med-check/types";

export interface ListOptions {
  limit: number;
  /** Opaque cursor from a previous page. */
  cursor?: string;
}

export interface ListResult {
  items: Medicine[];
  nextCursor?: string;
}

/**
 * Storage seam for the Medicines table.
 *
 * Methods mirror DynamoDB access patterns exactly (PK `userId`, SK
 * `medicineId`) so the DynamoDB implementation is a drop-in for the in-memory
 * one — no handler changes.
 */
export interface MedicineRepository {
  /** Query by PK `userId`, sorted by SK descending (ULID ⇒ newest first). */
  list(userId: string, options: ListOptions): Promise<ListResult>;

  /** GetItem by (`userId`, `medicineId`). */
  get(userId: string, medicineId: string): Promise<Medicine | undefined>;

  /** PutItem. Caller supplies the fully-built record. */
  create(medicine: Medicine): Promise<Medicine>;

  /**
   * UpdateItem on the given fields. Resolves `undefined` when the item is
   * absent, so callers can map that to a 404.
   */
  update(
    userId: string,
    medicineId: string,
    patch: Partial<Medicine>,
  ): Promise<Medicine | undefined>;

  /** DeleteItem. Resolves false when the item was already absent. */
  remove(userId: string, medicineId: string): Promise<boolean>;

  /**
   * Lookup via the `normalizedName-index` GSI, scoped to one user — used to
   * reject duplicate cabinet entries.
   */
  findByNormalizedName(
    userId: string,
    normalizedName: string,
  ): Promise<Medicine | undefined>;
}
