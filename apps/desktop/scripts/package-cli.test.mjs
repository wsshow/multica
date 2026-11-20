// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";

let root, scripts, bin, marker, voiceMarker;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "multica-package-cli-"));
  scripts = join(root, "apps", "desktop", "scripts");
  bin = join(root, "bin");
  marker = join(root, "builder-args.txt");
  voiceMarker = join(root, "voice-args.jsonl");
  mkdirSync(scripts, { recursive: true });
  mkdirSync(bin);
  writeFileSync(marker, "");
  writeFileSync(voiceMarker, "");
  for (const script of ["bundle-cli.mjs", "package.mjs"]) {
    copyFileSync(fileURLToPath(new URL(script, import.meta.url)), join(scripts, script));
  }
  // Record staging without loading the native engine or fetching packages.
  writeFileSync(join(scripts, "bundle-voice-engine.mjs"), `
    import { appendFileSync } from "node:fs";
    appendFileSync(process.env.VOICE_MARKER, JSON.stringify(process.argv.slice(2)) + "\\n");
  `);

  // Isolate PATH so no Go toolchain or real Electron packager is used.
  if (process.platform === "win32") {
    copyFileSync(process.execPath, join(bin, "node.exe"));
    writeFileSync(join(bin, "electron-vite.cmd"), "@exit /b 0\r\n");
    writeFileSync(join(bin, "electron-builder.cmd"), '@echo %*>>"%BUILDER_MARKER%"\r\n');
  } else {
    symlinkSync(process.execPath, join(bin, "node"));
    writeFileSync(join(bin, "electron-vite"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    writeFileSync(join(bin, "electron-builder"), '#!/bin/sh\necho "$*" >> "$BUILDER_MARKER"\n', { mode: 0o755 });
  }
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function runScript(name, args) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === "PATH") delete env[key];
  }
  const result = spawnSync(process.execPath, [join(scripts, name), ...args], {
    env: { ...env, PATH: bin, BUILDER_MARKER: marker, VOICE_MARKER: voiceMarker },
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  return result;
}

it("requires Go for development and packaging even when a prebuilt CLI exists", () => {
  const prebuilt = join(root, "server", "bin", "windows-amd64");
  mkdirSync(prebuilt, { recursive: true });
  writeFileSync(join(prebuilt, "multica.exe"), "stale fixture");

  const dev = runScript("bundle-cli.mjs", ["--target-platform", "win32", "--target-arch", "x64"]);
  expect(dev.status).toBe(1);
  expect(dev.stderr).toContain("Go is required to compile the customized CLI");

  const result = runScript("package.mjs", ["--win", "--x64"]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Go is required to compile the customized CLI");
  expect(readFileSync(marker, "utf8")).toBe("");
  expect(readFileSync(voiceMarker, "utf8")).toBe("");
});

it("packages a staged x64 CLI and stops before an unstaged arm64 target", () => {
  // Exercise packaging's per-target staging guard without invoking a compiler.
  writeFileSync(join(scripts, "bundle-cli.mjs"), `
    import { mkdirSync, rmSync, writeFileSync } from "node:fs";
    import { dirname, resolve } from "node:path";
    import { fileURLToPath } from "node:url";
    const destination = resolve(dirname(fileURLToPath(import.meta.url)), "../resources/bin/multica.exe");
    const arch = process.argv[process.argv.indexOf("--target-arch") + 1];
    rmSync(destination, { force: true });
    if (arch === "x64") {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, "staged x64 fixture");
    }
  `);

  const result = runScript("package.mjs", ["--win", "--x64", "--arm64"]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Packaging Windows arm64 requires a bundled CLI");
  const calls = readFileSync(marker, "utf8").trim().split(/\r?\n/);
  expect(calls).toHaveLength(1);
  expect(calls[0].split(" ")).toContain("--x64");
  expect(calls[0]).not.toContain("--arm64");
  const voiceCalls = readFileSync(voiceMarker, "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line));
  expect(voiceCalls).toEqual([
    ["--target-platform", "win32", "--target-arch", "x64", "--required"],
  ]);
});
