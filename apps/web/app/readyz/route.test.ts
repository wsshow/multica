// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("web readiness", () => {
  it("requires explicit backend configuration", async () => {
    vi.stubEnv("REMOTE_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await GET()).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks backend readiness without caching or exposing its response", async () => {
    vi.stubEnv("REMOTE_API_URL", "http://backend:8081");
    const fetcher = vi.fn().mockResolvedValue(new Response('{"checks":{"db":"ok"}}'));
    vi.stubGlobal("fetch", fetcher);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetcher).toHaveBeenCalledWith("http://backend:8081/readyz", expect.objectContaining({ cache: "no-store", redirect: "error" }));
  });
  it.each(["unavailable", "error"])("reports %s as unready", async (state) => {
    vi.stubEnv("REMOTE_API_URL", "http://backend:8081");
    vi.stubGlobal("fetch", state === "error" ? vi.fn().mockRejectedValue(new Error("private connection detail")) : vi.fn().mockResolvedValue(new Response("private", { status: 503 })));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "not_ready" });
  });
});
