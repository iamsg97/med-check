import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import type { ListMedicinesResponse } from "@med-check/types";

import { resolveUserId } from "../auth";
import { toView } from "../domain/medicine";
import { badRequest, json, unauthorized, withErrorHandling } from "../http";
import { getMedicineRepository } from "../repository";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/** GET /medicines?limit=&cursor= */
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = resolveUserId(event);
    if (!userId) return unauthorized();

    const rawLimit = event.queryStringParameters?.limit;
    let limit = DEFAULT_LIMIT;
    if (rawLimit !== undefined) {
      const parsed = Number(rawLimit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
        return badRequest(`limit must be a whole number between 1 and ${MAX_LIMIT}.`);
      }
      limit = parsed;
    }

    const { items, nextCursor } = await getMedicineRepository().list(userId, {
      limit,
      cursor: event.queryStringParameters?.cursor ?? undefined,
    });

    const body: ListMedicinesResponse = { items: items.map(toView), nextCursor };
    return json(200, body);
  },
);
