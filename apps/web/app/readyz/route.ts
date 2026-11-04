import { resolveRemoteApiUrl } from "../../config/runtime-urls";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const apiUrl = resolveRemoteApiUrl(process.env);
  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/readyz`, {
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
        redirect: "error",
      });
      await response.body?.cancel();
      if (response.ok) {
        return Response.json(
          { status: "ok" },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch {
      // Public probes must not expose upstream connection details.
    }
  }
  return Response.json(
    { status: "not_ready" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
