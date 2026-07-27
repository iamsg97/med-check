import type { Medicine } from "@med-check/types";

import type { ListOptions, ListResult, MedicineRepository } from "./types";

/**
 * In-memory MedicineRepository for local development.
 *
 * State lives in module scope so it survives across handler invocations within
 * one `local-server` process. It is deliberately NOT durable — restarting the
 * dev server empties the cabinet. Swap in the DynamoDB implementation for any
 * environment that needs persistence.
 */
export class InMemoryMedicineRepository implements MedicineRepository {
  /** userId → (medicineId → Medicine) */
  private readonly byUser = new Map<string, Map<string, Medicine>>();

  private userTable(userId: string): Map<string, Medicine> {
    let table = this.byUser.get(userId);
    if (!table) {
      table = new Map<string, Medicine>();
      this.byUser.set(userId, table);
    }
    return table;
  }

  async list(userId: string, options: ListOptions): Promise<ListResult> {
    // ULIDs sort chronologically, so a descending sort by id is newest-first —
    // the same ordering DynamoDB gives with ScanIndexForward: false.
    const all = [...this.userTable(userId).values()].sort((a, b) =>
      b.medicineId.localeCompare(a.medicineId),
    );

    const start = options.cursor
      ? all.findIndex((m) => m.medicineId === options.cursor) + 1
      : 0;
    // An unknown cursor yields findIndex -1 ⇒ start 0; restart from the top
    // rather than failing the request.
    const page = all.slice(start, start + options.limit);
    const nextIndex = start + options.limit;

    return {
      items: page.map(clone),
      nextCursor:
        nextIndex < all.length ? page[page.length - 1]?.medicineId : undefined,
    };
  }

  async get(userId: string, medicineId: string): Promise<Medicine | undefined> {
    const found = this.userTable(userId).get(medicineId);
    return found ? clone(found) : undefined;
  }

  async create(medicine: Medicine): Promise<Medicine> {
    this.userTable(medicine.userId).set(medicine.medicineId, clone(medicine));
    return clone(medicine);
  }

  async update(
    userId: string,
    medicineId: string,
    patch: Partial<Medicine>,
  ): Promise<Medicine | undefined> {
    const table = this.userTable(userId);
    const existing = table.get(medicineId);
    if (!existing) return undefined;

    const updated: Medicine = { ...existing, ...patch };
    // Identity fields are never patchable.
    updated.medicineId = existing.medicineId;
    updated.userId = existing.userId;
    updated.createdAt = existing.createdAt;

    table.set(medicineId, updated);
    return clone(updated);
  }

  async remove(userId: string, medicineId: string): Promise<boolean> {
    return this.userTable(userId).delete(medicineId);
  }

  async findByNormalizedName(
    userId: string,
    normalizedName: string,
  ): Promise<Medicine | undefined> {
    for (const medicine of this.userTable(userId).values()) {
      if (medicine.normalizedName === normalizedName) return clone(medicine);
    }
    return undefined;
  }

  /** Test/dev helper — not part of the repository contract. */
  reset(): void {
    this.byUser.clear();
  }
}

/**
 * Hand back copies so callers can't mutate stored records by reference —
 * DynamoDB would return fresh objects, and we want the same semantics.
 */
function clone(medicine: Medicine): Medicine {
  return structuredClone(medicine);
}
