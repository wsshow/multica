// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseRuntimeRelease } from "./release";

describe("configured runtime release metadata", () => {
  it("accepts a release tag", () => {
    expect(parseRuntimeRelease({ tag_name: "v1.2.3" })).toEqual({ tag_name: "v1.2.3" });
  });
  it.each([null, {}, { tag_name: 123 }, []])("does not advertise malformed metadata %j", (data) => {
    expect(parseRuntimeRelease(data)).toEqual({ tag_name: "" });
  });
});
