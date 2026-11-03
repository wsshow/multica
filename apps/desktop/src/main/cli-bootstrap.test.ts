// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("electron", () => ({ app: { getPath: () => "/test/user-data" } }));
import { ensureManagedCli } from "./cli-bootstrap";

it.each([{}, { forceInstall: true }])("never downloads a replacement CLI (%j)", async (options) => {
  const fetch = vi.spyOn(globalThis, "fetch");
  try {
    await expect(ensureManagedCli(options)).rejects.toThrow("bundled CLI");
    expect(fetch).not.toHaveBeenCalled();
  } finally { fetch.mockRestore(); }
});
