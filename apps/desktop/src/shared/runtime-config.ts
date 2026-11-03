import type { DeploymentLinks } from "@multica/core/platform/deployment-links";

export interface RuntimeConfig {
  schemaVersion: 1;
  apiUrl: string;
  wsUrl: string;
  appUrl: string;
  updateUrl?: string;
  links?: DeploymentLinks;
}

export interface RuntimeConfigError {
  message: string;
}

export type RuntimeConfigResult =
  | { ok: true; config: RuntimeConfig }
  | { ok: false; error: RuntimeConfigError };

export interface RuntimeConfigEnv {
  apiUrl?: string;
  wsUrl?: string;
  appUrl?: string;
}

export function runtimeConfigFromDevEnv(env: RuntimeConfigEnv): RuntimeConfig {
  return parseRuntimeConfig(JSON.stringify({
    schemaVersion: 1,
    apiUrl: requiredString(env.apiUrl, "VITE_API_URL"),
    appUrl: requiredString(env.appUrl, "VITE_APP_URL"),
    wsUrl: env.wsUrl,
  }));
}

export function parseRuntimeConfig(raw: string): RuntimeConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Invalid desktop runtime config JSON: ${err instanceof Error ? err.message : "parse failed"}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid desktop runtime config: expected a JSON object");
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    throw new Error("Unsupported desktop runtime config schemaVersion: expected 1");
  }

  const apiUrl = requiredString(obj.apiUrl, "apiUrl");
  const appUrl = requiredString(obj.appUrl, "appUrl");
  const wsUrl = optionalString(obj.wsUrl, "wsUrl");

  const normalizedApiUrl = normalizeHttpUrl(apiUrl, "apiUrl");
  return {
    schemaVersion: 1,
    apiUrl: normalizedApiUrl,
    wsUrl: wsUrl ? normalizeWsUrl(wsUrl, "wsUrl") : deriveWsUrl(normalizedApiUrl),
    appUrl: normalizeHttpUrl(appUrl, "appUrl"),
    ...(obj.updateUrl === undefined ? {} : {
      updateUrl: normalizeHttpUrl(
        requiredString(obj.updateUrl, "updateUrl"), "updateUrl",
      ),
    }),
    ...(obj.links === undefined ? {} : { links: parseLinks(obj.links) }),
  };
}

export function deriveWsUrl(apiUrl: string): string {
  const url = new URL(apiUrl);
  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  else throw new Error("apiUrl must use http or https");
  url.pathname = joinPath(url.pathname, "/ws");
  url.search = "";
  url.hash = "";
  return trimTrailingSlash(url.toString());
}

function parseLinks(value: unknown): DeploymentLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid desktop runtime config: links must be an object");
  }
  const links: DeploymentLinks = {};
  for (const field of [
    "docsUrl", "changelogUrl", "downloadUrl", "communityUrl", "feedbackUrl",
    "runtimeReleaseUrl", "cliInstallUrl", "cliInstallWindowsUrl",
  ] as const) {
    const url = optionalString((value as Record<string, unknown>)[field], `links.${field}`);
    if (url !== undefined) links[field] = normalizeHttpUrl(url, `links.${field}`, true);
  }
  return links;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid desktop runtime config: ${field} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid desktop runtime config: ${field} must be a non-empty string when set`);
  }
  return value;
}

function normalizeHttpUrl(value: string, field: string, preserveFragment = false): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`Invalid desktop runtime config: ${field} must be a valid URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Invalid desktop runtime config: ${field} must use http or https`);
  }
  if (url.username || url.password) {
    throw new Error(`Invalid desktop runtime config: ${field} must not contain credentials`);
  }
  if (!preserveFragment) {
    url.search = "";
    url.hash = "";
  }
  return trimTrailingSlash(url.toString());
}

function normalizeWsUrl(value: string, field: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`Invalid desktop runtime config: ${field} must be a valid URL`);
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error(`Invalid desktop runtime config: ${field} must use ws or wss`);
  }
  url.search = "";
  url.hash = "";
  return trimTrailingSlash(url.toString());
}

function joinPath(base: string, suffix: string): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}${suffix}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
