import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const excluded = new Set(["node_modules", ".git", ".next", ".source", ".turbo", "dist", "dist-electron", "out", "build", "ios", "android", "generated"]);
const forbidden = /^(?:@posthog\/|github\.com\/posthog\/|posthog(?:-js|-node)?(?:$|\/)|@sentry\/|@opentelemetry\/|@vercel\/analytics|@amplitude\/|mixpanel|@segment\/|github\.com\/prometheus\/)/;
const violations = [];

export function findForbiddenImports(source, extension) {
  // A connected-app slug is product data, not a Go package import.
  const imports = extension === ".go"
    ? [...source.matchAll(/^[ \t]*import\s+(?:\([\s\S]*?^[ \t]*\)|[^\n]+)/gm)].map((match) => match[0]).join("\n")
    : source;
  return [...imports.matchAll(/["'`]([^"'`\n]+)["'`]/g)]
    .map((match) => match[1])
    .filter((name) => forbidden.test(name));
}

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
    for (const name of findForbiddenImports(source, entry.name.endsWith(".go") ? ".go" : ".js")) {
      violations.push(`${relative(root, path)}: ${name}`);
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const dir of ["apps", "packages", "server"]) walk(join(root, dir));
  if (violations.length) {
    throw new Error(`Telemetry dependencies or imports were reintroduced:\n${violations.join("\n")}`);
  }
  console.log("Telemetry SDK/import checks passed. Run facade regression tests after upstream updates.");
}
