import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CliSection } from "./cli-section";

vi.mock("../../i18n", () => ({
  useLocale: () => ({
    t: {
      download: {
        cli: {
          title: "Prefer the CLI?",
          sub: "For servers and headless setups.",
          installLabel: "Install",
          platformGroup: "Choose your platform",
          platformMacosLinux: "macOS / Linux",
          platformWindows: "Windows",
          startLabel: "Start daemon",
          copyLabel: "Copy",
          copiedLabel: "Copied",
        },
      },
    },
  }),
}));

const CONFIGURATION = {
  serverUrl: "https://api.example.test",
  appUrl: "https://app.example.test",
  cliInstallUrl: "https://downloads.example.test/install.sh",
  cliInstallWindowsUrl: "https://downloads.example.test/install.ps1",
};

const SETUP_CMD =
  "multica setup self-host --server-url https://api.example.test --app-url https://app.example.test";

describe("CliSection", () => {
  it("hides CLI instructions without configured public endpoints", () => {
    const { container } = render(<CliSection />);

    expect(container).toBeEmptyDOMElement();
  });

  it("wires configured installers and self-hosted setup into the command blocks", async () => {
    const user = userEvent.setup();
    render(<CliSection configuration={CONFIGURATION} />);

    await user.click(screen.getByRole("tab", { name: "Windows" }));

    expect(
      screen.getByText("irm 'https://downloads.example.test/install.ps1' | iex"),
    ).toBeInTheDocument();
    expect(screen.getByText(SETUP_CMD)).toBeInTheDocument();
  });

  it("omits the installation block when no installer is published", () => {
    render(
      <CliSection
        configuration={{
          serverUrl: CONFIGURATION.serverUrl,
          appUrl: CONFIGURATION.appUrl,
        }}
      />,
    );

    expect(screen.queryByText("Install")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByText(SETUP_CMD)).toBeInTheDocument();
  });
});
