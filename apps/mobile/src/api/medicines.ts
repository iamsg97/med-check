import type {
  CreateMedicineInput,
  ListMedicinesResponse,
  MedicineView,
  UpdateMedicineInput,
} from "@med-check/types";

import { request } from "./client";

export function listMedicines(signal?: AbortSignal): Promise<ListMedicinesResponse> {
  return request<ListMedicinesResponse>("/medicines", { signal });
}

export function createMedicine(input: CreateMedicineInput): Promise<MedicineView> {
  return request<MedicineView>("/medicines", { method: "POST", body: input });
}

export function getMedicine(id: string): Promise<MedicineView> {
  return request<MedicineView>(`/medicines/${encodeURIComponent(id)}`);
}

export function updateMedicine(
  id: string,
  input: UpdateMedicineInput,
): Promise<MedicineView> {
  return request<MedicineView>(`/medicines/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteMedicine(id: string): Promise<void> {
  return request<void>(`/medicines/${encodeURIComponent(id)}`, { method: "DELETE" });
}
