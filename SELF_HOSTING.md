# Customized self-hosting guide

Deploy the API, web app, and database from this customized checkout. For Chinese instructions, see [部署指南](docs/deployment.zh.md). The [customization policy](docs/customization.md) covers disabled telemetry, distribution sources, and upstream synchronization.

The [integrated application image guide](docs/integrated-image.md) covers the personal deployment with password sign-in and local uploads, as well as deployments with external PostgreSQL and object storage. Use this guide for a split API and web deployment.

## Architecture

| Component | Runs where | Source |
| --- | --- | --- |
| API and WebSocket server | Docker server | `server/` |
| Web application | Docker server | `apps/web/` |
| PostgreSQL | Docker server or your database service | Compose / Helm configuration |
| Electron Desktop and its bundled CLI | Execution computer | `apps/desktop/`, `server/cmd/multica/` |
| Standalone CLI / daemon | Additional execution computer | `server/cmd/multica/` |

Desktop and Docker can run on different computers. Agent tools and their sign-in state remain on the execution computer. Docker deployment does not install those tools on your laptop.

## Before you start

Use a checkout or source archive supplied by the customized version's maintainer. If a source repository is published later, obtain its URL from that maintainer. No replacement repository URL is assumed here.

Install Docker with the Compose plugin (`docker compose`), Git if using a checkout, Make, and OpenSSL. Source builds download base images and package dependencies, so the Docker host needs access to their registries. This is separate from downloading an upstream Multica application image.

## Build and start from this checkout

Run at the repository root:

```bash
make selfhost-build
```

On the first run, this target creates `.env` from `.env.example` if it is missing and generates `JWT_SECRET`, `POSTGRES_PASSWORD`, and `MULTICA_VCS_SECRET_KEY`. It builds `multica-backend:dev` and `multica-web:dev` from this checkout, then starts PostgreSQL, backend, and frontend. Existing `.env` files and data volumes are reused.

Inspect an existing `.env` before deployment: copied example secrets are not replaced automatically. Set a sender address on a domain you own when enabling email delivery. Do not commit secrets.

Default host addresses in the Compose example:

- Web: `http://localhost:3000`
- API: `http://localhost:8080`
- Readiness: `http://localhost:8080/readyz`

These are server deployment defaults, not automatic Desktop connection defaults.

```bash
docker compose -f docker-compose.selfhost.yml ps
curl -fsS http://localhost:8080/readyz
docker compose -f docker-compose.selfhost.yml logs --tail=100 backend
```

A ready API reports database and migration readiness. `/health` proves liveness only. `/healthz` is an alias for readiness. Startup applies backend migrations automatically.

## Login

Open the deployed web app and use email verification. Configure SMTP or Resend for production; choose your own sender domain. If email delivery is not configured, the current backend prints generated codes in its container log. For private development only, `APP_ENV=development` and `MULTICA_DEV_VERIFICATION_CODE=888888` enable a fixed code; production ignores that fixed code.

Google sign-in is optional and needs your deployment's own OAuth credentials and callback URL. See [authentication configuration](SELF_HOSTING_ADVANCED.md#google-oauth-optional).

## Configure Electron Desktop

Use a customized Electron package built from the reviewed source or distributed by your maintainer. The original project's packages do not contain this version's changes.

Copy [apps/desktop/desktop.example.json](apps/desktop/desktop.example.json) to `~/.multica/desktop.json` and edit it:

```json
{
  "schemaVersion": 1,
  "apiUrl": "http://localhost:8080",
  "appUrl": "http://localhost:3000"
}
```

Both addresses are required. Replace them with your reachable HTTPS addresses when Docker runs elsewhere. `localhost` means the computer running Desktop. Optional `wsUrl` overrides the WebSocket URL otherwise derived from `apiUrl`.

Restart Desktop after editing. Missing or invalid settings block connection. Desktop starts only its bundled customized CLI, uses an isolated profile for this API, and detects supported agent tools already installed on the machine. It does not download a replacement CLI or use a system CLI as a fallback.

Desktop updates, installer links, and help links remain disabled until their optional URLs are configured. See [all Desktop settings](docs/customization.md#desktop-service-configuration).

To produce a customized package later, use the repository's package scripts from a prepared development environment:

```bash
pnpm install --frozen-lockfile
pnpm --filter @multica/desktop package
```

Packaging requires Go and platform signing/build prerequisites. Configure your own distribution and update destination before publishing; an unsigned local package is not a verified release.

## Connect another execution computer

Build the CLI from the same reviewed customized source; see [CLI installation](CLI_INSTALL.md). After placing that binary on your PATH, connect it explicitly:

```bash
multica setup self-host \
  --server-url http://localhost:8080 \
  --app-url http://localhost:3000
multica daemon status
```

Use the server's reachable addresses, not these loopback examples, on a different computer. Do not use a bare `multica setup` or assume a pre-existing CLI profile points at this deployment. For SSH sessions, configure the URLs first and use `multica login --token` to enter a PAT interactively when browser callback login cannot reach the execution computer.

A supported agent CLI must be installed, signed in, and executable on this computer. Desktop users do not need a second Multica CLI installation for the managed runtime.

## Ports and remote access

Edit `.env` to change `PORT` (backend host port) and `FRONTEND_PORT`. Compose containers keep their internal ports. `BACKEND_PORT`, `API_PORT`, and `SERVER_PORT` are optional backend host-port overrides, in that order. `make` and Compose have different environment precedence; inspect effective settings with `docker compose -f docker-compose.selfhost.yml config` before applying changes.

The bundled Compose file binds application ports to `127.0.0.1`. For LAN or internet access, use a reverse proxy with TLS instead of exposing raw application and database ports. Configure your own addresses, for example:

```dotenv
FRONTEND_ORIGIN=https://app.example.com
MULTICA_APP_URL=https://app.example.com
MULTICA_PUBLIC_URL=https://api.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
LOCAL_UPLOAD_BASE_URL=https://api.example.com
```

Route API, auth, health, and WebSocket traffic as described in [advanced configuration](SELF_HOSTING_ADVANCED.md#reverse-proxy). Verify readiness from the execution computer. Configure SMTP, signup restrictions, and the appropriate storage URL before inviting users.

## Use images from your own registry

After your maintainer publishes customized images, select the exact reviewed tag in `.env`:

```dotenv
MULTICA_BACKEND_IMAGE=registry.example.com/your-team/multica-backend
MULTICA_WEB_IMAGE=registry.example.com/your-team/multica-web
MULTICA_IMAGE_TAG=custom-2026-01
```

The registry and tag above are placeholders. Both images must actually exist. Then:

```bash
make selfhost
```

`make selfhost` pulls the configured images. With the checkout's default local `:dev` tags and no published registry, use `make selfhost-build` instead. Neither target should be redirected to upstream application images.

## Kubernetes deployment (alternative)

Use the source chart at [deploy/helm/multica](deploy/helm/multica/). Publish customized images to your own registry, or import locally built images into every cluster node. A Docker image available on your workstation is not automatically available to Kubernetes.

Create the namespace and the Secret documented in [values.yaml](deploy/helm/multica/values.yaml), then:

```bash
helm upgrade --install multica ./deploy/helm/multica \
  --namespace multica \
  --set images.backend.repository=registry.example.com/your-team/multica-backend \
  --set images.frontend.repository=registry.example.com/your-team/multica-web \
  --set images.backend.tag=custom-2026-01 \
  --set images.frontend.tag=custom-2026-01
```

Replace placeholder registries/tags, ingress hostnames, TLS, storage class, and secret names with your own values. The chart defaults to local `:dev` images and `IfNotPresent`; a rollout restart does not select a new application version. No upstream OCI chart is needed. Set up an operator-owned chart registry separately if you want OCI distribution.

## Back up and upgrade

Before changing versions, back up PostgreSQL, uploaded files, and deployment secrets/configuration. Keep the source revision and image identifiers with the backup.

```bash
docker compose -f docker-compose.selfhost.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > multica-backup.sql
```

Use a new backup filename per upgrade. PostgreSQL backups do not include the `backend_uploads` volume. Protect both backups and secrets according to your deployment process.

For source deployments, move the checkout to a reviewed customized commit and run `make selfhost-build`. For registry deployments, select your new immutable customized image tag and run `make selfhost`. Do not pull the original repository's `main` or `latest` images over this edition. Upstream feature synchronization follows [the customization policy](docs/customization.md#synchronizing-upstream-features).

Verify `/readyz`, login, task execution, and attachments after the upgrade. Restoring an older image alone does not undo a database migration; assess schema compatibility or restore a matching backup before rollback.

> **Backend restarting with `password authentication failed for user "multica"` after an upgrade or a second `make selfhost`?** Installs first started by an older `make selfhost` or `make selfhost-build` initialized PostgreSQL with the default password instead of the generated `POSTGRES_PASSWORD` in `.env`, so the backend is rejected once the containers are recreated. Set the database password to the value in `.env`; this keeps your data:
>
> ```bash
> docker compose -f docker-compose.selfhost.yml up -d --wait postgres
> docker compose -f docker-compose.selfhost.yml exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -v role="$POSTGRES_USER" -U "$POSTGRES_USER" -d postgres' <<'SQL'
> \getenv pw POSTGRES_PASSWORD
> ALTER USER :"role" WITH PASSWORD :'pw';
> SQL
> ```
>
> Then restart the stack using the Compose files for your installation. For configured registry images (`make selfhost`):
>
> ```bash
> docker compose -f docker-compose.selfhost.yml up -d
> ```
>
> For locally built images (`make selfhost-build`), keep the build override so recovery uses your existing local images:
>
> ```bash
> docker compose -f docker-compose.selfhost.yml -f docker-compose.selfhost.build.yml up -d
> ```
>
> The command connects as `POSTGRES_USER` from `.env`. If you changed that value after the first start, put the original user name back first: PostgreSQL keeps the role it was initialized with. Do not run `docker compose down -v` to fix this: it deletes the database volume.

## Stop services

```bash
multica daemon stop
make selfhost-stop
```

Stop Desktop's managed runtime through Desktop or quit the app according to its daemon settings. Compose stop preserves data volumes. `docker compose down -v` deletes data and is not an ordinary shutdown or upgrade step.

## Telemetry and further configuration

Product analytics, crash reporting, anonymous reporting, and operational metrics are disabled in this edition. `/metrics` and `/health/realtime` are unavailable; environment variables cannot enable them. Task history, costs, token usage, runtime liveness, and ordinary application logs remain functional.

See [advanced configuration](SELF_HOSTING_ADVANCED.md), [CLI and daemon reference](CLI_AND_DAEMON.md), and [the customization policy](docs/customization.md).
