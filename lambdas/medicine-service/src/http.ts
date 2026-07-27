import type { APIGatewayProxyResult } from "aws-lambda";

import type { ApiErrorCode } from "@med-check/types";

const CORS_HEADERS: Record<string, string> = {
  // The dev server is hit directly from the Expo app; API Gateway supplies its
  // own CORS config in deployed environments.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

export function noContent(): APIGatewayProxyResult {
  return { statusCode: 204, headers: { ...CORS_HEADERS }, body: "" };
}

export function error(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, string>,
): APIGatewayProxyResult {
  return json(statusCode, { error: { code, message, details } });
}

export const badRequest = (message: string) =>
  error(400, "BAD_REQUEST", message);

export const validationFailed = (details: Record<string, string>) =>
  error(422, "VALIDATION_FAILED", "Some fields need fixing.", details);

export const unauthorized = (message = "Missing or invalid credentials.") =>
  error(401, "UNAUTHORIZED", message);

export const notFound = (message = "Medicine not found.") =>
  error(404, "NOT_FOUND", message);

export const conflict = (message: string) => error(409, "CONFLICT", message);

export const internal = () =>
  error(500, "INTERNAL", "Something went wrong. Please try again.");

/** Parses a JSON body, tolerating base64 encoding from API Gateway. */
export function parseBody(
  body: string | null | undefined,
  isBase64Encoded?: boolean,
): { ok: true; value: unknown } | { ok: false } {
  if (!body) return { ok: true, value: {} };
  try {
    const raw = isBase64Encoded
      ? Buffer.from(body, "base64").toString("utf8")
      : body;
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

/**
 * Wraps a handler so an unexpected throw becomes a 500 instead of a raw Lambda
 * error, and logs the cause for CloudWatch.
 */
export function withErrorHandling<E>(
  handler: (event: E) => Promise<APIGatewayProxyResult>,
): (event: E) => Promise<APIGatewayProxyResult> {
  return async (event: E) => {
    try {
      return await handler(event);
    } catch (err) {
      console.error("Unhandled error in medicine-service", err);
      return internal();
    }
  };
}
