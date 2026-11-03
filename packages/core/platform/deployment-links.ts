export interface DeploymentLinks {
  docsUrl?: string;
  changelogUrl?: string;
  downloadUrl?: string;
  communityUrl?: string;
  feedbackUrl?: string;
  runtimeReleaseUrl?: string;
  cliInstallUrl?: string;
  cliInstallWindowsUrl?: string;
}

let links: Readonly<DeploymentLinks> = Object.freeze({});

// Platform configuration is installed once before rendering the application.
export function configureDeploymentLinks(value: DeploymentLinks): void {
  links = Object.freeze({ ...value });
}

export function getDeploymentLinks(): Readonly<DeploymentLinks> {
  return links;
}
