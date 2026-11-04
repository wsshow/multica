# Changelog

Versions in this file belong to this customized edition. See
[the source version mapping](docs/version-mapping.md) for upstream provenance.

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
