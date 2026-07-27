/**
 * Local-only status dashboard server.
 *
 * Zero runtime dependencies on purpose — this is an internal dev tool, it
 * should never fail to start because of a broken `node_modules`. Serves the
 * static dashboard from `public/` and a JSON status feed at `/api/status`
 * that probes each module registered in `modules.config.js`.
 *
 *   pnpm --filter @med-check/status dev
 */
"use strict";

const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");

const { loadEnvFile } = require("./env");
loadEnvFile(__dirname);

const auth = require("./auth");
const modules = require("./modules.config");

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT ?? 4100);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const HEALTH_TIMEOUT_MS = 1500;
const GIT_CACHE_MS = 5000;

const SESSION_COOKIE = "status_session";
const STATE_COOKIE = "status_oauth_state";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_HOURS ?? 12) * 60 * 60 * 1000;

const AUTH_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID ?? "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  allowedLogins: (process.env.GITHUB_ALLOWED_LOGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  baseUrl: process.env.BASE_URL ?? `http://localhost:${PORT}`,
};

// Public — reachable with no session. Everything else requires one.
const PUBLIC_PATHS = new Set(["/login.html", "/styles.css"]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

// ---------------------------------------------------------------------------
// Git info (repo-wide — there's one repo, "deployment version" == commit).
// ---------------------------------------------------------------------------

let gitCache = { at: 0, value: null };

async function getGitInfo() {
  if (Date.now() - gitCache.at < GIT_CACHE_MS && gitCache.value) {
    return gitCache.value;
  }

  const value = { available: false };
  try {
    const [branch, commit, commitDate, status] = await Promise.all([
      execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: REPO_ROOT }),
      execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO_ROOT }),
      execFileAsync("git", ["log", "-1", "--format=%cI"], { cwd: REPO_ROOT }),
      execFileAsync("git", ["status", "--porcelain"], { cwd: REPO_ROOT }),
    ]);

    value.available = true;
    value.branch = branch.stdout.trim();
    value.commit = commit.stdout.trim();
    value.commitDate = commitDate.stdout.trim();
    value.dirty = status.stdout.trim().length > 0;
  } catch {
    // Not fatal — the dashboard just omits git info. `git` may not be on
    // PATH, or this may not be a checkout at all.
    value.available = false;
  }

  gitCache = { at: Date.now(), value };
  return value;
}

// ---------------------------------------------------------------------------
// Per-module status
// ---------------------------------------------------------------------------

async function readVersion(packageJsonRelPath) {
  try {
    const raw = await readFile(path.join(REPO_ROOT, packageJsonRelPath), "utf8");
    const parsed = JSON.parse(raw);
    return { name: parsed.name ?? null, version: parsed.version ?? null };
  } catch {
    return { name: null, version: null };
  }
}

async function probeHealth(mod) {
  if (!mod.healthUrl) {
    return { state: mod.implementation === "not-started" ? "not-implemented" : "static" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const started = Date.now();

  try {
    const res = await fetch(mod.healthUrl, { signal: controller.signal });
    const body = await res.text();
    const latencyMs = Date.now() - started;

    const healthy = mod.isHealthy ? mod.isHealthy(body, res) : res.ok;
    if (!healthy) return { state: "degraded", latencyMs, httpStatus: res.status };
    return { state: "healthy", latencyMs, httpStatus: res.status };
  } catch (err) {
    const reason = err && err.name === "AbortError" ? "timeout" : "unreachable";
    return { state: "offline", reason };
  } finally {
    clearTimeout(timer);
  }
}

async function buildModuleStatus(mod) {
  const [version, health] = await Promise.all([readVersion(mod.packageJson), probeHealth(mod)]);
  return {
    id: mod.id,
    name: mod.name,
    kind: mod.kind,
    group: mod.group,
    description: mod.description,
    runCommand: mod.runCommand ?? null,
    implementation: mod.implementation,
    version: version.version,
    health,
  };
}

async function buildStatusPayload() {
  const [git, moduleStatuses] = await Promise.all([
    getGitInfo(),
    Promise.all(modules.map((mod) => buildModuleStatus(mod).catch((err) => ({
      id: mod.id,
      name: mod.name,
      kind: mod.kind,
      group: mod.group,
      description: mod.description,
      implementation: mod.implementation,
      version: null,
      health: { state: "error", reason: String(err && err.message ? err.message : err) },
    })))),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    git,
    modules: moduleStatuses,
  };
}

// ---------------------------------------------------------------------------
// Auth — GitHub OAuth restricted to GITHUB_ALLOWED_LOGIN
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function errorPage(title, message) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0f1115; color: #eef0f3;
             display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
      .box { max-width: 420px; padding: 2rem; text-align: center; }
      a { color: #6ea8fe; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="/login.html">Back to sign-in</a></p>
    </div>
  </body>
</html>`;
}

const NOT_CONFIGURED_HTML = errorPage(
  "GitHub OAuth not configured",
  "Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_ALLOWED_LOGIN in apps/status/.env.local, " +
    "then restart the server. See apps/status/README.md.",
);

async function handleLogin(req, res) {
  if (!auth.isConfigured(AUTH_CONFIG)) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(NOT_CONFIGURED_HTML);
    return;
  }

  const state = auth.randomToken(16);
  res.writeHead(302, {
    "Set-Cookie": auth.serializeCookie(STATE_COOKIE, state, { maxAgeSeconds: 300, path: "/auth" }),
    Location: auth.getAuthorizeUrl(AUTH_CONFIG, state),
  });
  res.end();
}

async function handleCallback(req, res, url) {
  const clearState = auth.serializeCookie(STATE_COOKIE, "", { maxAgeSeconds: 0, path: "/auth" });

  try {
    const cookies = auth.parseCookies(req.headers.cookie);
    const expectedState = cookies[STATE_COOKIE];
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");

    if (!code || !state || !expectedState || state !== expectedState) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearState });
      res.end(errorPage("Login failed", "Missing or mismatched OAuth state. Try signing in again."));
      return;
    }

    const accessToken = await auth.exchangeCodeForToken(AUTH_CONFIG, code);
    const login = await auth.fetchGitHubLogin(accessToken);

    if (!auth.isAllowedLogin(AUTH_CONFIG, login)) {
      res.writeHead(403, { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearState });
      res.end(errorPage("Not authorized", `GitHub account "${login}" is not allowed to view this dashboard.`));
      return;
    }

    const token = auth.createSession(login, SESSION_TTL_MS);
    res.writeHead(302, {
      "Set-Cookie": [
        clearState,
        auth.serializeCookie(SESSION_COOKIE, token, { maxAgeSeconds: SESSION_TTL_MS / 1000 }),
      ],
      Location: "/",
    });
    res.end();
  } catch (err) {
    console.error("[status] oauth callback failed:", err);
    res.writeHead(502, { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearState });
    res.end(errorPage("Login failed", "Could not complete GitHub sign-in. Check the server logs."));
  }
}

async function handleLogout(req, res) {
  const cookies = auth.parseCookies(req.headers.cookie);
  auth.destroySession(cookies[SESSION_COOKIE]);
  res.writeHead(302, {
    "Set-Cookie": auth.serializeCookie(SESSION_COOKIE, "", { maxAgeSeconds: 0 }),
    Location: "/login.html",
  });
  res.end();
}

// ---------------------------------------------------------------------------
// Static file serving (no framework — this is intentionally small)
// ---------------------------------------------------------------------------

async function serveStatic(req, res, pathname) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  const handle = async () => {
    if (url.pathname === "/auth/login") return handleLogin(req, res);
    if (url.pathname === "/auth/callback") return handleCallback(req, res, url);
    if (url.pathname === "/auth/logout") return handleLogout(req, res);

    if (!auth.isConfigured(AUTH_CONFIG)) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(NOT_CONFIGURED_HTML);
      return;
    }

    const cookies = auth.parseCookies(req.headers.cookie);
    const session = auth.getSession(cookies[SESSION_COOKIE]);

    if (!session) {
      if (PUBLIC_PATHS.has(url.pathname)) return serveStatic(req, res, url.pathname);
      if (url.pathname.startsWith("/api/")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
      res.writeHead(302, { Location: "/login.html" });
      res.end();
      return;
    }

    if (url.pathname === "/login.html") {
      res.writeHead(302, { Location: "/" });
      res.end();
      return;
    }

    if (url.pathname === "/api/status") {
      const payload = await buildStatusPayload();
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ...payload, user: session.login }));
      return;
    }

    await serveStatic(req, res, url.pathname);
  };

  handle().catch((err) => {
    console.error("[status] request failed:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal error" }));
    }
  });
});

// This is a dev tool that stays open on a developer's machine for hours —
// one bad probe must never take the whole dashboard down with it.
process.on("uncaughtException", (err) => console.error("[status] uncaught exception:", err));
process.on("unhandledRejection", (err) => console.error("[status] unhandled rejection:", err));

server.listen(PORT, () => {
  console.log(`status dashboard -> http://localhost:${PORT}`);
  if (!auth.isConfigured(AUTH_CONFIG)) {
    console.warn(
      "[status] GitHub OAuth is not configured — every request will show a setup page. " +
        "See apps/status/README.md.",
    );
  } else {
    console.log(`[status] GitHub sign-in restricted to: ${AUTH_CONFIG.allowedLogins.join(", ")}`);
  }
});
