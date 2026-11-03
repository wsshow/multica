export function configuredHttpUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const url = new URL(value);
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new Error("Documentation URLs must use http or https without credentials");
  }
  return url.toString().replace(/\/+$/, "");
}

export function documentationLinks(env: Record<string, string | undefined> = process.env) {
  return {
    repositoryUrl: configuredHttpUrl(env.DOCS_REPOSITORY_URL),
    appUrl: configuredHttpUrl(env.DOCS_APP_URL),
    discordUrl: configuredHttpUrl(env.DOCS_DISCORD_URL),
    socialUrl: configuredHttpUrl(env.DOCS_SOCIAL_URL),
  };
}
