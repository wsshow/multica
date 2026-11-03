import type { LocalRuntimeProbe } from "../../../shared/daemon-types";

export function runtimeProbeSignature(probe: LocalRuntimeProbe): string {
  if (probe.probeResult === "error") return "error";
  return JSON.stringify({
    runtimeCount: probe.runtimeCount,
    providers: Object.entries(probe.providerSummary).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    onlineCount: probe.onlineCount,
    offlineCount: probe.offlineCount,
  });
}

export function DesktopClientUsageReporter(_props: { apiUrl: string }) { return null; }
