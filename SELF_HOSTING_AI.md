# Customized self-hosting instructions for agents

Read the current checkout's `AGENTS.md`, `docs/customization.md`, and `SELF_HOSTING.md` before deployment. Use this customized source or artifacts explicitly supplied by its maintainer. Do not clone the original project, install its Homebrew package, fetch its remote installer, or replace customized application images with upstream releases.

These are instructions for a separately authorized deployment. Editing documentation does not authorize running these commands, starting Docker, installing tools, or accessing user-installed agent accounts.

## Establish the inputs

Confirm the customized checkout, intended deployment host, API URL, web app URL, and whether the maintainer has published its own images. There is no configured public release repository for this edition. Preserve existing `.env` files and volumes; never overwrite secrets just to follow an example.

## Source deployment

From the customized repository root:

```bash
make selfhost-build
docker compose -f docker-compose.selfhost.yml ps
curl -fsS http://localhost:8080/readyz
```

The first command creates `.env` and initial secrets only when the file is missing, builds this checkout's backend/web images, and starts the stack. Read the effective port configuration before using the example readiness URL. Use `make selfhost` only for explicitly configured, already published customized images.

## Connect the execution computer

Desktop users configure `~/.multica/desktop.json` using `apps/desktop/desktop.example.json` and restart their customized Electron app. Both `apiUrl` and `appUrl` are required; Desktop uses only its bundled customized CLI.

For a standalone execution computer, build the CLI following `CLI_INSTALL.md`. After selecting that binary explicitly, connect it to the operator-provided addresses:

```bash
multica setup self-host --server-url http://localhost:8080 --app-url http://localhost:3000
multica daemon status
```

Replace loopback examples with reachable addresses when the execution computer and Docker host differ. Install and authenticate third-party agent tools only when authorized. Ordinary verification must not execute real user agent tools or consume their accounts.

## Verify and stop

Check API readiness, web login, runtime registration, and the intended task flow. Diagnose using backend container logs and daemon logs. Do not claim end-to-end success from a successful image build or `/health` alone.

```bash
multica daemon stop
make selfhost-stop
```

These preserve Compose data. Destructive cleanup such as deleting volumes requires separate intent. Back up the database, uploads, and secrets before upgrades. Use reviewed customized revisions and the upstream synchronization policy; never substitute upstream `latest` images as an upgrade.
