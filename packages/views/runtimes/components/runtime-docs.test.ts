// @vitest-environment node
import { configureDeploymentLinks } from "@multica/core/platform/deployment-links";
import { beforeEach, describe, expect, it } from "vitest";
import {
  customRuntimeDocsHref,
  daemonRuntimesDocsHref,
} from "./runtime-docs";

describe("runtime docs links", () => {
  it("omits guide links until an operator configures a docs site", () => {
    configureDeploymentLinks({});
    expect(daemonRuntimesDocsHref("en")).toBe("");
    expect(customRuntimeDocsHref("zh-Hans")).toBe("");
  });

  it.each([
    ["en", "https://docs.example.test/docs/daemon-runtimes"],
    ["zh-Hans", "https://docs.example.test/docs/zh/daemon-runtimes"],
    ["zh-Hant", "https://docs.example.test/docs/zh-Hant/daemon-runtimes"],
    ["ja", "https://docs.example.test/docs/ja/daemon-runtimes"],
    ["ko", "https://docs.example.test/docs/ko/daemon-runtimes"],
    ["fr", "https://docs.example.test/docs/fr/daemon-runtimes"],
  ])("localizes the daemon guide for %s", (language, expected) => {
    expect(daemonRuntimesDocsHref(language)).toBe(expected);
  });

  it("adds the localized custom runtime section", () => {
    expect(customRuntimeDocsHref("zh-Hans")).toBe(
      `https://docs.example.test/docs/zh/daemon-runtimes#${encodeURIComponent("自定义运行时配置")}`,
    );
    expect(customRuntimeDocsHref("zh-Hant")).toBe(
      `https://docs.example.test/docs/zh-Hant/daemon-runtimes#${encodeURIComponent("自定義執行時配置")}`,
    );
    expect(customRuntimeDocsHref("fr")).toBe(
      `https://docs.example.test/docs/fr/daemon-runtimes#${encodeURIComponent("profils-de-runtime-personnalisés")}`,
    );
  });
});

beforeEach(() => configureDeploymentLinks({ docsUrl: "https://docs.example.test/docs" }));
