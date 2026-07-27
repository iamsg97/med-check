import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { resolveUserId } from "../auth";
import {
  badRequest,
  noContent,
  notFound,
  unauthorized,
  withErrorHandling,
} from "../http";
import { getMedicineRepository } from "../repository";

/** DELETE /medicines/:id */
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = resolveUserId(event);
    if (!userId) return unauthorized();

    const medicineId = event.pathParameters?.id;
    if (!medicineId) return badRequest("Medicine id is required.");

    const deleted = await getMedicineRepository().remove(userId, medicineId);
    if (!deleted) return notFound();

    return noContent();
  },
);
