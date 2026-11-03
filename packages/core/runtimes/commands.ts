export function normalizeCommandURL(url: string | undefined): string {
  return url?.trim().replace(/\/+$/, "") ?? "";
}

export type DaemonSetupTarget = "cloud" | "self_host" | "unknown";
export type DaemonConfigStatus = "loading" | "ready" | "error";

export interface DaemonSetupConfig {
  status: DaemonConfigStatus;
  target: DaemonSetupTarget;
  serverUrl?: string;
  appUrl?: string;
}

export type DaemonCommands =
  | { status: "ready"; setupCmd: string; tokenCmd: string }
  | { status: "loading" | "error" | "unknown" | "incomplete" };

export function daemonCommands(config: DaemonSetupConfig): DaemonCommands {
  if (config.status !== "ready") return { status: config.status };

  if (config.target !== "cloud" && config.target !== "self_host") return { status: "unknown" };
  const serverUrl = normalizeCommandURL(config.serverUrl);
  const appUrl = normalizeCommandURL(config.appUrl);
  if (!serverUrl || !appUrl) return { status: "incomplete" };
  return {
    status: "ready",
    setupCmd: `multica setup self-host --server-url ${serverUrl} --app-url ${appUrl}`,
    tokenCmd: `multica config set server_url ${serverUrl}
multica config set app_url ${appUrl}
multica login --token <YOUR_TOKEN>
multica daemon start`,
  };
}
