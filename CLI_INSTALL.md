# Customized CLI installation

Use the standalone CLI to work from a terminal or connect another execution computer. Desktop already bundles its own customized CLI.

## Install and connect with the wizard

Run the installer on the computer where the CLI will run. Have the address of your running Multica deployment and a Multica account ready. The wizard uses Chinese prompts and installs the latest stable CLI from this customized repository.

### macOS and Linux

```bash
curl -fsSLo multica-cli-install.sh https://raw.githubusercontent.com/wsshow/multica/main/scripts/install.sh \
  && MULTICA_RELEASE_REPOSITORY=wsshow/multica bash multica-cli-install.sh --setup
```

### Windows PowerShell

```powershell
$env:MULTICA_RELEASE_REPOSITORY = 'wsshow/multica'
$env:MULTICA_MODE = 'setup'
powershell.exe -NoProfile -Command "irm 'https://raw.githubusercontent.com/wsshow/multica/main/scripts/install.ps1' | iex"
```

1. Enter the address you use to open Multica in a browser, including `http://` or `https://`. Press Enter for `http://localhost:8080` when the CLI and the default personal deployment run on the same computer. For another computer, use an address reachable from the CLI.
2. For a personal deployment, press Enter again to use the same address for the API. For a split deployment, enter the separate API address.
3. Sign in when your browser opens. The CLI starts the local runtime after sign-in. Over SSH, follow any port-forwarding instructions printed by the CLI.

After a new Windows installation, reopen PowerShell to pick up the updated PATH. To run agent tasks, install and sign in to a supported agent tool on the execution computer.

## Instructions for an AI agent

Ask the agent to read `CLI_INSTALL.md` and `docs/customization.md` from the current customized checkout. Give it your API and web app URLs. Do not ask it to fetch instructions or binaries from the original repository.

Check the binary's source revision before reusing an existing installation. A matching product name or version string alone does not prove it contains these customizations.

## Build the CLI from this checkout

Install the Go toolchain required by `server/go.mod`. At the repository root:

```bash
go -C server build -o bin/multica ./cmd/multica
./server/bin/multica version
```

On Windows, use `go -C server build -o bin/multica.exe ./cmd/multica` and run `.\server\bin\multica.exe version` from PowerShell. These commands build the CLI, not Docker services or an Electron package.

Keep using the explicit binary path, or copy this built artifact into a directory you control on your PATH. Check which binary your terminal resolves before continuing. Do not silently select an older system-installed CLI.

## Connect to your deployment

If you installed the binary separately, put it on PATH and pass your deployment's API and web addresses. For a personal deployment, use the same address for both flags.

```bash
multica setup self-host \
  --server-url http://localhost:8080 \
  --app-url http://localhost:8080
multica auth status
multica daemon status
```

In PowerShell, put the same setup command on one line. Use reachable HTTPS URLs when the service is on a different computer. `localhost` always refers to the execution computer.

For a named profile, pass `--profile <name>` to setup and to later commands. Do not use a bare `multica setup`: the standalone CLI retains upstream command modes, and that mode does not select this self-hosted deployment.

On a headless computer, configure `server_url` and `app_url` first, create a PAT in your own web app's settings, and enter it interactively:

```bash
multica config set server_url https://api.example.com
multica config set app_url https://app.example.com
multica login --token
multica daemon start
```

Enter the token at the prompt to keep it out of your shell history.

## Verification and troubleshooting

- Check `multica auth status` and `multica daemon status`.
- Verify the target API with `/readyz` from this computer; `/health` is a liveness check.
- View daemon logs with `multica daemon logs`.
- If a tool is missing, confirm its command is on PATH and has completed its own sign-in.
- If Desktop cannot find its bundled CLI, rebuild or reinstall your maintainer's customized Electron package. Do not repair it with an upstream download.

## Updates and optional distribution

The installers can update the standalone CLI without repeating sign-in. Run the shell installer without `--setup`, or run the PowerShell installer with `MULTICA_MODE` set to `default`. Update a Desktop-managed CLI by replacing the customized Desktop package.

The installers require an explicit `MULTICA_RELEASE_REPOSITORY`. If you publish your own customized CLI, supply the repository that contains its release archives and checksums. The CLI updater supports mirrors via `MULTICA_RELEASE_API_BASE_URL` and `MULTICA_RELEASE_DOWNLOAD_BASE_URL`. The shell installer can use your own Homebrew package when you set `MULTICA_HOMEBREW_PACKAGE`. See [Self-Hosting](SELF_HOSTING.md) and [the customization policy](docs/customization.md).
