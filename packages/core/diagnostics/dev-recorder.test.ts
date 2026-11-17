// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getApiRequestObserver } from "../api/request-observer";
import { getRealtimeObserver } from "../api/realtime-observer";
import {
  formatConsoleArgs, getDevRecording, recordableBody, redactPath,
  installDevRecorder, recordDevNavigationDuration, recordDevRoute,
  recordDevSyncStatus, resetDevRecorder, subscribeDevRecording,
} from "./dev-recorder";

describe("disabled development diagnostics", () => {
  it("installs no observers or timers and keeps recording empty", () => {
    vi.useFakeTimers();
    try {
      const log = console.error;
      const initial = getDevRecording();
      const listener = vi.fn();
      const unsubscribe = subscribeDevRecording(listener);
      const stop = installDevRecorder();
      recordDevRoute("/private/issues");
      recordDevNavigationDuration("/private/issues", 100);
      recordDevSyncStatus("connected");
      expect(getApiRequestObserver()).toBeNull();
      expect(getRealtimeObserver()).toBeNull();
      expect(console.error).toBe(log);
      expect(vi.getTimerCount()).toBe(0);
      expect(getDevRecording()).toBe(initial);
      for (const [key, value] of Object.entries(initial)) {
        expect(value).toEqual(key === "heapLimit" ? null : []);
      }
      expect(listener).not.toHaveBeenCalled();
      stop();
      unsubscribe();
      resetDevRecorder();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("formatConsoleArgs", () => {
  it("substitutes format tokens and drops %c styles", () => {
    expect(formatConsoleArgs(["%cWarn%c %d rows", "color:red", "", 3]).message).toBe("Warn 3 rows");
  });

  it("serializes objects that follow the message", () => {
    expect(formatConsoleArgs(["bad payload", { id: 1 }]).message).toBe('bad payload {"id":1}');
  });
});

describe("recordableBody", () => {
  it("redacts credential fields at any depth but keeps usage counts", () => {
    const { body, bodyNote } = recordableBody(
      JSON.stringify({
        name: "slack",
        config: { bot_token: "xoxb-1", app_token: "xapp-1", signing_secret: "s" },
        custom_env: { OPENAI_API_KEY: "sk-1" },
        github_tokens: ["ghp-1"],
        input_tokens: 120,
      }),
    );
    expect(bodyNote).toBeNull();
    expect(JSON.parse(body!)).toEqual({
      name: "slack",
      config: { bot_token: "[redacted]", app_token: "[redacted]", signing_secret: "[redacted]" },
      custom_env: "[redacted]",
      github_tokens: "[redacted]",
      input_tokens: 120,
    });
  });

  it("marks a long body as cut instead of passing it off as the whole request", () => {
    const { body, bodyNote } = recordableBody(JSON.stringify({ content: "a".repeat(2100) }));
    expect(body!.length).toBe(2001);
    expect(bodyNote).toBe("truncated to 2000 of 2114 characters");
  });

  it("keeps no body it cannot inspect for secrets", () => {
    expect(recordableBody("token=abc")).toEqual({ body: null, bodyNote: "not JSON (9 characters), so not recorded" });
  });
});

describe("redactPath", () => {
  it("redacts credential query parameters only", () => {
    expect(redactPath("/api/x?token=abc&limit=5")).toBe("/api/x?token=%5Bredacted%5D&limit=5");
    expect(redactPath("/api/issues?limit=5")).toBe("/api/issues?limit=5");
  });
});
