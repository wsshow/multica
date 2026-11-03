/** Return only the configured deployment host; absent configuration has no host. */
export function workspaceUrlHost(
  daemonAppUrl: string | null | undefined,
): string {
  const trimmed = daemonAppUrl?.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).host || "";
  } catch {
    // `daemon_app_url` may arrive without a scheme; treat it as a bare host
    // and strip any path/query/fragment so only the authority remains.
    const bare = trimmed
      .replace(/^.*?:\/\//, "")
      .replace(/[/?#].*$/, "")
      .trim();
    return bare || "";
  }
}
