import { app } from "electron";
import { join } from "path";

// Keep the upstream API inert; Desktop must use the CLI shipped with this build.
export function managedCliPath(): string {
  return join(app.getPath("userData"), "bin", process.platform === "win32" ? "multica.exe" : "multica");
}

export async function ensureManagedCli(
  _options: { forceInstall?: boolean } = {},
): Promise<string> {
  throw new Error("This customized build requires its bundled CLI. Rebuild Desktop with Go installed; downloading replacement binaries is disabled.");
}
