# Integrated application image design

[中文版](integrated-image.zh.md)

Status: implementation plan. The integrated image, deployment files, and checks described below do not exist yet. Current releases provide separate backend and web images; keep using the [existing deployment guide](../SELF_HOSTING.md) until the integrated image passes its release checks.

## Deployment contract

Ship one application image containing the existing Go server, Next.js standalone application, and an internal nginx gateway. PostgreSQL, Redis, S3-compatible object storage, and production email delivery are operator-managed services. Redis remains optional for a single application instance.

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
    api --> email[Operator email delivery]
```

- Publish only container port `8080`. External TLS terminates at the operator's proxy; a LAN deployment may use HTTP directly.
- Use one public origin, configured explicitly through `MULTICA_PUBLIC_URL`, without a path prefix. Root-path deployment is the initial supported layout.
- Desktop still explicitly configures `apiUrl` and `appUrl`; both can point to this public origin. No desktop configuration or connection fallback changes are needed.
- Agent tools and execution remain on Electron/CLI execution computers. Do not start a daemon in the application container or mount the host Docker socket.
- Initially document one application replica. Additional replicas require the existing Redis relay, channel lease, and background-job settings to be reviewed; combining the image does not establish a new clustering contract.
- Preserve the existing split images and Compose deployment. Do not replace them when introducing this image.

## Build and source reuse

Use Docker Buildx Bake named contexts to assemble outputs from the existing `Dockerfile` and `Dockerfile.web` at the same checkout and target platform. A new assembly Dockerfile consumes these contexts; it does not duplicate Go compilation, pnpm installation, or Next.js build instructions. Bake supports [using another target as a build context](https://docs.docker.com/build/bake/contexts/#using-a-target-as-a-build-context).

Use the existing web runner as the assembly base, inheriting its exact Node version, security floors, standalone/static/public assets, and `LICENSE`/`NOTICE`. Add nginx, Bash, Tini, CA certificates, timezone data, and the Go server, migration and maintenance tools, and migrations from the backend context. Finish as an unprivileged user even if package installation needs root during the image build. Do not copy build toolchains or source-tree credentials. The assembly must fail if either named context is missing; it must not resolve an unqualified application image from a registry instead.

Build public browser API/WebSocket settings empty, so clients use same-origin paths. Only release metadata such as the application version is baked in. Deployment URLs, passwords, and service credentials are runtime configuration. Application startup never downloads another Multica binary or client bundle.

Proposed release name: `ghcr.io/<repository-owner>/multica:<release-tag>`, alongside the existing backend/web images. The actual owner comes from Actions. A tag or digest must be explicitly selected by the deployment; this name is not a currently available artifact.

## Small configuration surface

Provide a dedicated `.env.integrated.example`, separate from the full development `.env.example`. Use existing environment names wherever possible:

| Group | Operator input | Behavior |
| --- | --- | --- |
| Public address | `MULTICA_PUBLIC_URL` | Required HTTP(S) origin; no official or localhost default |
| Database | `DATABASE_URL` | Required external database; reuse existing migration and connection-retry behavior |
| Authentication | `JWT_SECRET` | Required persistent random secret; generate during deployment preparation |
| Object storage | `S3_BUCKET`, `S3_REGION`; `AWS_ENDPOINT_URL` for a custom endpoint | External storage is required in this deployment mode; no local-upload fallback |
| Storage credentials | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, or the existing AWS credential chain | A partially supplied key pair is an error; never bake credentials into the image |
| Redis | `REDIS_URL` | Optional; omission selects single-node realtime and disables Redis-backed authentication rate limiting |
| Email | SMTP settings and `SMTP_FROM_EMAIL`, or configured Resend credentials and sender | Document a working delivery configuration for production email-code login |

Keep TLS/CA options, Redis cluster configuration, proxy trust, attachment delivery, signup controls, and integrations in an advanced example/reference. Preserve their existing behavior. Do not make a working production email login depend on finding a code in container logs, and do not prefill an upstream sender address.

An initialization command generates secrets once into an operator-owned file; it never overwrites existing values. `MULTICA_VCS_SECRET_KEY`, plugin keys, and other integration secrets are generated/configured when their features are enabled. Keep them across upgrades independently of the container filesystem. Do not derive unrelated encryption keys from `JWT_SECRET` or generate fresh keys on each startup.

The launcher translates the one public origin into the existing `FRONTEND_ORIGIN`, `MULTICA_APP_URL`, public daemon address, and same-origin CORS configuration. `REMOTE_API_URL` is fixed to the internal Go listener. Go and Node each receive their own port/listener settings; a shared `PORT` must not cause a collision. Conflicting public URL overrides produce a configuration error instead of selecting a hidden precedence rule. Browser `NEXT_PUBLIC_*` settings must not depend on runtime replacement of build-inlined values.

Pass environment files as data, never `source`/`eval` them. For the optional Compose example, use `env_file` with `format: raw` and document Compose 2.30+; this preserves literal dollar signs in credentials. Docker `--env-file` remains an alternative. Keep image/tag and host-port selection in the deployment command or Compose inputs, separate from application configuration. [Compose environment file behavior](https://docs.docker.com/reference/compose-file/services/#format)

## Gateway routing

Preserve paths, query strings, authorization/cookie headers, and response security headers. The routing contract is:

| Request | Destination |
| --- | --- |
| `/auth/callback` and descendants; `/auth/hg-sso/callback` and descendants | Next.js, before general auth routing |
| `/api`, `/api/*`, `/v1`, `/v1/*` | Go |
| Other `/auth` and `/auth/*` requests | Go |
| `/ws`, `/api/daemon/ws` | Go, with WebSocket upgrade support |
| `/uploads`, `/uploads/*`, `/plugin-surfaces/*` | Go; preserve existing links and host boundaries |
| `/health` | Existing Go process-liveness check |
| `/readyz`, `/healthz` | Integrated readiness through Next.js, described below |
| All other paths, including `/_next/*` | Next.js |

Explicitly forward WebSocket upgrade headers for browser and daemon connections, configure timeouts for their heartbeat behavior, and disable buffering on streaming responses. The gateway request-body limit must accommodate the backend's existing 100 MiB request limit; nginx's default upload limit must not shrink it. Verify range requests, attachment previews, and redirects. [nginx WebSocket proxying](https://nginx.org/en/docs/http/websocket.html), [proxy buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering)

Preserve the public host and scheme through the gateway. Accept client-IP forwarding only from explicitly trusted outer proxies, then send normalized forwarding headers to Go; Go trusts the loopback gateway. Do not trust arbitrary inbound forwarding headers or strip the actual client address, which would break origin checks and per-IP limits. Outer proxy trust is an advanced setting, empty by default.

Default attachment delivery to the existing `proxy` mode so object storage can stay on a private network. Do not make buckets public or rewrite stored historical object URLs. Existing direct/CDN delivery can be configured explicitly. Plugin surfaces still require a separate cookie-free origin; route that origin through the same gateway with its existing host boundary intact rather than collapsing it into the application origin.

## Startup, failure, and shutdown

Use Tini as PID 1 and a small Bash launcher to supervise the three application processes. Tini handles signal forwarding and orphan reaping; the launcher owns ordering, child exit detection, and bounded shutdown of each component's process group. Do not introduce a second service manager or independently restart a failed component. [Docker multi-process guidance](https://docs.docker.com/engine/containers/multi-service_container/), [Tini responsibilities](https://github.com/krallin/tini#tini---a-tiny-but-valid-init-for-containers)

1. Validate required configuration without printing secrets; prepare writable runtime/cache directories as an unprivileged user.
2. Run the existing migrator once. Preserve the shared startup retry budget, migration advisory lock, and cancellation behavior from `docker/entrypoint.sh`. Database/permission/migration failures stop startup; do not start an apparently working web page against an unavailable backend.
3. Start Go on loopback and wait for its existing `/readyz` within the startup deadline. Start Next.js on loopback, wait for its readiness handler, then start nginx in the foreground. Every wait must also detect child failure.
4. After startup, an unexpected exit of Go, Next.js, or nginx stops its siblings and exits the container with failure, even if the child's exit code was zero. Docker's restart policy handles restarting the application as a unit.
5. On `SIGTERM`/`SIGINT`, stop accepting gateway requests, bound the gateway drain, then terminate and wait for Go and Next.js. Preserve Go's existing worker shutdown. Force-stop remaining descendants only after the shutdown deadline. The Compose example supplies a grace period longer than that deadline; operator shutdown holds must also fit it.

The database retry budget is not a blanket timeout for migration DDL. Preserve long-running migrations and make the healthcheck start period configurable for them; process-readiness waits after migration must still be bounded.

Add a small explicit Go listener-host option: its current listener is `":" + PORT`, so publishing one port alone does not bind the internal API to loopback. Keep its existing default in the split deployment; the integrated launcher selects `127.0.0.1`. Do not add frontend proxying to the Go business router.

The existing storage constructor can return nil and cause a local-storage fallback. The integrated launcher rejects missing S3 configuration. Shared server initialization must also stop if explicitly configured S3 fails to initialize; split deployments can still select local storage when S3 is not configured. Configuration validation alone is not proof of bucket permissions. Do not require broad bucket-list permissions or write test objects on every startup/health probe.

## Health and storage contract

Add a dynamic, uncached Next.js `/readyz` route that checks the internal Go `/readyz` with a short deadline. nginx forwards `/readyz` and its `/healthz` alias there. A successful request through the public container port therefore verifies gateway routing, the Node request handler, and Go's database/migration readiness. These path names are already reserved. Return a small status response without credentials or infrastructure details; keep the backend's existing response unchanged.

The image healthcheck calls this combined endpoint. Database or frontend failure marks the container unhealthy. Health status alone does not restart a plain Docker container; process supervision and orchestration remain separate. Redis/S3 outages are reported through their affected feature errors rather than repeatedly writing objects or enlarging readiness into an integration test. [Docker healthcheck semantics](https://docs.docker.com/reference/dockerfile/#healthcheck)

Run all processes as an unprivileged user. Runtime configuration, proxy temporary files, multipart temporary files, and Next.js caches need writable space. Keep it ephemeral and document optional cache mounts; no business data or long-lived secret may rely on that space. Support and test a read-only root filesystem with the documented writable mounts before claiming that capability. Certificates and operator-supplied plugin sources may be mounted separately when needed.

Database contents, object storage, and operator-held environment/secrets are the durable state. Recreating the application container must not lose attachments, rotate keys, or reset accounts. Before upgrading, back up those resources and record the current image digest. Run forward migrations with the new image; rolling back an image does not undo database migrations. Retain the existing operational tools for deliberate maintenance, without automatically running backfills outside the current migration contract.

## Delivery and acceptance

Implementation should add an assembly Dockerfile and Bake target, `docker/integrated/` launcher/gateway/healthcheck files, the small web readiness route and Go listener option, a one-service Compose example, and minimal/advanced environment examples. Storage initialization must enforce the strict behavior above. Existing split-image entrypoints remain unchanged. Tests live beside the behavior they verify.

Build and smoke-test the image in GitHub Actions for `linux/amd64` and `linux/arm64`, using one reviewed commit for both frontend and backend. Preserve current Go vulnerability checks, telemetry checks, immutable release tags, source/version labels, and the repository's release process. Publish the integrated manifest/tag only after both architectures pass; keep the last validated `latest` on failure. Do not publish mixed frontend/backend versions or combine images selected by floating tags. No local application build or packaging is part of this design task.

Required release evidence:

- Missing/invalid public URL, database configuration, JWT secret, or S3 configuration fails with a redacted, actionable error. Credentials containing spaces, `$`, and URL-encoded delimiters survive loading.
- Database startup delay, authentication failure, failed migration, and cancellation during migration produce the expected startup/exit behavior. Preserve migration locking rather than creating a new lock.
- Browser login/logout, OAuth callback routing, CSRF-protected writes, generated public links, and Desktop/CLI self-host setup work through the single public origin. Test HTTP LAN and HTTPS proxy deployment, including forwarded client IPs.
- Browser and daemon WebSockets stay connected and reconnect; streaming output arrives incrementally. Test near-limit uploads, authenticated downloads, range requests, and previews against an external test object store.
- Missing S3 never stores uploads locally. Recreating the container preserves accounts, attachments, and configured encryption keys. Plugin surfaces, when enabled, remain on their cookie-free origin.
- Killing each critical child ends the whole container; graceful stop leaves no children running. The combined healthcheck fails when Node, Go, or the database is unavailable. An omitted Redis URL still supports the documented single-instance baseline and clearly reports disabled Redis-backed limits.
- Telemetry remains inert. No official Multica service, updater, installer, analytics SDK, metrics listener, or extra executor is introduced. Tests use fake executors rather than user-installed agent tools.

The first milestone is the assembly, startup lifecycle, and combined healthcheck. The second is the complete single-origin/attachment/authentication smoke suite. Only then add release publication and change the recommended deployment documentation. A design commit alone does not make the integrated image deployable.
