// Metro config for the MedCheck pnpm monorepo.
// Tells Metro to watch the workspace root and resolve packages from both the
// app-local and hoisted root node_modules. Without this, Metro (run from
// apps/mobile) can't resolve hoisted dependencies like expo-router.
const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/private/defaults/exclusionList").default;
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// The mobile app only needs packages/* (workspace deps) from the rest of the
// monorepo. Without this, Metro's watcher/crawler walks apps/api, lambdas/*,
// .git, and .turbo too, which massively slows (or on Windows without
// Watchman, can appear to hang) the first bundle.
config.resolver.blockList = exclusionList([
  /apps[/\\]api[/\\].*/,
  /lambdas[/\\].*/,
  /\.git[/\\].*/,
  /\.turbo[/\\].*/,
  /\.idea[/\\].*/,
]);

module.exports = config;
