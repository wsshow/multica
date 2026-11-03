import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { GoogleAnalytics } from "./google-analytics";

it("does not install Google scripts, globals or history hooks even with a measurement ID", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const pushState = window.history.pushState;
  const scripts = document.scripts.length;
  const w = window as unknown as Record<string, unknown>;
  const gtag = w.gtag;
  const dataLayer = w.dataLayer;
  const { unmount } = render(<GoogleAnalytics measurementId="G-TEST1234" />);
  expect(document.scripts.length).toBe(scripts);
  expect(window.history.pushState).toBe(pushState);
  expect(w.gtag).toBe(gtag);
  expect(w.dataLayer).toBe(dataLayer);
  expect(fetch).not.toHaveBeenCalled();
  unmount();
  fetch.mockRestore();
});
