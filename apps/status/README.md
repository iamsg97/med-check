# @med-check/status

A local-only dashboard showing the version, health, and implementation state of every module in
this monorepo (each app, Lambda, and shared package). Plain HTML/CSS/JS, one Node process, zero
runtime dependencies — nothing to install beyond the workspace, nothing to break.

## Run it

```bash
cp apps/status/.env.example apps/status/.env.local
# fill in GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET — see "GitHub sign-in" below
pnpm --filter @med-check/status dev
```

Then open <http://localhost:4100> and sign in with GitHub.

The page polls `/api/status` every 8 seconds (toggle or force it from the top bar). For each
module it shows:

- **Version** — read live from that module's `package.json`.
- **Health** — for modules with a local dev server (`apps/api`, `apps/mobile`,
  `lambdas/medicine-service`), a real HTTP probe against its health endpoint, with a short timeout
  so an unreachable server just shows "not running" instead of hanging the page.
- **Implementation state** — for modules with no dev server yet (the three unbuilt Lambdas, shared
  packages), the dashboard reports "not implemented" / "library" instead of pinging nothing.
- **Git** — current branch, short commit, and whether the working tree is dirty, so "version" means
  something even though every `package.json` is still pinned at `0.0.0`.

Register a new module by adding an entry to [`modules.config.js`](./modules.config.js) — the
dashboard picks it up automatically, no other code changes needed.

## Why it can't crash the rest of your dev setup

- No dependencies to drift or fail to install.
- Every health probe is time-boxed (`AbortController`, 1.5s) and wrapped so one hung dev server
  can't stall the others or the page.
- The frontend never throws on a failed poll — it shows a banner and keeps the last good render.
- The server installs `uncaughtException` / `unhandledRejection` handlers so a bad request can't
  take the whole dashboard down; it's meant to sit open in a tab for a full dev session.

## GitHub sign-in

Every route except `/login.html`, `/styles.css`, and the `/auth/*` endpoints requires a session.

**Setup (one-time):**

1. Create a GitHub OAuth App at <https://github.com/settings/applications/new>:
   - **Homepage URL**: `http://localhost:4100`
   - **Authorization callback URL**: `http://localhost:4100/auth/callback`
2. Copy the generated **Client ID**, and click **Generate a new client secret** to get the
   **Client Secret**.
3. `cp apps/status/.env.example apps/status/.env.local` and paste both values in, alongside your
   GitHub username in `GITHUB_ALLOWED_LOGIN` (defaults to `iamsg97`).
4. Restart the server. Visiting any page without a valid session redirects to `/login.html`; the
   "Sign in with GitHub" button starts the OAuth flow.

**How it works** (`auth.js` + the top of `server.js`):

- `GET /auth/login` redirects to GitHub with a random `state` value, stashed in a short-lived
  cookie, requesting only the `read:user` scope (just enough to read `login`).
- `GET /auth/callback` verifies `state`, exchanges the code for an access token, and calls
  `GET https://api.github.com/user`. If `login` doesn't case-insensitively match an entry in
  `GITHUB_ALLOWED_LOGIN`, the request is rejected with 403 and **no session is created**.
- On success, a random 256-bit session token is stored in an in-memory `Map` (never written to
  disk) and set as an `HttpOnly`, `SameSite=Lax` cookie. Sessions expire after
  `SESSION_TTL_HOURS` (default 12h) or when the server restarts.
- `GET /auth/logout` clears both the cookie and the server-side session.
- If `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` aren't set, every route (except the OAuth ones)
  shows a setup page instead of silently allowing access.

This is fine for `localhost` over plain HTTP. If the dashboard is ever exposed beyond your own
machine, put it behind HTTPS first — session cookies would otherwise travel in the clear.
