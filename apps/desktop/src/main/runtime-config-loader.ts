import { app } from "electron";
import { link, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  parseRuntimeConfig,
  runtimeConfigFromDevEnv,
  type InitialConnectionResult,
  type RuntimeConfig,
  type RuntimeConfigEnv,
  type RuntimeConfigResult,
} from "../shared/runtime-config";

export async function loadRuntimeConfig(options: {
  isDev: boolean;
  env: RuntimeConfigEnv;
  configPath?: string;
}): Promise<RuntimeConfigResult> {
  if (options.isDev && Object.values(options.env).some((value) => value !== undefined)) {
    try {
      return { ok: true, config: runtimeConfigFromDevEnv(options.env) };
    } catch (err) {
      return { ok: false, error: { message: errorMessage(err) } };
    }
  }

  const configPath = options.configPath ?? desktopConfigPath();
  try {
    const raw = await readFile(configPath, "utf-8");
    return { ok: true, config: parseRuntimeConfig(raw) };
  } catch (err) {
    if (isMissingFileError(err)) {
      return {
        ok: false,
        error: {
          message: `Missing ${configPath}. Configure apiUrl and appUrl before connecting.`,
          missing: !options.isDev,
        },
      };
    }
    return {
      ok: false,
      error: {
        message: `Invalid ${configPath}: ${errorMessage(err)}`,
      },
    };
  }
}

export async function saveInitialConnection(value: unknown): Promise<InitialConnectionResult> {
  if (typeof value !== "string") return { ok: false, reason: "invalid_url" };
  let address: URL;
  try {
    address = new URL(value.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (!["http:", "https:"].includes(address.protocol) || address.username || address.password ||
      address.pathname !== "/" || address.search || address.hash) {
    return { ok: false, reason: "invalid_url" };
  }

  try {
    const response = await fetch(`${address.origin}/health`, {
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    const health: unknown = response.ok ? await response.json() : null;
    if (!health || typeof health !== "object" || !("status" in health) || health.status !== "ok") {
      return { ok: false, reason: "unreachable" };
    }
  } catch {
    return { ok: false, reason: "unreachable" };
  }

  const configPath = desktopConfigPath();
  const directory = dirname(configPath);
  let temporaryDirectory: string | undefined;
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    temporaryDirectory = await mkdtemp(join(directory, ".desktop-config-"));
    const draft = join(temporaryDirectory, "desktop.json");
    const config = { schemaVersion: 1, apiUrl: address.origin, appUrl: address.origin };
    await writeFile(draft, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    // Publish atomically without overwriting a file another window or the user created.
    await link(draft, configPath);
    return { ok: true };
  } catch {
    return { ok: false, reason: "save_failed" };
  } finally {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export function desktopConfigPath(): string {
  return join(app.getPath("home"), ".multica", "desktop.json");
}

function isMissingFileError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT",
  );
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export type { RuntimeConfig, RuntimeConfigResult };
