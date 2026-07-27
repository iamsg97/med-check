import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import type { Medicine } from "@med-check/types";

import { resolveUserId } from "../auth";
import { toView } from "../domain/medicine";
import { normalizeName } from "../domain/normalize";
import { validateUpdate } from "../domain/validation";
import {
  badRequest,
  conflict,
  json,
  notFound,
  parseBody,
  unauthorized,
  validationFailed,
  withErrorHandling,
} from "../http";
import { getMedicineRepository } from "../repository";

/** PUT /medicines/:id */
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = resolveUserId(event);
    if (!userId) return unauthorized();

    const medicineId = event.pathParameters?.id;
    if (!medicineId) return badRequest("Medicine id is required.");

    const parsed = parseBody(event.body, event.isBase64Encoded);
    if (!parsed.ok) return badRequest("Request body is not valid JSON.");

    const { value, errors } = validateUpdate(parsed.value);
    if (!value) return validationFailed(errors);

    const repo = getMedicineRepository();

    const patch: Partial<Medicine> = { ...value, updatedAt: new Date().toISOString() };

    if (value.name !== undefined) {
      const normalized = normalizeName(value.name);
      const clash = await repo.findByNormalizedName(userId, normalized);
      if (clash && clash.medicineId !== medicineId) {
        return conflict(`"${clash.name}" is already in your cabinet.`);
      }
      patch.normalizedName = normalized;
      // The cached AI data described the old name, so drop it and let
      // enrichment refill against the new one.
      patch.aiData = undefined;
      patch.aiLastUpdated = undefined;
    }

    const updated = await repo.update(userId, medicineId, patch);
    if (!updated) return notFound();

    return json(200, toView(updated));
  },
);
