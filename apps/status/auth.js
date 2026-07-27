/**
 * GitHub OAuth (web application flow) + in-memory sessions.
 *
 * Single-user by design: after GitHub confirms identity, the returned
 * `login` must match `GITHUB_ALLOWED_LOGIN` or the sign-in is rejected before
 * a session is ever created. No token or session is ever persisted to disk —
 * restarting the server signs everyone out, which is fine for a local tool.
 */
"use strict";

const crypto = require("node:crypto");

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const USER_AGENT = "med-check-status-dashboard";
const REQUEST_TIMEOUT_MS = 8000;

function isConfigured(config) {
  return Boolean(config.clientId && config.clientSecret && config.allowedLogins.length > 0);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      cookies[key] = part.slice(eq + 1).trim();
    }
  }
  return cookies;
}

function serializeCookie(
  name,
  value,
  { maxAgeSeconds, path: cookiePath = "/", httpOnly = true, sameSite = "Lax" } = {},
) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${cookiePath}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (typeof maxAgeSeconds === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }
  return parts.join("; ");
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getAuthorizeUrl(config, state) {
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", `${config.baseUrl}/auth/callback`);
  // Read-only identity check — we only ever need `login`, nothing else.
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

async function exchangeCodeForToken(config, code) {
  const res = await fetchWithTimeout(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: `${config.baseUrl}/auth/callback`,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || `GitHub token exchange failed (${res.status})`);
  }
  return data.access_token;
}

async function fetchGitHubLogin(accessToken) {
  const res = await fetchWithTimeout(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub user lookup failed (${res.status})`);
  const data = await res.json();
  if (!data.login) throw new Error("GitHub response had no login");
  return data.login;
}

function isAllowedLogin(config, login) {
  return config.allowedLogins.some((allowed) => allowed.toLowerCase() === login.toLowerCase());
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

const sessions = new Map();

function createSession(login, ttlMs) {
  const token = randomToken();
  sessions.set(token, { login, expiresAt: Date.now() + ttlMs });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

module.exports = {
  isConfigured,
  randomToken,
  parseCookies,
  serializeCookie,
  getAuthorizeUrl,
  exchangeCodeForToken,
  fetchGitHubLogin,
  isAllowedLogin,
  createSession,
  getSession,
  destroySession,
};
