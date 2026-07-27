/**
 * Lambda entry points. Each export is wired to one API Gateway route:
 *
 *   POST   /medicines       → createMedicine
 *   GET    /medicines       → listMedicines
 *   GET    /medicines/:id   → getMedicine
 *   PUT    /medicines/:id   → updateMedicine
 *   DELETE /medicines/:id   → removeMedicine
 */
export { handler as createMedicine } from "./handlers/create";
export { handler as getMedicine } from "./handlers/get";
export { handler as listMedicines } from "./handlers/list";
export { handler as removeMedicine } from "./handlers/remove";
export { handler as updateMedicine } from "./handlers/update";

export type { MedicineRepository } from "./repository";
export { getMedicineRepository, setMedicineRepository } from "./repository";
