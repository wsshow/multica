import { configureDeploymentLinks } from "@multica/core/platform/deployment-links";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getCliInstallCommands,
  CliInstallCommand,
} from "./cli-install-command";

const LABELS = {
  group: "Choose your platform",
  macosLinux: "macOS / Linux",
  windows: "Windows",
};

function renderSwitch() {
  return render(
    <CliInstallCommand labels={LABELS}>
      {(command) => <code>{command}</code>}
    </CliInstallCommand>,
  );
}

describe("CliInstallCommand", () => {
  it("offers no upstream installer without an explicit source", () => {
    configureDeploymentLinks({});
    renderSwitch();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(getCliInstallCommands()).toEqual({});
  });

  it("defaults to the macOS / Linux installer", () => {
    renderSwitch();

    expect(
      screen.getByRole("tablist", { name: LABELS.group }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "macOS / Linux" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText(getCliInstallCommands().macosLinux!),
    ).toBeInTheDocument();
    expect(screen.queryByText(getCliInstallCommands().windows!)).toBeNull();
  });

  it("hands the Windows command to the row when that tab is picked", async () => {
    const user = userEvent.setup();
    renderSwitch();

    await user.click(screen.getByRole("tab", { name: "Windows" }));

    expect(screen.getByRole("tab", { name: "Windows" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(getCliInstallCommands().windows!)).toBeInTheDocument();
    expect(screen.queryByText(getCliInstallCommands().macosLinux!)).toBeNull();
  });

  // A real tablist: arrow keys move between platforms without a click.
  it("switches platform with the arrow keys", async () => {
    const user = userEvent.setup();
    renderSwitch();

    await user.click(screen.getByRole("tab", { name: "macOS / Linux" }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText(getCliInstallCommands().windows!)).toBeInTheDocument();
  });
});

beforeEach(() => { configureDeploymentLinks({ cliInstallUrl: "https://downloads.example.test/install.sh", cliInstallWindowsUrl: "https://downloads.example.test/install.ps1", runtimeReleaseUrl: "https://updates.example.test/runtime.json" }); });
