import { InMemoryMedicineRepository } from "./memory";
import type { MedicineRepository } from "./types";

export type { ListOptions, ListResult, MedicineRepository } from "./types";
export { InMemoryMedicineRepository } from "./memory";

let instance: MedicineRepository | undefined;

/**
 * Resolves the repository backing the handlers.
 *
 * Cached in module scope so a warm Lambda container reuses one instance (and so
 * the in-memory store persists across requests in local dev).
 *
 * When the DynamoDB implementation lands, select it here on
 * `MEDICINE_REPOSITORY=dynamodb` (or simply on DYNAMODB_TABLE_MEDICINES being
 * set) and leave the handlers untouched.
 */
export function getMedicineRepository(): MedicineRepository {
  if (!instance) {
    instance = new InMemoryMedicineRepository();
  }
  return instance;
}

/** Test seam — override the cached instance. */
export function setMedicineRepository(repo: MedicineRepository | undefined): void {
  instance = repo;
}
