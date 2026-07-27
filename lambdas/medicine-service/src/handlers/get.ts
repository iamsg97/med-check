import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { resolveUserId } from "../auth";
import { toView } from "../domain/medicine";
import {
  badRequest,
  json,
  notFound,
  unauthorized,
  withErrorHandling,
} from "../http";
import { getMedicineRepository } from "../repository";

/** GET /medicines/:id */
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = resolveUserId(event);
    if (!userId) return unauthorized();

    const medicineId = event.pathParameters?.id;
    if (!medicineId) return badRequest("Medicine id is required.");

    const medicine = await getMedicineRepository().get(userId, medicineId);
    // Scoped by userId, so another user's id reads as absent rather than
    // leaking that it exists.
    if (!medicine) return notFound();

    return json(200, toView(medicine));
  },
);
