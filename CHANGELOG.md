# Changelog

Versions in this file belong to this customized edition. See
[the source version mapping](docs/version-mapping.md) for upstream provenance.

## 0.1.6 — 2026-11-20

- Synchronize official `v0.11.1` (`e1fe10d6694848e35dd1aa00e08cd11d93e545ac`),
  including `v0.11.0` and all 146 commits since `v0.10.0`: WeChat QR connections,
  webhook payload conditions, chat follow-ups and steering, project folders,
  account rate-limit displays, inbox CLI operations and performance fixes.
- Import the Docs feature and enterprise package boundaries with their upstream
  gates intact; Docs remains controlled by `docs_v1` / `FF_DOCS_V1`.
- Retain disabled telemetry, no-op inbox metrics, explicit Desktop service and
  update configuration, and the CLI built from this checkout. Advertise CLI
  contract `0.11.1` independently of the customized package version.
- Adapt stable-release promotion to this repository's Linux/Windows Desktop
  artifacts while retaining all six CLI targets and asset completeness checks.
- Align Desktop packaging regressions with mandatory source-built CLI behavior,
  and cover issue/project/Docs searches during workspace switches.
- Publish Chinese release highlights with complete contributor records folded
  underneath; promote Latest only after the configured artifacts are complete.
- Run verification through GitHub Actions. Local tests, telemetry checks,
  typecheck, lint, builds, services and browser checks were not run.

## 0.1.5 — 2026-11-17

- Synchronize official `v0.10.0` (`2fcb424b72b024f65161809081009063846ea44d`),
  including `v0.8.1`, `v0.8.2` and `v0.9.0`: Work-panel Inbox and snooze,
  private/archived projects, bulk issue editing, themes, on-device Desktop
  voice input, connected apps, and additional agent runtimes.
- Retain disabled telemetry and development diagnostic collection, explicit
  Desktop service configuration, the bundled customized CLI and independently
  configured installation/update sources. Advertise CLI contract `0.10.0`.
- Remove the customized-edition banner from both existing README locales and
  adapt the new Japanese README and Traditional Chinese deployment guides.
- Align view tests with disabled diagnostics and explicitly configured help
  links, and stabilize timing-sensitive interactions on shared CI runners.
- Verify the synchronized source in GitHub Actions, including frontend checks
  and both native integrated-image architectures. Local tests, builds and
  application verification were not run, at the user's request.

## 0.1.4 — 2026-11-04

- Integrate official `v0.8.0` (`9b1ab4f9eed9153a94719596eb8a728d2770f065`),
  including native ZCode support, Devin model discovery fixes, resolved-thread
  summaries, superseded GitHub check handling, and the official Inbox rollback.
- Establish traceable upstream merge ancestry and reuse `feikong/upstream-sync`
  for future updates, with official tags in a separate namespace.
- Advertise CLI contract version `0.8.0` independently of the customized release
  number; retain disabled telemetry, explicit service/release configuration,
  the bundled customized CLI, and integrated application packaging.

## 0.1.3 — 2026-11-04

- Add one application image combining the Go backend, Next.js web application,
  and nginx, with external PostgreSQL, S3-compatible storage, and optional Redis.
- Add isolated deployment configuration and `make integrated` commands,
  combined readiness, migration ordering, and supervised process shutdown.
- Build and smoke-test native Linux AMD64/ARM64 images in GitHub Actions,
  then publish the tested images and multi-platform manifest to the configured
  Docker Hub repository on a release tag.
- Use an explicit missing AWS profile for the storage initialization regression
  test so its failure case follows the SDK's configuration-loading behavior.
- Keep application telemetry disabled and disable Next.js telemetry in web
  container builds and the integrated runtime.

## 0.1.2 — 2026-11-03

- Separate this edition's release version from its advertised CLI contract
  version so independent numbering does not disable quick create, explicit
  issue fields, or chat project context.
- Preserve release versions for display, updates, and Desktop daemon restart
  decisions; keep legacy daemon version checks when no contract is advertised.

## 0.1.1 — 2026-11-03

- Supply the customized project homepage required by Linux DEB/RPM packages.
- Declare Desktop's pnpm version so dependency collection recognizes the
  workspace during direct packaging invocations.
- Upload Desktop assets to the published GitHub release rather than skipping
  them because of a draft/release type mismatch.

## 0.1.0 — 2026-11-03

- Start an independent release sequence for this customized edition.
- Disable application telemetry, crash reporting, client usage reporting, and
  operational metrics while retaining no-op APIs for future source updates.
- Require explicit self-hosted service settings in the Electron client and
  execute only the CLI bundled from this customized checkout.
- Use operator-configured help, installer, and update sources.
- Align deployment documentation and CLI download instructions with customized
  builds and self-hosted services.
- Publish CLI archives and backend/web container images from the reviewed
  release tag in this repository. Desktop packaging/publication was incomplete;
  use 0.1.2 for the completed distribution with independent version support.
