import Constants from "expo-constants";
import { Platform } from "react-native";

const GATEWAY_PORT = 3000;
const API_PREFIX = "/v1";

/**
 * Base URL of the NestJS gateway.
 *
 * `EXPO_PUBLIC_API_URL` wins when set (use it for a deployed API Gateway).
 * Otherwise the dev machine's host is derived from Expo's `hostUri` — the same
 * address Metro is being served from — so a physical device on the LAN and the
 * emulator both reach the right place without hardcoding an IP.
 */
export function resolveApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // e.g. "192.168.0.191:8081" — strip Metro's port, keep the host.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split(":")[0];

  if (host) return `http://${host}:${GATEWAY_PORT}${API_PREFIX}`;

  // Fallbacks when hostUri is unavailable (e.g. a release build).
  // 10.0.2.2 is how the Android emulator reaches the host machine's loopback.
  const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${fallbackHost}:${GATEWAY_PORT}${API_PREFIX}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
