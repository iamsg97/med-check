import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  CreateMedicineInput,
  MedicineView,
  UpdateMedicineInput,
} from "@med-check/types";

import { ApiError } from "@/api/client";
import {
  createMedicine,
  deleteMedicine,
  listMedicines,
  updateMedicine,
} from "@/api/medicines";

type LoadState = "idle" | "loading" | "ready" | "error";

interface MedicinesContextValue {
  medicines: MedicineView[];
  state: LoadState;
  /** Set when the last load failed. */
  error?: string;
  refresh: () => Promise<void>;
  /** Adds a medicine and prepends it to the cabinet. Throws ApiError on failure. */
  add: (input: CreateMedicineInput) => Promise<MedicineView>;
  /** Saves changes and replaces the item in place. Throws ApiError on failure. */
  update: (id: string, input: UpdateMedicineInput) => Promise<MedicineView>;
  remove: (id: string) => Promise<void>;
  /** Reads a medicine from the loaded cabinet without a network call. */
  findById: (id: string) => MedicineView | undefined;
}

const MedicinesContext = createContext<MedicinesContextValue | null>(null);

export function MedicinesProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<MedicineView[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | undefined>();

  // Abort an in-flight load when a newer one starts or on unmount, so a slow
  // response can't overwrite fresher state.
  const inFlight = useRef<AbortController | undefined>(undefined);

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setState((prev) => (prev === "ready" ? prev : "loading"));
    setError(undefined);

    try {
      const { items } = await listMedicines(controller.signal);
      if (controller.signal.aborted) return;
      setMedicines(items);
      setState("ready");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof ApiError ? err.message : "Couldn't load your cabinet.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => inFlight.current?.abort();
  }, [refresh]);

  const add = useCallback(async (input: CreateMedicineInput) => {
    const created = await createMedicine(input);
    // Prepend: the list is newest-first (ULID descending), matching the server.
    setMedicines((prev) => [created, ...prev]);
    setState("ready");
    return created;
  }, []);

  const update = useCallback(async (id: string, input: UpdateMedicineInput) => {
    const updated = await updateMedicine(id, input);
    setMedicines((prev) =>
      prev.map((m) => (m.medicineId === id ? updated : m)),
    );
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    const previous = medicinesRef.current;
    // Optimistic removal, rolled back if the request fails.
    setMedicines((prev) => prev.filter((m) => m.medicineId !== id));
    try {
      await deleteMedicine(id);
    } catch (err) {
      setMedicines(previous);
      throw err;
    }
  }, []);

  const findById = useCallback(
    (id: string) => medicinesRef.current.find((m) => m.medicineId === id),
    [],
  );

  // Kept in a ref so `remove` and `findById` can read current state without
  // taking a dependency on `medicines` and churning their identity.
  const medicinesRef = useRef<MedicineView[]>(medicines);
  medicinesRef.current = medicines;

  const value = useMemo<MedicinesContextValue>(
    () => ({ medicines, state, error, refresh, add, update, remove, findById }),
    [medicines, state, error, refresh, add, update, remove, findById],
  );

  return (
    <MedicinesContext.Provider value={value}>{children}</MedicinesContext.Provider>
  );
}

export function useMedicines(): MedicinesContextValue {
  const ctx = useContext(MedicinesContext);
  if (!ctx) {
    throw new Error("useMedicines must be used inside <MedicinesProvider>");
  }
  return ctx;
}
