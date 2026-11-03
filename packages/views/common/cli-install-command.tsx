"use client";

import type { ReactNode } from "react";
import {
  getDeploymentLinks,
  type DeploymentLinks,
} from "@multica/core/platform/deployment-links";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@multica/ui/components/ui/tabs";

export type CliInstallPlatform = "macosLinux" | "windows";

type CliInstallSources = Pick<
  DeploymentLinks,
  "cliInstallUrl" | "cliInstallWindowsUrl"
>;

export function getCliInstallCommands(
  sources: CliInstallSources = getDeploymentLinks(),
): Partial<Record<CliInstallPlatform, string>> {
  const { cliInstallUrl, cliInstallWindowsUrl } = sources;
  return {
    ...(cliInstallUrl
      ? { macosLinux: `curl -fsSL '${cliInstallUrl.replace(/'/g, "'\\''")}' | bash` }
      : {}),
    ...(cliInstallWindowsUrl
      ? { windows: `irm '${cliInstallWindowsUrl.replace(/'/g, "''")}' | iex` }
      : {}),
  };
}

export interface CliInstallCommandLabels {
  /** Accessible name for the platform switch. */
  group: string;
  macosLinux: string;
  windows: string;
}

/**
 * Platform switch for the install command, built on the shared Tabs primitive
 * so tab semantics and arrow-key navigation come for free.
 *
 * The switch is the only shared UI: `children` receives the selected command
 * and renders it, so each surface keeps its own command row — the product
 * surfaces their token-styled row with an icon copy button, the landing page
 * its marketing palette with a spelled-out one.
 */
export function CliInstallCommand({
  labels,
  sources,
  classNames,
  children,
}: {
  labels: CliInstallCommandLabels;
  sources?: CliInstallSources;
  /** Palette overrides for surfaces that do not use the product tokens. */
  classNames?: { list?: string; trigger?: string };
  children: (command: string) => ReactNode;
}) {
  const commands = getCliInstallCommands(sources);
  const platforms = Object.keys(commands) as CliInstallPlatform[];
  if (!platforms.length) return null;
  return (
    <Tabs defaultValue={platforms[0]}>
      <TabsList
        aria-label={labels.group}
        activateOnFocus
        className={classNames?.list}
      >
        {platforms.map((platform) => (
          <TabsTrigger
            key={platform}
            value={platform}
            className={classNames?.trigger}
          >
            {labels[platform]}
          </TabsTrigger>
        ))}
      </TabsList>
      {platforms.map((platform) => (
        <TabsContent key={platform} value={platform}>
          {children(commands[platform]!)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
