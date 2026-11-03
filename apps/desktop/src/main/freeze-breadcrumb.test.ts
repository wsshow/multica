// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { ackFreezeBreadcrumb, clearFreezeBreadcrumb, readFreezeBreadcrumb, writeFreezeBreadcrumb } from "./freeze-breadcrumb";

it("does not persist, read or consume crash reports", () => {
  const dir = mkdtempSync(join(tmpdir(), "multica-no-telemetry-"));
  try {
    const file = join(dir, "failure.json");
    writeFreezeBreadcrumb(file, { kind: "unresponsive", context: { private: "data" }, ts: 1, version: "test" });
    expect(readdirSync(dir)).toEqual([]);
    writeFileSync(file, "existing private report");
    expect(readFreezeBreadcrumb(file)).toBeNull();
    ackFreezeBreadcrumb(file, 1);
    clearFreezeBreadcrumb(file);
    expect(readFileSync(file, "utf8")).toBe("existing private report");
  } finally { rmSync(dir, { recursive: true }); }
});
