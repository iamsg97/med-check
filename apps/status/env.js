/**
 * Minimal `.env.local` / `.env` loader — no dependency on `dotenv`.
 * Existing `process.env` values always win, matching dotenv's own precedence.
 */
"use strict";

const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");

function loadEnvFile(dir) {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.join(dir, filename);
    if (!existsSync(filePath)) continue;

    const contents = readFileSync(filePath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      const quoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"));
      if (quoted) value = value.slice(1, -1);

      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

module.exports = { loadEnvFile };
