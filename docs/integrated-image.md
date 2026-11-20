# Integrated application image

[中文版](integrated-image.zh.md)

The image combines the Go backend, Next.js standalone web server, and nginx in one application container. Choose a personal deployment for one owner with local files and a managed PostgreSQL service, or an external-services deployment for PostgreSQL, S3-compatible storage, and email-code or Google sign-in. The existing split deployment remains available in [SELF_HOSTING.md](../SELF_HOSTING.md).

## Personal deployment

Install Docker Compose 2.30+, Bash, and curl. Run this command where you want to keep the installer. The script installs the latest stable release by default and uses Chinese prompts.

```bash
curl -fsSLo multica-personal.sh https://raw.githubusercontent.com/wsshow/multica/main/scripts/install-personal.sh && bash multica-personal.sh
```

On the first interactive install, press Enter to use port `8080`, or enter a different port. At the database and attachments prompt, press Enter to use the bundled PostgreSQL and local attachments, then choose a Redis option. Choose customization to set the database, attachments, and Redis from the menu. Open the address printed in the terminal, enter the one-time setup code, and create your owner account. Docker volumes retain the bundled database, local attachments, and signing keys.

Redis is disabled by default. Automatic deployment starts Redis on a private Compose network. Its temporary data is cleared when the Redis container stops. To connect an existing service, enter a `redis://` or `rediss://` URL reachable from the app container. Automatic deployment requires a release that includes the Redis Compose configuration.

Run the installer again to check the latest stable release. If the version changes, you can back up before upgrading, upgrade immediately, or cancel. For unattended upgrades, use `bash multica-personal.sh install --yes`. Use `bash multica-personal.sh up` to start the selected version without checking for updates.

| Command | Action |
| --- | --- |
| `bash multica-personal.sh --help` | Show commands |
| `bash multica-personal.sh configure` | Interactively set the host port, PostgreSQL, attachment storage, or Redis |
| `bash multica-personal.sh setup-code` | Read the current code before creating the owner |
| `bash multica-personal.sh reset-password` | Reset the owner's password |
| `bash multica-personal.sh status` | Show service status |
| `bash multica-personal.sh logs` | Follow application logs |
| `bash multica-personal.sh stop` | Stop services and keep data |
| `bash multica-personal.sh backup multica.tar` | Archive the managed database, local uploads, and keys |
| `MULTICA_PERSONAL_VERSION=vX.Y.Z bash multica-personal.sh restore multica.tar` | Restore on a fresh host using the matching version, then run `up` |

The installer stores deployment files in `${XDG_DATA_HOME:-$HOME/.local/share}/multica-personal`. The wizard saves the port and external service settings for the next `up`. Back up and migrate your data before switching databases or attachment storage. You can also edit `.env.integrated.personal` in this directory or set `INTEGRATED_PERSONAL_ENV_FILE` to use another path. Operator-supplied keys, environment settings, and external services need separate backups.

For an unattended install, use `bash multica-personal.sh install --yes`. Set `INTEGRATED_HOST_PORT` to select a port or prepare the external service settings in advance.

### Start from source or a selected image

From the customized checkout, run either command below.

```bash
# Start a published version from your Docker Hub repository.
make integrated-personal INTEGRATED_IMAGE=your-namespace/multica:X.Y.Z

# Or build and start from this checkout using Docker Buildx.
make integrated-personal-build
```

Open the address printed at startup, `http://localhost:8080` by default. Use the one-time code from the same terminal to create your owner account. Multica creates a Personal workspace and uses your username and password for subsequent logins. Signing keys, uploads, and the database are persisted in Docker volumes. The bundled database is reachable by the app through a private Unix socket.

After a source build, run `make integrated-personal` to start the same local image again.

| Command | Behavior |
| --- | --- |
| `make integrated-personal-setup-code` | Read the current code before the owner is created |
| `make integrated-personal-reset-password` | Generate and print a replacement password and the owner username |
| `make integrated-personal-status` | Check container health |
| `make integrated-personal-logs` | Follow app logs |
| `make integrated-personal-stop` | Stop the app and bundled services, keeping the database and attachment volumes |
| `make integrated-personal-backup BACKUP_FILE=multica.tar` | Archive the database, local uploads, and keys, pausing the app during the snapshot |
| `make integrated-personal-restore BACKUP_FILE=multica.tar INTEGRATED_IMAGE=…` | Restore the archive to a fresh personal instance before starting it |

The default setup needs no environment file. For optional services, copy [the personal example](../.env.integrated.personal.example) to `.env.integrated.personal` and fill in the applicable settings. Use `MULTICA_MANAGED_REDIS=true` for bundled Redis or `REDIS_URL` for an existing service. Select storage before first use or move your existing data separately.

The backup and restore commands cover the bundled database, local files, and generated keys. Restore into fresh volumes using the same application image version and PostgreSQL generation as the backup, then start the app. Keep any operator-provided environment file and keys with the archive and back up external PostgreSQL or S3 separately.

Set `INTEGRATED_HOST_PORT` to change the published port. For remote use, set `MULTICA_PUBLIC_URL` to the externally reachable origin in the personal configuration file and point your TLS proxy to the published port. `INTEGRATED_BIND_ADDRESS` controls which host address publishes that port.

## External-services architecture

```mermaid
flowchart LR
    clients[Browser / Electron / CLI] --> edge[Operator TLS proxy]
    edge --> gateway
    subgraph image[One application container]
        gateway[nginx :8080] --> web[Next.js 127.0.0.1:3000]
        gateway --> api[Go 127.0.0.1:8081]
        web --> api
    end
    api --> postgres[External PostgreSQL]
    api -. optional .-> redis[External Redis]
    api --> objects[External S3-compatible storage]
    api --> email[Operator mail service]
```

The public URL is an explicit HTTP(S) origin without a path prefix. Container port `8080` is the only published application entry point. TLS terminates at the operator's outer proxy; HTTP is supported for a LAN deployment. Go and Node bind to loopback. Desktop explicitly sets both `apiUrl` and `appUrl` to the same reachable public origin. Agent tools and execution stay on Electron/CLI computers; the image does not start an executor.

Start with one application replica. Clustering still requires review of the existing Redis relay, channel leases, and background-job configuration. Plugin surfaces retain their separate cookie-free origin, which can route through the same gateway.

## External-services configuration and deployment

Prerequisites: Docker, Compose 2.30+, Bash, and OpenSSL. Node and Go are not needed on the deployment computer. Obtain this customized checkout and select an available image version from the operator's Docker Hub repository.

```bash
make integrated-init
# Edit .env.integrated, then replace the image placeholder below.
make integrated INTEGRATED_IMAGE=your-namespace/multica:X.Y.Z
```

The command pulls the selected image, starts the single application service, and waits for combined readiness. It never builds locally when an image is missing. The default host binding is `127.0.0.1:8080`, suitable for an outer TLS proxy. Use `INTEGRATED_HOST_PORT` to change the host port, or explicitly select `INTEGRATED_BIND_ADDRESS` for direct LAN access. These settings do not change the internal ports.

The [minimal example](../.env.integrated.example) contains:

| Input | Requirement |
| --- | --- |
| `MULTICA_PUBLIC_URL` | Reachable public origin; no official or localhost default |
| `DATABASE_URL` | External PostgreSQL connection URL and database, with the permissions required by the existing migrations |
| `JWT_SECRET` | Generated once by initialization; preserve across upgrades |
| `S3_BUCKET`, `S3_REGION` | Required external object storage; no local-upload fallback |
| `AWS_ENDPOINT_URL` | Required for a custom S3-compatible endpoint; omit for AWS S3 |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Supply both or use the existing AWS credential chain |
| `REDIS_URL` | Optional for one instance; Redis-backed auth rate limits are disabled when omitted |
| SMTP settings and sender | Configure production email-code login; Google OAuth or configured Resend delivery are alternatives |
| `MULTICA_VCS_SECRET_KEY` | Initialized when the VCS feature is enabled; preserve it with the database backup |
| `MULTICA_WEIXIN_SECRET_KEY` | Optional WeChat QR connections; generate a persistent key with `openssl rand -base64 32` |

Configuration is raw `KEY=value` data: use no surrounding quotes or shell expansion. Literal `$` and spaces in passwords are preserved. URL credentials must use URL encoding where needed. `.env.integrated` is never included as Make syntax or executed by a shell. Initialization preserves existing values, including existing keys. Use `INTEGRATED_ENV_FILE` to select another operator-owned file.

External service addresses must be reachable from the container. `localhost` inside a database or storage URL refers to the application container itself, not the Docker host. Use your service's network hostname or reachable IP; host-network mappings can be supplied through an operator Compose override.

The launcher derives the app, daemon, CORS, and callback URLs from the one public origin. Conflicting URL overrides fail rather than silently selecting one. Browser API and WebSocket URLs are same-origin build settings; keep `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` empty. Internal `REMOTE_API_URL` and per-process ports are controlled by the launcher.

Use the [advanced example](../.env.integrated.advanced.example) for optional integrations and infrastructure settings. Behind an outer proxy, configure `MULTICA_GATEWAY_TRUSTED_PROXIES` with that proxy's actual IP/CIDR to retain client IPs. The gateway normalizes forwarding headers and the backend trusts only the loopback gateway. Cookie domain is normally left empty. Supply a sender you operate for SMTP/Resend. Fixed development login codes are rejected.

## Make commands

| Command | Behavior |
| --- | --- |
| `make integrated-init` | Prepare configuration and initial secrets without starting services |
| `make integrated INTEGRATED_IMAGE=…` | Pull, start, and wait for the published application image |
| `make integrated-status INTEGRATED_IMAGE=…` | Show container and health status |
| `make integrated-logs INTEGRATED_IMAGE=…` | Follow application logs |
| `make integrated-stop INTEGRATED_IMAGE=…` | Stop the application, preserving configuration and external data |
| `make integrated-build` | Explicit maintainer build from this checkout; does not start services |

The existing `selfhost` commands retain their split deployment. Run integrated and development targets in separate Make invocations. `INTEGRATED_BUILD_IMAGE` selects the maintainer build's local tag; it is separate from the explicitly selected deployment image. Do not run the build target when using a published image.

## Runtime behavior

Tini is PID 1. A Node launcher uses the runtime already present in the web image to validate configuration, generate nginx configuration, and supervise process groups. It runs the existing migrator first, preserving the database retry budget, migration advisory lock, and cancellation behavior. It then starts Go, checks backend readiness, starts Next.js, and starts the gateway after web readiness. Long-running migration DDL is not assigned a blanket connection-retry timeout.

Unexpected exit of any critical component terminates its siblings and fails the container. Docker's restart policy restarts the application as a unit. Normal stop drains the gateway briefly and sends termination to Go/Node, with a bounded deadline and process-group cleanup. `MULTICA_CONTAINER_SHUTDOWN_TIMEOUT` defaults to 60 seconds; the Compose grace period defaults to 75 seconds. If increasing shutdown holds or timeouts, increase `INTEGRATED_STOP_GRACE_PERIOD` as well.

The gateway sends `/api/*`, `/v1/*`, backend auth, browser/daemon WebSockets, uploads, and plugin surfaces to Go. `/auth/callback` and `/auth/hg-sso/callback` and their descendants remain Next.js routes. Other pages and compiled assets go to Next.js. WebSocket upgrade headers, unbuffered streaming, and the backend's 100 MiB request-body allowance are preserved.

`/health` is backend process liveness. Public `/readyz` and `/healthz` check nginx, the dynamic Node readiness route, and Go database/migration readiness. Docker healthcheck uses this combined endpoint. An unhealthy status alone does not restart a plain Docker container. Redis/S3 operations are not repeatedly performed by health probes. `/metrics` and `/health/realtime` remain unavailable.

S3 initialization errors stop startup rather than selecting local storage. Configuration validation does not establish bucket permissions; validate uploads using the operator's actual bucket before opening service to users. Attachment delivery defaults to the existing proxy mode, allowing private object-storage endpoints without exposing them to clients. Existing direct/CDN modes remain explicit options.

## Data and upgrades

All application processes run as UID/GID 1001. Temporary proxy/upload files use `/tmp`; Next.js caches use the writable container layer. These are disposable. Read-only root filesystem support is not claimed by the deployment example. Mount custom CAs or local plugin sources separately if configured.

Durable resources are PostgreSQL, object storage, and the operator's configuration and encryption keys. Back them up together, record the current image digest, select a new image version, and run `make integrated` again. Recreating the application must not rotate keys or lose attachments. An image rollback does not undo database migrations; confirm schema compatibility or restore matching backups. The image retains existing migration/maintenance tools for deliberate operator use.

## GitHub build and Docker Hub release

[The integrated workflow](../.github/workflows/integrated-image.yml) validates ordinary main/PR changes and is called by [Release](../.github/workflows/release.yml) for version tags. Configure these repository settings:

| Setting | Location | Value |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | Actions Variables | Docker Hub login account |
| `DOCKERHUB_IMAGE` | Actions Variables | Explicit `namespace/repository` |
| `DOCKERHUB_TOKEN` | Actions Secrets | Token allowed to push to that repository |

Buildx Bake reuses the existing backend and web Dockerfiles at one commit and platform. The assembly uses their compiled outputs; Go/pnpm compilation is not duplicated in the assembly Dockerfile. AMD64 and ARM64 use native runners. BuildKit caches build stages; the runtime includes no compiler or user credentials. This keeps customization in packaging with only listener/storage startup changes and the web readiness route in application code.

Main and pull request checks build the image on AMD64. Releases also build on native ARM64. Each build runs the disposable [external-services smoke fixtures](../docker/integrated/compose.smoke.yml), which exercise assets, SMTP login, object storage, WebSockets, readiness, and shutdown. The AMD64 job also checks [personal setup, persistence, and switching bundled Redis on and off](../docker/integrated/personal-smoke.sh) against the actual personal Compose configuration. The workflow runs packaging and telemetry checks before assembling the image.

New versions are published only from version tags. Each tested image is exported and uploaded by digest without recompiling or creating a temporary tag. Both native jobs must succeed before their digests become a shared `X.Y.Z` manifest. A successful stable version also updates `latest`; prereleases do not. The public repository retains release versions and `latest`, with the source commit recorded in image labels and workflow records. Existing GHCR split-image publication remains separate. A source commit alone does not trigger a Docker Hub release.

To remove internal tags left by the previous publisher, run **Clean Docker Hub tags** with the current stable version. It verifies digest-only uploads using the existing AMD64 and ARM64 images, then removes only internal aliases already covered by the stable manifest. The version and `latest` remain unchanged. This maintenance workflow requires tag deletion permission on `DOCKERHUB_TOKEN`; ordinary releases only require read/write permission.
