// Local entry point. Keeps the app's `main` field inside apps/mobile so Expo
// doesn't compute a broken relative path into the pnpm store. This just
// re-exports the expo-router entry, resolved via normal node_modules lookup.
import "expo-router/entry";
