const REFRESH_MS = 8000;

const groupsEl = document.getElementById("groups");
const bannerEl = document.getElementById("banner");
const lastUpdatedEl = document.getElementById("last-updated");
const gitInfoEl = document.getElementById("git-info");
const refreshBtn = document.getElementById("refresh-btn");
const autoRefreshCheckbox = document.getElementById("auto-refresh");
const userInfoEl = document.getElementById("user-info");

const STATE_LABEL = {
  healthy: "Healthy",
  degraded: "Degraded",
  offline: "Not running",
  "not-implemented": "Not implemented",
  static: "Library",
  error: "Error",
};

let timerId = null;

function pillClass(state) {
  return `pill pill--${state ?? "error"}`;
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso ?? "—";
  }
}

function healthDetail(health) {
  if (!health) return "";
  if (health.state === "healthy" || health.state === "degraded") {
    const parts = [];
    if (typeof health.httpStatus === "number") parts.push(`HTTP ${health.httpStatus}`);
    if (typeof health.latencyMs === "number") parts.push(`${health.latencyMs}ms`);
    return parts.join(" · ");
  }
  if (health.state === "offline") {
    return health.reason === "timeout" ? "timed out" : "dev server not running";
  }
  if (health.state === "error") {
    return health.reason ?? "unknown error";
  }
  return "";
}

function renderCard(mod) {
  const card = document.createElement("article");
  card.className = "card";

  const head = document.createElement("div");
  head.className = "card__head";

  const name = document.createElement("span");
  name.className = "card__name";
  name.textContent = mod.name ?? mod.id ?? "unknown module";

  const state = mod.health?.state ?? "error";
  const pill = document.createElement("span");
  pill.className = pillClass(state);
  pill.textContent = STATE_LABEL[state] ?? state;

  head.append(name, pill);
  card.append(head);

  if (mod.description) {
    const desc = document.createElement("p");
    desc.className = "card__desc";
    desc.textContent = mod.description;
    card.append(desc);
  }

  const meta = document.createElement("div");
  meta.className = "card__meta";

  const versionCode = document.createElement("code");
  versionCode.textContent = `v${mod.version ?? "0.0.0"}`;
  meta.append(versionCode);

  const detail = healthDetail(mod.health);
  if (detail) {
    const detailSpan = document.createElement("span");
    detailSpan.textContent = detail;
    meta.append(detailSpan);
  }

  card.append(meta);

  if (mod.runCommand && state !== "healthy") {
    const run = document.createElement("div");
    run.className = "card__run";
    run.textContent = `$ ${mod.runCommand}`;
    card.append(run);
  }

  return card;
}

function renderGroups(modules) {
  groupsEl.replaceChildren();

  const byGroup = new Map();
  for (const mod of modules ?? []) {
    const key = mod.group ?? "Other";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(mod);
  }

  for (const [groupName, mods] of byGroup) {
    const section = document.createElement("section");
    section.className = "group";

    const heading = document.createElement("h2");
    heading.textContent = groupName;
    section.append(heading);

    const cards = document.createElement("div");
    cards.className = "cards";
    for (const mod of mods) cards.append(renderCard(mod));
    section.append(cards);

    groupsEl.append(section);
  }
}

function renderGit(git) {
  if (!git || !git.available) {
    gitInfoEl.textContent = "git info unavailable";
    return;
  }
  const dirty = git.dirty ? " · uncommitted changes" : "";
  gitInfoEl.textContent = `${git.branch} @ ${git.commit}${dirty}`;
}

function showBanner(message) {
  if (!message) {
    bannerEl.hidden = true;
    bannerEl.textContent = "";
    return;
  }
  bannerEl.hidden = false;
  bannerEl.textContent = message;
}

async function refresh() {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/login.html";
      return;
    }
    if (!res.ok) throw new Error(`server responded ${res.status}`);
    const payload = await res.json();

    renderGroups(payload.modules);
    renderGit(payload.git);
    lastUpdatedEl.textContent = `Updated ${formatTime(payload.generatedAt)}`;
    userInfoEl.textContent = payload.user ? `@${payload.user}` : "";
    showBanner(null);
  } catch (err) {
    // Never let a failed poll take the page down — surface it and keep the
    // last-known-good render on screen.
    showBanner(`Couldn't reach the status server: ${err.message ?? err}`);
  }
}

function scheduleNext() {
  if (timerId) clearTimeout(timerId);
  if (!autoRefreshCheckbox.checked) return;
  timerId = setTimeout(async () => {
    await refresh();
    scheduleNext();
  }, REFRESH_MS);
}

refreshBtn.addEventListener("click", () => {
  refresh();
});

autoRefreshCheckbox.addEventListener("change", () => {
  scheduleNext();
});

refresh().then(scheduleNext);
