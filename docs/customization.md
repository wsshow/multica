# Local customization and upstream updates

This checkout is an independent customized version of Multica. The original Git metadata was intentionally removed. Its new repository began on `main` without remotes or inherited history. Licenses, copyright notices, Go module paths, and source references remain intact.

## Telemetry boundaries

Upstream business code may continue calling the existing APIs. The following boundaries discard calls without queues, background observers, installation IDs, telemetry database writes, crash files, or network delivery:

| Boundary | Implementation |
| --- | --- |
| Product analytics and crash reports | `packages/core/analytics/index.ts`, `server/internal/analytics/client.go` |
| Google Analytics | `apps/web/config/google-analytics.ts`, `apps/web/lib/google-analytics.ts` |
| Activity and runtime inventory reporting | `packages/core/client-usage/`, desktop `platform/client-usage-reporter.tsx`, `ApiClient.upsertClientUsage`, `server/internal/handler/client_usage.go` |
| Self-host snapshot and member activity | `server/internal/selfhosttelemetry/worker.go`, `TaskService.RecordHumanDelegation` |
| Crash persistence and flush | desktop `main/freeze-breadcrumb.ts`, renderer `freeze-flush.ts` |
| Long-task observation and development recording | `packages/core/diagnostics/freeze-watchdog.ts`, `dev-recorder.ts`, views `dev-toolbar/use-dev-metrics.ts` |
| Prometheus and WebSocket operational statistics | `server/internal/metrics/noop.go`, `server/internal/metrics/inbox_read.go`, realtime and daemonws `metrics.go` |

`/metrics` is unavailable; `/health/realtime` returns 404. Configuration cannot enable these features, including when an older server returns an analytics key or an older client posts a usage report. Ordinary health checks and user-facing error recovery remain functional.

User-visible usage, token counts, costs, run history, failure reasons, runtime heartbeats, application logs, authentication, and integrations remain product features. Historical telemetry migrations and inert database queries remain so database upgrades and upstream merges retain their schema history. Existing historical data is not deleted automatically.

## Synchronizing upstream features

Keep customization concentrated in the boundaries above. Merge upstream business features with their call sites intact, and resolve boundary changes in favor of the no-op policy. Do not replace entire customized modules with upstream versions without reviewing newly added exports and initialization paths.

The first synchronization uses the separately checked-out official snapshot
`87ec077e5f56ff66342caef1df1638780acfdf2e` as an explicitly reviewed comparison
base. All 137 differences from the initial customized tree were classified
against this policy; subsequent customized commits remain intact. The original
checkout identity is still unknown. The first three-way result was computed
with `git merge-tree --merge-base` at that snapshot, rather than treating
unrelated histories as an ordinary merge or accepting one side wholesale.
The reconciliation merge has the previous customized head and official
`v0.8.0` as its parents. This establishes ancestry for subsequent merges;
it does not recover ancestry for the initial customized snapshot.
The [synchronization record](upstream-sync.json) contains exact source SHAs,
the difference classification, conflict decisions, and verification results.
Keep the original [comparison evidence](upstream-baseline.json) unchanged.

Reuse the long-lived `feikong/upstream-sync` branch for every synchronization.
`origin` is the customized repository and the only persistent remote. Fetch
official sources directly from `https://github.com/multica-ai/multica.git`
by URL for each synchronization; do not add an official remote.
Keep official tags under `refs/tags/upstream/` so they cannot collide with
customized release tags. The local `upstream/source` branch points only to
the last integrated official snapshot and never contains customized commits.
The `upstream/` names are local source references, not a configured remote.
On a fresh clone of `origin`, create `upstream/source` at the `upstream_commit`
recorded in `upstream-sync.json`; that commit is retained in the merge history.
This local branch is not copied by cloning `origin`.

After the previous synchronization has been merged into `main`, prepare the
next one with the following commands, replacing `vX.Y.Z` with the selected
official release tag:

```bash
git switch feikong/upstream-sync
git merge --ff-only main
git fetch --no-tags https://github.com/multica-ai/multica.git refs/tags/vX.Y.Z:refs/tags/upstream/vX.Y.Z
git log --oneline upstream/source..upstream/vX.Y.Z
git diff --stat upstream/source upstream/vX.Y.Z
git merge --no-ff --no-commit upstream/vX.Y.Z
```

Review changes and resolve conflicts individually, then complete the checks
below before committing. Follow the official API and product behavior;
do not add old-client adapters as part of an upstream sync. Preserve the
customization boundaries, independent release numbering, and CLI contract
version split. Update the synchronization record, version mapping, and
changelog. After the merge is verified, advance `upstream/source` to the
official tag. Open a PR from `feikong/upstream-sync` to `main`, preserve its
merge history, and retain the branch after merging. Do not squash or rebase
this synchronization PR: future merges need the recorded official ancestry.

Maintain this edition's independent release sequence and source provenance in
[the version mapping](version-mapping.md). Source synchronization does not
publish binaries or create a customized release tag.

After each synchronization:

1. Run `pnpm check:telemetry` to reject telemetry SDK dependencies and imports.
2. Run the analytics, client usage, Google Analytics, crash persistence/flush, self-host worker, and metrics regression tests. They verify inert behavior even with configured keys, active users, and callbacks.
3. Run typecheck, lint, frontend tests, and Go tests. Match the Node runtime selected in CI for frontend tests. Use the managed environment for the database, stop its application services while running database-backed Go tests, and start them afterwards for end-to-end tests so background dispatchers cannot consume test fixtures.
4. Review new outbound HTTP clients, script injection, startup workers, and reporting endpoints. The dependency check cannot detect every newly invented telemetry implementation.

## Distribution sources

Desktop development, builds, and packaging require Go to compile the CLI from this checkout. Desktop executes only that bundled CLI. A missing or unusable bundled CLI blocks local execution instead of downloading an upstream release or selecting a managed/PATH binary. The retained `ensureManagedCli` API always rejects replacement installation.

The desktop package no longer declares the original GitHub repository or publish target. Release CI explicitly supplies its current repository through `MULTICA_RELEASE_REPOSITORY`; the packaging script uses that value for the GitHub publisher and architecture-specific update channels. Local packaging without that setting does not inject publishing configuration. Container defaults select locally built `multica-backend:dev` and `multica-web:dev` images. Homebrew publication to the original organization has been removed.

The CLI updater and shell/PowerShell installers require `MULTICA_RELEASE_REPOSITORY=owner/repository`. They have no default release repository. `MULTICA_HOMEBREW_PACKAGE` optionally selects a separately configured Homebrew package. Desktop clients still require their own explicit update feed; the build's publishing destination does not enable client updates.

Historical changelogs, licenses, attribution, and source references may still identify upstream. Active deployment and installation guides use this customized checkout or operator-owned artifacts; upstream application installers and images are not a distribution source for this edition. Build from this checkout (`make build`, `make selfhost-build`) or use artifacts published from a reviewed tag in this repository. Never install upstream binaries over this customized version.

The Go vulnerability-scanning tool retains `golang.org/x/telemetry` as an indirect tooling dependency. It is not imported by the application. Required framework dependencies may likewise contain their own development tooling; this policy removes the application's telemetry implementations rather than rewriting installed third-party tools or user-installed agents.

## Integrated application image

The [integrated image guide](integrated-image.md) ([中文版](integrated-image.zh.md)) covers one application container with nginx, the existing Go backend, and Next.js. `make integrated-personal` starts a personal instance with local uploads, a Compose-managed PostgreSQL database, and password sign-in. `make integrated` uses its own raw `.env.integrated` for a deployment with external infrastructure. Both modes are isolated from development configuration. Release builds and verifies the image on both architectures before publishing to the explicitly configured Docker Hub repository. Existing split-image publication remains available. Keep configuration translation and process management in the packaging layer so upstream business features can continue to merge.

The [personal deployment installer](../scripts/install-personal.sh) lives in this public repository. It reads the latest stable release's `multica-personal-release.txt` asset, downloads deployment files from the recorded source commit, and starts the configured Docker Hub image by digest. This asset is required for stable release promotion. A fork can explicitly select its own publishing repository with `MULTICA_RELEASE_REPOSITORY`.

## Desktop service configuration

When Electron first opens without a connection file, enter the address of your integrated service. Desktop saves that address as both the API and web URL. For split deployments, copy `apps/desktop/desktop.example.json` to `~/.multica/desktop.json`, enter both URLs, and restart Desktop. The example uses port 8080 for the API and 3000 for the web app.

`schemaVersion: 1`, `apiUrl`, and `appUrl` are required. `appUrl` is the actual public web app URL used for browser login and share links; it is not guessed from the API hostname. Optional `wsUrl` defaults only to the configured API URL with the WebSocket scheme and `/ws` appended. Set it explicitly when a proxy exposes another socket path. When Docker runs on another computer, use a reachable hostname and publish the service through the deployment's reverse proxy; localhost refers to the desktop computer.

Development reads the same file unless endpoint variables are supplied. To override it, copy `apps/desktop/.env.example` to `.env.development.local` and set both `VITE_API_URL` and `VITE_APP_URL`; optional `VITE_WS_URL` overrides the socket URL. Partial overrides are rejected. No staging endpoints are committed.

Optional configuration fields:

- `updateUrl`: a self-managed generic Electron update feed. Without it, startup, periodic, manual check, download, and installation paths cannot use a packaged or inferred feed.
- `links.docsUrl`: documentation root; localized guide paths are appended.
- `links.changelogUrl`, `links.downloadUrl`, `links.communityUrl`, and `links.feedbackUrl`: operator-provided external help destinations.
- `links.cliInstallUrl` and `links.cliInstallWindowsUrl`: operator-hosted shell and PowerShell installers for additional computers. Without them, no upstream install command is offered.
- `links.runtimeReleaseUrl`: operator-hosted CLI release metadata returning `{ "tag_name": "v1.2.3" }`. Without it, runtime settings make no release lookup; Desktop-managed runtimes never make this lookup. Remote CLI updates also require their own `MULTICA_RELEASE_REPOSITORY` configuration.

Omit optional URLs to disable their links or requests. API authentication, daemon registration, tasks, and WebSockets use the explicitly configured deployment. Desktop writes both service and web URLs into its own CLI profile and pins its child environment to them; it never borrows another profile or a shell's server URL. The standalone CLI remains a separate entry point; Desktop always launches its bundled CLI with its own profile.

Shared help components also have no upstream link defaults. Other shells can install their own links with `configureDeploymentLinks` before rendering. Product integrations with Git providers and third-party agent services remain available.

## Web download CLI instructions

The web download page and homepage only request desktop release metadata when `MULTICA_RELEASE_REPOSITORY=owner/repository` is explicitly configured. Without it, no release lookup is made and no upstream artifact is offered.

The web download page only shows CLI instructions when public API and app URLs are configured. The API address comes from `MULTICA_DAEMON_SERVER_URL`, then `MULTICA_PUBLIC_URL`, then `NEXT_PUBLIC_API_URL`; the app address comes from `MULTICA_APP_URL`, then `FRONTEND_ORIGIN`. The internal Docker proxy address `REMOTE_API_URL` is never offered to CLI users. The setup command explicitly selects `self-host` and includes both addresses.

Set `MULTICA_CLI_INSTALL_URL` and/or `MULTICA_CLI_INSTALL_WINDOWS_URL` to operator-hosted customized installers to display the corresponding installation tabs. Without installers, only the self-host setup command is shown. Without public endpoints, the whole CLI section is hidden. The self-host Compose frontend forwards these settings; recreate it after changing them. For other web deployment modes, rebuild/restart according to the page cache and deployment configuration.

## Documentation website

The documentation sources and deployment instructions describe this customized edition. The docs website has no upstream repository, app, community, or canonical-site defaults. Copy `apps/docs/.env.example` to its ignored `.env.local` and supply only the destinations you operate:

- `DOCS_SITE_URL`: public origin used for canonical, hreflang, and sitemap URLs. Omit it to omit that absolute metadata and sitemap entries.
- `DOCS_APP_URL`: your deployed web app.
- `DOCS_REPOSITORY_URL`: your customized source and issue repository.
- `DOCS_DISCORD_URL`, `DOCS_SOCIAL_URL`: optional community destinations.

The app serves beneath `/docs`; the public origin excludes that path. Rebuild/restart the docs site when changing environment settings, according to its deployment mode. These variables configure the docs website independently of Desktop's `links` settings. No original distribution is selected when they are missing.
