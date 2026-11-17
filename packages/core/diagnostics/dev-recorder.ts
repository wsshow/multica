// Diagnostic collection stays disabled in this customized edition, including
// development builds. Keep the upstream API and pure formatting helpers.
import type { QueryClient } from "@tanstack/react-query";
import { dropRealtimeConnection } from "../api/realtime-observer";

export interface DevRequest {
  requestId: string;
  method: string;
  /** Sensitive query parameters are redacted. */
  path: string;
  /** JSON body with sensitive fields redacted; see `bodyNote` for what is missing. */
  body: string | null;
  /** Why `body` is not the whole request body, so it cannot be replayed as is. */
  bodyNote: string | null;
  /** Epoch ms. */
  startedAt: number;
  /** Null while in flight. */
  durationMs: number | null;
  /** Null while in flight, or when no response arrived. */
  status: number | null;
  /** Server error message, network error, or `aborted`. */
  error: string | null;
}

export interface DevNavigation {
  at: number;
  route: string;
  /** Input-to-paint time; null when no input explains the change. */
  durationMs: number | null;
}

export interface DevLongTask {
  at: number;
  durationMs: number;
  route: string | null;
}

export type DevErrorSource = "console" | "uncaught" | "rejection";

export interface DevError {
  at: number;
  source: DevErrorSource;
  message: string;
  stack: string | null;
  route: string | null;
}

export interface DevSyncChange {
  at: number;
  status: string;
}

export interface DevMemorySample {
  at: number;
  bytes: number;
}

export type DevCacheChange = "written" | "invalidated" | "removed" | "refetched";

/** Query hashes an event changed, by how. */
export type DevCacheEffects = Readonly<Record<DevCacheChange, readonly string[]>>;

export interface DevRealtimeEvent {
  id: number;
  at: number;
  /** A frame from the server, a recorded frame run again locally, or the socket coming back. */
  kind: "frame" | "replay" | "reconnect";
  /** Event type such as `issue:updated`; `reconnect` for a reconnect. */
  type: string;
  issueId: string | null;
  /** Issue key such as `MUL-12`, when the payload carries one. */
  issueKey: string | null;
  /** JSON payload with sensitive fields redacted; null for a reconnect. */
  payload: string | null;
  /** Why `payload` is not the whole payload. */
  payloadNote: string | null;
  /** `member <id>` or `agent <id>` when the frame names who caused it. */
  actor: string | null;
  /** Workspace that was current when the event arrived; replay runs only there. */
  workspaceId: string | null;
  /**
   * What handling the event did to the query cache, including refreshes it
   * deferred to a timer. Work a handler does after an `await` is not seen.
   */
  cache: DevCacheEffects;
  /** Reconnects: how long the socket was down, when the sync history shows it. */
  downMs: number | null;
}

/** Frames received during one second, starting at `at`. */
export interface DevFrameCount {
  at: number;
  count: number;
}

export interface DevRecording {
  requests: readonly DevRequest[];
  navigations: readonly DevNavigation[];
  longTasks: readonly DevLongTask[];
  errors: readonly DevError[];
  sync: readonly DevSyncChange[];
  events: readonly DevRealtimeEvent[];
  /** Server frames per second, kept apart from `events` so its cap never lowers the rate. */
  frameCounts: readonly DevFrameCount[];
  memory: readonly DevMemorySample[];
  /** JS heap ceiling on engines that report one. */
  heapLimit: number | null;
}

export const DEV_RECORDING_WINDOW_MS = 5 * 60_000;

const BODY_MAX_CHARS = 2_000;
const PAYLOAD_MAX_CHARS = 4_000;
const MESSAGE_MAX_CHARS = 1_000;

const EMPTY: DevRecording = {
  requests: [],
  navigations: [],
  longTasks: [],
  errors: [],
  sync: [],
  events: [],
  frameCounts: [],
  memory: [],
  heapLimit: null,
};

// Names of fields and query parameters that carry credentials: VCS and bot
// tokens, webhook secrets and URLs, passwords, agent environment variables.
// Numbers are never redacted, so usage counts such as `input_tokens` survive.
const SENSITIVE_KEY =
  /(token|secret|password|passphrase|credential|api_?key|private_?key|webhook_url|env)s?$/i;
const REDACTED = "[redacted]";

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [
      key,
      SENSITIVE_KEY.test(key) && field !== null && typeof field !== "number" && typeof field !== "boolean"
        ? REDACTED
        : redactValue(field),
    ]),
  );
}

/** The path with sensitive query parameters redacted. */
export function redactPath(path: string): string {
  const query = path.indexOf("?");
  if (query < 0) return path;
  const params = new URLSearchParams(path.slice(query + 1));
  let redacted = false;
  for (const key of [...params.keys()]) {
    if (!SENSITIVE_KEY.test(key)) continue;
    params.set(key, REDACTED);
    redacted = true;
  }
  return redacted ? `${path.slice(0, query)}?${params.toString()}` : path;
}

/**
 * What of a request body can be kept for display and replay: JSON with
 * sensitive fields redacted, cut to a bounded size. Anything else is not kept,
 * since there is no telling what in it is a secret.
 */
export function recordableBody(body: string | null): Pick<DevRequest, "body" | "bodyNote"> {
  if (body === null) return { body: null, bodyNote: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { body: null, bodyNote: `not JSON (${body.length} characters), so not recorded` };
  }
  const redacted = JSON.stringify(redactValue(parsed));
  if (redacted.length <= BODY_MAX_CHARS) return { body: redacted, bodyNote: null };
  return {
    body: truncate(redacted, BODY_MAX_CHARS),
    bodyNote: `truncated to ${BODY_MAX_CHARS} of ${redacted.length} characters`,
  };
}

/** A WebSocket payload as kept for display: redacted like request bodies, cut to a bounded size. */
export function recordablePayload(payload: unknown): Pick<DevRealtimeEvent, "payload" | "payloadNote"> {
  let text: string;
  try {
    text = JSON.stringify(redactValue(payload)) ?? "null";
  } catch {
    return { payload: null, payloadNote: "not serializable, so not recorded" };
  }
  if (text.length <= PAYLOAD_MAX_CHARS) return { payload: text, payloadNote: null };
  return {
    payload: truncate(text, PAYLOAD_MAX_CHARS),
    payloadNote: `truncated to ${PAYLOAD_MAX_CHARS} of ${text.length} characters`,
  };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** The issue an event is about, from the payload shapes that name one. */
export function eventIssue(payload: unknown): Pick<DevRealtimeEvent, "issueId" | "issueKey"> {
  if (!payload || typeof payload !== "object") return { issueId: null, issueKey: null };
  const fields = payload as Record<string, unknown>;
  const nested = (key: string) =>
    fields[key] && typeof fields[key] === "object" ? (fields[key] as Record<string, unknown>) : null;
  const issue = nested("issue");
  return {
    issueId:
      nonEmptyString(issue?.id) ??
      nonEmptyString(fields.issue_id) ??
      nonEmptyString(nested("comment")?.issue_id) ??
      nonEmptyString(nested("item")?.issue_id),
    issueKey: nonEmptyString(issue?.identifier),
  };
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** `console.error("%s failed: %o", a, b)` as the console would print it. */
export function formatConsoleArgs(args: readonly unknown[]): { message: string; stack: string | null } {
  const rest = [...args];
  let stack: string | null = null;
  const show = (value: unknown): string => {
    if (value instanceof Error) {
      stack ??= value.stack ?? null;
      return `${value.name}: ${value.message}`;
    }
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  };
  let message = "";
  if (typeof rest[0] === "string") {
    message = (rest.shift() as string).replace(/%[sdifoOc]/g, (token) =>
      token === "%c" ? (rest.shift(), "") : rest.length ? show(rest.shift()) : token,
    );
  }
  const tail = rest.map(show).join(" ");
  message = [message, tail].filter(Boolean).join(" ");
  return { message: truncate(message, MESSAGE_MAX_CHARS), stack };
}

export function installDevRecorder(_queryClient?: QueryClient): () => void { return () => {}; }
export function recordDevRoute(_route: string): void {}
export function recordDevNavigationDuration(_route: string, _durationMs: number): void {}
export function recordDevSyncStatus(_status: string): void {}
export function clearDevRequests(): void {}
export function clearDevErrors(): void {}
export function clearDevEvents(): void {}
export function replayDevEvent(_id: number): string | null { return "diagnostic recording is disabled"; }
// Explicit reconnect remains a local recovery action, without recording frames.
export function dropDevConnection(): boolean { return dropRealtimeConnection(); }
export function subscribeDevRecording(_listener: () => void): () => void { return () => {}; }
export function getDevRecording(): DevRecording { return EMPTY; }
export function resetDevRecorder(): void {}
