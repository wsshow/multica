import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const excluded = new Set(["node_modules", ".git", ".next", ".source", ".turbo", "dist", "dist-electron", "out", "build", "ios", "android", "generated"]);
const forbidden = /^(?:posthog(?:-js|-node)?(?:$|\/)|@sentry\/|@opentelemetry\/|@vercel\/analytics|@amplitude\/|mixpanel|@segment\/|github\.com\/prometheus\/)/;
const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || excluded.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { walk(path); continue; }
    if (entry.name !== "package.json" && !/\.(?:ts|tsx|js|mjs|go)$/.test(entry.name)) continue;
    const source = readFileSync(path, "utf8");
    if (entry.name === "package.json") {
      const manifest = JSON.parse(source);
      for (const group of ["dependencies", "devDependencies", "optionalDependencies"]) {
        for (const name of Object.keys(manifest[group] ?? {})) {
          if (forbidden.test(name)) violations.push(`${relative(root, path)}: ${name}`);
        }
      }
    }
    if (!/\.(?:ts|tsx|js|mjs|go)$/.test(entry.name) || /(?:\.test\.|_test\.go$)/.test(entry.name)) continue;
    for (const match of source.matchAll(/["']([^"'\n]+)["']/g)) {
      if (forbidden.test(match[1])) violations.push(`${relative(root, path)}: ${match[1]}`);
    }
  }
}
for (const dir of ["apps", "packages", "server"]) walk(join(root, dir));
if (violations.length) {
  throw new Error(`Telemetry dependencies or imports were reintroduced:\n${violations.join("\n")}`);
}
console.log("Telemetry SDK/import checks passed. Run facade regression tests after upstream updates.");
