# Changelog

Versions in this file belong to this customized edition. See
[the source version mapping](docs/version-mapping.md) for upstream provenance.

## 0.1.0 — 2026-11-03

- Start an independent release sequence for this customized edition.
- Disable application telemetry, crash reporting, client usage reporting, and
  operational metrics while retaining no-op APIs for future source updates.
- Require explicit self-hosted service settings in the Electron client and
  execute only the CLI bundled from this customized checkout.
- Use operator-configured help, installer, and update sources.
- Align deployment documentation and CLI download instructions with customized
  builds and self-hosted services.
- Publish CLI archives, Linux/Windows Desktop installers, and backend/web
  container images from the reviewed release tag in this repository.
