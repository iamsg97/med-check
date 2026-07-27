import type { ApiErrorBody, ApiErrorCode } from "@med-check/types";

import { API_BASE_URL } from "./config";

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * An error carrying the API's own code and field messages, so screens can show
 * per-field validation feedback instead of a generic failure.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | "NETWORK";
  readonly details?: Record<string, string>;

  constructor(
    status: number,
    code: ApiErrorCode | "NETWORK",
    message: string,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the request never reached the gateway. */
  get isNetworkError(): boolean {
    return this.code === "NETWORK";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function request<T>(
  path: string,
  { method = "GET", body, signal }: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  // Time out rather than hang forever when the dev server isn't running.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    // A caller-initiated abort is not a failure worth reporting.
    if (signal?.aborted) throw err;
    throw new ApiError(
      0,
      "NETWORK",
      `Can't reach the MedCheck API at ${API_BASE_URL}. Is the gateway running?`,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload: unknown = text ? safeParse(text) : undefined;

  if (!response.ok) {
    const apiError = (payload as ApiErrorBody | undefined)?.error;
    throw new ApiError(
      response.status,
      apiError?.code ?? "INTERNAL",
      apiError?.message ?? `Request failed (${response.status}).`,
      apiError?.details,
    );
  }

  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
