/**
 * Local dev server — NOT deployed.
 *
 * API Gateway is what invokes these handlers in AWS. This script stands in for
 * it locally: it translates an incoming HTTP request into an
 * APIGatewayProxyEvent, dispatches to the same handler module the Lambda would
 * run, and writes the APIGatewayProxyResult back out. The handlers stay pure
 * Lambda code with no knowledge of this file.
 *
 *   pnpm --filter @med-check/lambda-medicine-service dev
 */
import { createServer, type IncomingMessage } from "node:http";

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// Dev-only defaults. Safe to set here because this module is never bundled into
// the deployed Lambda — that entry point is handlers/*, which sees only the real
// environment. Set explicitly beforehand to override.
process.env.ALLOW_DEV_USER ??= "true";
process.env.DEV_USER_ID ??= "dev-user";

import { handler as createMedicine } from "./handlers/create";
import { handler as getMedicine } from "./handlers/get";
import { handler as listMedicines } from "./handlers/list";
import { handler as removeMedicine } from "./handlers/remove";
import { handler as updateMedicine } from "./handlers/update";

type Handler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

interface Route {
  method: string;
  /** Path segments; `:id` captures into pathParameters. */
  segments: string[];
  handler: Handler;
}

const routes: Route[] = [
  { method: "GET", segments: ["medicines"], handler: listMedicines },
  { method: "POST", segments: ["medicines"], handler: createMedicine },
  { method: "GET", segments: ["medicines", ":id"], handler: getMedicine },
  { method: "PUT", segments: ["medicines", ":id"], handler: updateMedicine },
  { method: "DELETE", segments: ["medicines", ":id"], handler: removeMedicine },
];

function matchRoute(
  method: string,
  pathname: string,
): { route: Route; pathParameters: Record<string, string> } | undefined {
  // Tolerate the deployed "/v1" stage prefix so the app can use one base path.
  const parts = pathname.split("/").filter(Boolean);
  const segments = parts[0] === "v1" ? parts.slice(1) : parts;

  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.segments.length !== segments.length) continue;

    const pathParameters: Record<string, string> = {};
    const matched = route.segments.every((spec, i) => {
      if (spec.startsWith(":")) {
        pathParameters[spec.slice(1)] = decodeURIComponent(segments[i]);
        return true;
      }
      return spec === segments[i];
    });

    if (matched) return { route, pathParameters };
  }
  return undefined;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Minimal APIGatewayProxyEvent — only the fields these handlers read. */
function buildEvent(
  req: IncomingMessage,
  url: URL,
  pathParameters: Record<string, string>,
  body: string,
): APIGatewayProxyEvent {
  const queryStringParameters: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    queryStringParameters[k] = v;
  });

  const devUserId = req.headers["x-dev-user-id"];

  return {
    httpMethod: req.method ?? "GET",
    path: url.pathname,
    headers: req.headers as Record<string, string>,
    body: body === "" ? null : body,
    isBase64Encoded: false,
    pathParameters,
    queryStringParameters,
    // In AWS the Cognito authorizer injects these claims. Locally the NestJS
    // gateway forwards the resolved caller as `x-dev-user-id`; falling through
    // with no claim lets auth.ts use DEV_USER_ID for direct curl testing.
    requestContext: {
      authorizer: devUserId ? { claims: { sub: devUserId } } : undefined,
    } as APIGatewayProxyEvent["requestContext"],
  } as APIGatewayProxyEvent;
}

const port = Number(process.env.PORT ?? 4000);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    });
    res.end();
    return;
  }

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "medicine-service" }));
    return;
  }

  const match = matchRoute(req.method ?? "GET", url.pathname);
  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: { code: "NOT_FOUND", message: `No route for ${req.method} ${url.pathname}` },
      }),
    );
    return;
  }

  const body = await readBody(req);
  const event = buildEvent(req, url, match.pathParameters, body);

  const started = Date.now();
  const result = await match.route.handler(event);
  console.log(
    `${req.method} ${url.pathname} → ${result.statusCode} (${Date.now() - started}ms)`,
  );

  res.writeHead(result.statusCode, result.headers as Record<string, string>);
  res.end(result.body);
});

server.listen(port, () => {
  console.log(`medicine-service dev server → http://localhost:${port}`);
  console.log(`  health:  GET  /health`);
  console.log(`  routes:  ${routes.map((r) => `${r.method} /${r.segments.join("/")}`).join(", ")}`);
  console.log(`  dev user: ${process.env.DEV_USER_ID}`);
  console.log(`  storage:  in-memory (cleared on restart)`);
});
