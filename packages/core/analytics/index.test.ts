// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { captureEvent, captureException, captureSignupSource, identify, initAnalytics, resetAnalytics, setPersonProperties } from "./index";
import { installFreezeWatchdog } from "../diagnostics/freeze-watchdog";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

it("cannot enable collection, storage or network activity with a configured key", async () => {
  vi.useFakeTimers();
  const fetch = vi.spyOn(globalThis, "fetch");
  const send = vi.spyOn(XMLHttpRequest.prototype, "send");
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const callback = vi.fn();
  const cookies = document.cookie;
  const scripts = document.scripts.length;
  window.history.replaceState(null, "", "/?utm_source=campaign");

  captureEvent("before_init", { content: "private" });
  identify("user-id", { email: "private@example.com" });
  expect(initAnalytics({ key: "configured-key", host: "https://collector.invalid" })).toBe(false);
  captureSignupSource();
  setPersonProperties({ name: "private" });
  captureException(new Error("private"));
  captureEvent("after_init", {}, { sendInstantly: true, onCaptured: callback });
  installFreezeWatchdog();
  resetAnalytics();
  await vi.runAllTimersAsync();

  expect(fetch).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
  expect(callback).not.toHaveBeenCalled();
  expect(document.cookie).toBe(cookies);
  expect(document.scripts.length).toBe(scripts);
  expect(vi.getTimerCount()).toBe(0);
});
