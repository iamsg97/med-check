import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { resolveUserId } from "../auth";
import { buildMedicine, toView } from "../domain/medicine";
import { normalizeName } from "../domain/normalize";
import { validateCreate } from "../domain/validation";
import {
  badRequest,
  conflict,
  json,
  parseBody,
  unauthorized,
  validationFailed,
  withErrorHandling,
} from "../http";
import { getMedicineRepository } from "../repository";
import { requestEnrichment } from "../services/enrichment";

/** POST /medicines */
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = resolveUserId(event);
    if (!userId) return unauthorized();

    const parsed = parseBody(event.body, event.isBase64Encoded);
    if (!parsed.ok) return badRequest("Request body is not valid JSON.");

    const { value, errors } = validateCreate(parsed.value);
    if (!value) return validationFailed(errors);

    const repo = getMedicineRepository();

    // One cabinet entry per medicine per user — updating quantity is a PUT.
    const duplicate = await repo.findByNormalizedName(
      userId,
      normalizeName(value.name),
    );
    if (duplicate) {
      return conflict(`"${duplicate.name}" is already in your cabinet.`);
    }

    const created = await repo.create(buildMedicine(userId, value));

    // Fire-and-forget: enrichment must never block or fail the save.
    await requestEnrichment(created);

    return json(201, toView(created));
  },
);
