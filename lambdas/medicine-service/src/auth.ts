import type { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Resolves the caller's Cognito `sub`.
 *
 * Per CLAUDE.md the JWT is validated by API Gateway's Cognito Authorizer, so
 * this only *reads* the claim it injected — it never verifies a token.
 *
 * Local dev has no authorizer, so `ALLOW_DEV_USER=true` falls back to
 * `DEV_USER_ID`. That fallback is opt-in via env precisely so a deployed stage
 * can never silently accept unauthenticated requests: without the flag, a
 * missing claim is a 401.
 */
export function resolveUserId(event: APIGatewayProxyEvent): string | undefined {
  const claims = event.requestContext?.authorizer?.claims as
    | Record<string, string>
    | undefined;

  const sub = claims?.sub;
  if (typeof sub === "string" && sub !== "") return sub;

  if (process.env.ALLOW_DEV_USER === "true") {
    return process.env.DEV_USER_ID || "dev-user";
  }

  return undefined;
}
