import { describe, expect, it } from "vitest";
import { configuredHttpUrl, documentationLinks } from "./deployment";

describe("documentation deployment links", () => {
  it("has no upstream or local default links", () => {
    expect(Object.values(documentationLinks({})).every((url) => url === undefined)).toBe(true);
  });
  it("uses only configured destinations", () => {
    expect(documentationLinks({ DOCS_REPOSITORY_URL: "https://git.example.test/team/custom/" }).repositoryUrl)
      .toBe("https://git.example.test/team/custom");
  });
  it.each(["javascript:alert(1)", "file:///tmp/docs", "https://user:secret@example.test"])("rejects invalid URL %s", (url) => {
    expect(() => configuredHttpUrl(url)).toThrow();
  });
});
