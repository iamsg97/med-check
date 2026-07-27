/**
 * Registry of every module the dashboard reports on.
 *
 * `healthUrl` is only set for processes that actually run a local dev server.
 * Modules without one (unimplemented Lambdas, shared packages) are reported
 * from `implementation` instead of a live probe — there is nothing to ping.
 *
 * Add a module here and it shows up on the dashboard; nothing else to wire up.
 */

/** @typedef {"built" | "stubbed" | "not-started"} Implementation */

/**
 * @typedef {Object} ModuleDef
 * @property {string} id
 * @property {string} name
 * @property {"service" | "lambda" | "package"} kind
 * @property {string} group             Section heading the card is grouped under.
 * @property {string} description
 * @property {string} packageJson       Path (relative to repo root) to read name/version from.
 * @property {string | null} healthUrl  URL to probe, or null if the module has no dev server.
 * @property {(body: string, res: import("node:http").IncomingMessage) => boolean} [isHealthy]
 *   Custom check when a 200 status alone doesn't mean "healthy" (e.g. Metro's plain-text /status).
 * @property {Implementation} implementation
 * @property {string} [runCommand]      Command shown to the user to bring it up locally.
 */

/** @type {ModuleDef[]} */
module.exports = [
  {
    id: "api",
    name: "API Gateway (NestJS)",
    kind: "service",
    group: "Edge",
    description: "Routes REST calls to the owning Lambda, mirrors API Gateway's contract.",
    packageJson: "apps/api/package.json",
    healthUrl: "http://localhost:3000/v1/health",
    implementation: "built",
    runCommand: "pnpm --filter @med-check/api dev",
  },
  {
    id: "mobile",
    name: "Mobile App (Expo)",
    kind: "service",
    group: "Edge",
    description: "React Native client — Metro dev server serves the JS bundle.",
    packageJson: "apps/mobile/package.json",
    healthUrl: "http://localhost:8081/status",
    isHealthy: (body) => body.includes("packager-status:running"),
    implementation: "built",
    runCommand: "pnpm --filter @med-check/mobile dev",
  },
  {
    id: "medicine-service",
    name: "Medicine Service",
    kind: "lambda",
    group: "Compute (Lambda)",
    description: "Medicine CRUD. In-memory store locally — resets on restart.",
    packageJson: "lambdas/medicine-service/package.json",
    healthUrl: "http://localhost:4000/health",
    implementation: "built",
    runCommand: "pnpm --filter @med-check/lambda-medicine-service dev",
  },
  {
    id: "ai-enrichment",
    name: "AI Enrichment",
    kind: "lambda",
    group: "Compute (Lambda)",
    description: "Bedrock-backed usage/dosage/side-effect enrichment.",
    packageJson: "lambdas/ai-enrichment/package.json",
    healthUrl: null,
    implementation: "not-started",
  },
  {
    id: "symptom-search",
    name: "Symptom Search",
    kind: "lambda",
    group: "Compute (Lambda)",
    description: "Matches the user's cabinet to a symptom via Bedrock.",
    packageJson: "lambdas/symptom-search/package.json",
    healthUrl: null,
    implementation: "not-started",
  },
  {
    id: "notification-service",
    name: "Notification Service",
    kind: "lambda",
    group: "Compute (Lambda)",
    description: "EventBridge-triggered reminder pushes via SNS → FCM.",
    packageJson: "lambdas/notification-service/package.json",
    healthUrl: null,
    implementation: "not-started",
  },
  {
    id: "types",
    name: "@med-check/types",
    kind: "package",
    group: "Shared packages",
    description: "Shared TypeScript types consumed by every app and Lambda.",
    packageJson: "packages/types/package.json",
    healthUrl: null,
    implementation: "built",
  },
  {
    id: "eslint-config",
    name: "@med-check/eslint-config",
    kind: "package",
    group: "Shared packages",
    description: "Shared ESLint rules.",
    packageJson: "packages/eslint-config/package.json",
    healthUrl: null,
    implementation: "built",
  },
  {
    id: "tsconfig",
    name: "@med-check/tsconfig",
    kind: "package",
    group: "Shared packages",
    description: "Shared TypeScript compiler config.",
    packageJson: "packages/tsconfig/package.json",
    healthUrl: null,
    implementation: "built",
  },
];
