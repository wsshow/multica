# Customized CLI installation

Use the CLI built from this customized checkout, or an artifact published by its maintainer. The original project's Homebrew package, installers, and release binaries do not contain this edition's changes. Desktop already bundles its own customized CLI; a separate CLI is needed only for terminal use or another execution computer.

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

The commands below assume your customized `multica` is on PATH. Replace both addresses with your deployment's actual API and web URLs:

```bash
multica setup self-host \
  --server-url http://localhost:8080 \
  --app-url http://localhost:3000
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

Do not put token values directly in copyable command history. A supported third-party agent tool must also be installed and signed in on this computer; only install tools you intend to use.

## Verification and troubleshooting

- Check `multica auth status` and `multica daemon status`.
- Verify the target API with `/readyz` from this computer; `/health` is a liveness check.
- View daemon logs with `multica daemon logs`.
- If a tool is missing, confirm its command is on PATH and has completed its own sign-in.
- If Desktop cannot find its bundled CLI, rebuild or reinstall your maintainer's customized Electron package. Do not repair it with an upstream download.

## Updates and optional distribution

Until your maintainer configures a release repository, rebuild from a reviewed customized commit. Update a Desktop-managed CLI by replacing the customized Desktop package.

For independently distributed CLI binaries, set `MULTICA_RELEASE_REPOSITORY=your-team/your-custom-repository` only after that repository contains the expected artifacts and checksums. The value is a placeholder, not an existing configured repository. Optional mirrors use `MULTICA_RELEASE_API_BASE_URL` and `MULTICA_RELEASE_DOWNLOAD_BASE_URL`; they still need the configured repository's metadata and matching artifacts. An optional Homebrew source must be your own package selected with `MULTICA_HOMEBREW_PACKAGE`.

The local `scripts/install.sh` / `scripts/install.ps1` require an explicit release repository. They are optional distribution tools, not a substitute for building this unpublished edition. Review their target repository, images, and release assets before using or publishing them. See [Self-Hosting](SELF_HOSTING.md) and [the customization policy](docs/customization.md).
