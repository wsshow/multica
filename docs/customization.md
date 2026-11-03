# Local customization and upstream updates

This checkout is an independent customized version of Multica. The original Git metadata was intentionally removed. Its new repository starts on `main` without remotes or inherited history. Licenses, copyright notices, Go module paths, and source references remain intact.

## Telemetry boundaries

Upstream business code may continue calling the existing APIs. The following boundaries discard calls without queues, background observers, installation IDs, telemetry database writes, crash files, or network delivery:

| Boundary | Implementation |
| --- | --- |
| Product analytics and crash reports | `packages/core/analytics/index.ts`, `server/internal/analytics/client.go` |
| Google Analytics | `apps/web/config/google-analytics.ts`, `apps/web/lib/google-analytics.ts` |
| Activity and runtime inventory reporting | `packages/core/client-usage/`, desktop `platform/client-usage-reporter.tsx`, `ApiClient.upsertClientUsage`, `server/internal/handler/client_usage.go` |
| Self-host snapshot and member activity | `server/internal/selfhosttelemetry/worker.go`, `TaskService.RecordHumanDelegation` |
| Crash persistence and flush | desktop `main/freeze-breadcrumb.ts`, renderer `freeze-flush.ts` |
| Long-task observation | `packages/core/diagnostics/freeze-watchdog.ts` |
| Prometheus and WebSocket operational statistics | `server/internal/metrics/noop.go`, realtime and daemonws `metrics.go` |

`/metrics` is unavailable; `/health/realtime` returns 404. Configuration cannot enable these features, including when an older server returns an analytics key or an older client posts a usage report. Ordinary health checks and user-facing error recovery remain functional.

User-visible usage, token counts, costs, run history, failure reasons, runtime heartbeats, application logs, authentication, and integrations remain product features. Historical telemetry migrations and inert database queries remain so database upgrades and upstream merges retain their schema history. Existing historical data is not deleted automatically.

## Synchronizing upstream features

Keep customization concentrated in the boundaries above. Merge upstream business features with their call sites intact, and resolve boundary changes in favor of the no-op policy. Do not replace entire customized modules with upstream versions without reviewing newly added exports and initialization paths.

Because the previous history was removed, there is no verified upstream merge base. For the first synchronization, identify the original source version and compare a separate upstream checkout against this repository. Establish a dedicated upstream snapshot branch from that verified version before importing subsequent snapshots. Do not blindly merge unrelated histories or use blanket conflict resolution. No upstream remote has been configured automatically.

After each synchronization:

1. Run `pnpm check:telemetry` to reject telemetry SDK dependencies and imports.
2. Run the analytics, client usage, Google Analytics, crash persistence/flush, self-host worker, and metrics regression tests. They verify inert behavior even with configured keys, active users, and callbacks.
3. Run typecheck, lint, frontend tests, and Go tests. Database-backed and end-to-end tests need the managed local environment.
4. Review new outbound HTTP clients, script injection, startup workers, and reporting endpoints. The dependency check cannot detect every newly invented telemetry implementation.

## Distribution sources

The desktop package no longer declares the original GitHub repository or publish target. Container defaults select locally built `multica-backend:dev` and `multica-web:dev` images. Homebrew publication to the original organization has been removed; generic CI and release workflows remain reusable for the new repository.

The CLI updater and shell/PowerShell installers require `MULTICA_RELEASE_REPOSITORY=owner/repository`. They have no default release repository. `MULTICA_HOMEBREW_PACKAGE` optionally selects a separately configured Homebrew package. Configure your own desktop publishing destination before distributing auto-updating desktop builds.

Original installation examples and historical changelog links may still identify upstream. They are provenance or upstream documentation, not a configured remote of this repository. For this customized checkout, build locally (`make build`, `make selfhost-build`) until its own distribution repository is ready. Never install upstream binaries over this customized version.

The Go vulnerability-scanning tool retains `golang.org/x/telemetry` as an indirect tooling dependency. It is not imported by the application. Required framework dependencies may likewise contain their own development tooling; this policy removes the application's telemetry implementations rather than rewriting installed third-party tools or user-installed agents.
