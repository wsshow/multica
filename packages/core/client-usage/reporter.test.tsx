// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ApiClient } from "../api/client";
import { ClientUsageReporter } from "./reporter";
import { getOrCreateInstallId } from "./install-id";

it("does not create an installation identity, observe activity or send usage", async () => {
  const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
  const fetch = vi.spyOn(globalThis, "fetch");
  const api = new ApiClient("https://api.invalid");
  const { unmount } = render(<ClientUsageReporter storage={storage} identity={{ platform: "web", version: "test", os: "unknown" }} />);
  window.dispatchEvent(new Event("focus"));
  document.dispatchEvent(new Event("visibilitychange"));
  expect(getOrCreateInstallId(storage)).toBe("");
  await api.upsertClientUsage({ install_id: "old-client" });
  expect(fetch).not.toHaveBeenCalled();
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
  unmount();
  fetch.mockRestore();
});
