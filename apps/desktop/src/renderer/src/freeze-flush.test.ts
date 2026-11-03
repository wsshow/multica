import { expect, it, vi } from "vitest";
import { flushFreezeBreadcrumb } from "./freeze-flush";

it("does not read, capture or acknowledge crash reports", () => {
  const deps = { getLastFreeze: vi.fn(), ackFreeze: vi.fn(), capture: vi.fn() };
  flushFreezeBreadcrumb(deps)();
  expect(deps.getLastFreeze).not.toHaveBeenCalled();
  expect(deps.ackFreeze).not.toHaveBeenCalled();
  expect(deps.capture).not.toHaveBeenCalled();
});
