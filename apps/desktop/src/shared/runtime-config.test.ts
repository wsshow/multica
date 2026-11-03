// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveWsUrl, parseRuntimeConfig, runtimeConfigFromDevEnv } from "./runtime-config";

const configured = {
  schemaVersion: 1,
  apiUrl: "http://localhost:8080",
  appUrl: "http://localhost:3000",
};
const parse = (overrides: Record<string, unknown> = {}) =>
  parseRuntimeConfig(JSON.stringify({ ...configured, ...overrides }));

describe("explicit desktop server configuration", () => {
  it.each(["apiUrl", "appUrl"])("requires %s instead of choosing a server", (field) => {
    expect(() => parse({ [field]: undefined })).toThrow(field);
    expect(() => parse({ [field]: " " })).toThrow(field);
  });
  it("derives only the WebSocket address from the configured API", () => {
    expect(parse()).toEqual({ ...configured, wsUrl: "ws://localhost:8080/ws" });
    expect(deriveWsUrl("https://api.example.test/prefix")).toBe("wss://api.example.test/prefix/ws");
  });
  it("keeps the configured web app host and port", () => {
    expect(parse({ apiUrl: "https://api.example.test", appUrl: "https://portal.example.test:8443/" })).toMatchObject({
      appUrl: "https://portal.example.test:8443",
    });
  });
  it("accepts explicit sockets, update feeds and help links", () => {
    expect(parse({
      wsUrl: "wss://socket.example.test/events/",
      updateUrl: "https://updates.example.test/desktop/",
      links: { docsUrl: "https://docs.example.test/docs/", changelogUrl: "https://docs.example.test/releases#latest" },
    })).toMatchObject({
      wsUrl: "wss://socket.example.test/events",
      updateUrl: "https://updates.example.test/desktop",
      links: { docsUrl: "https://docs.example.test/docs", changelogUrl: "https://docs.example.test/releases#latest" },
    });
  });
  it.each([
    { apiUrl: "file:///tmp/server" },
    { appUrl: "ftp://app.example.test" },
    { apiUrl: "https://user:password@api.example.test" },
    { wsUrl: "https://api.example.test/ws" },
    { updateUrl: "file:///tmp/updates" },
    { links: { docsUrl: "javascript:alert(1)" } },
    { links: [] },
    { schemaVersion: 2 },
  ])("rejects invalid configuration %j", (value) => {
    expect(() => parse(value)).toThrow();
  });
  it("rejects malformed JSON", () => {
    expect(() => parseRuntimeConfig("{")).toThrow(/Invalid desktop runtime config JSON/);
  });
  it("requires both development endpoint variables", () => {
    expect(() => runtimeConfigFromDevEnv({})).toThrow("VITE_API_URL");
    expect(() => runtimeConfigFromDevEnv({ apiUrl: configured.apiUrl })).toThrow("VITE_APP_URL");
    expect(runtimeConfigFromDevEnv(configured)).toEqual({ ...configured, wsUrl: "ws://localhost:8080/ws" });
  });
});
