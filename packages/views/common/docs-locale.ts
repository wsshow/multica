import { getDeploymentLinks } from "@multica/core/platform/deployment-links";

// Docs-site path prefix for a UI language. English docs are prefix-less;
// every other docs locale lives under `/docs/<lang>/`.
export function docsLocalePrefix(language?: string): string {
  if (language?.startsWith("zh")) return "/zh";
  if (language?.startsWith("ja")) return "/ja";
  if (language?.startsWith("ko")) return "/ko";
  if (language?.startsWith("fr")) return "/fr";
  return "";
}

export function documentationUrl(path = "", language?: string): string | undefined {
  const base = getDeploymentLinks().docsUrl;
  return base ? `${base.replace(/\/+$/, "")}${docsLocalePrefix(language)}${path}` : undefined;
}
