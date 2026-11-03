# Release runbook

## Customized distribution prerequisites

The Release workflow publishes reviewed customized commits to the repository where it runs. Desktop receives `MULTICA_RELEASE_REPOSITORY` from `github.repository`, which supplies its GitHub provider, owner, and repository. Local packaging does not inject a publisher or architecture-specific channel unless this variable is explicitly set to `owner/repository`.

Confirm token/package permissions, artifact naming, signing, and checksums before creating a release tag. Container images are published beneath the current repository owner's GHCR namespace. The retained Helm publication job is restricted to the upstream owner and is skipped for this customized repository; use the source chart. CLI archives cover macOS, Linux, and Windows on AMD64 and ARM64. Desktop installers cover Linux and Windows on x64 and ARM64, without code signing; macOS Desktop signing and notarization are not configured in CI.

Consumers must explicitly configure their own release repository and Desktop update feed. Docker deployments select their own backend/web image repositories and immutable tags. Use the source Helm chart until your own chart distribution is configured. Original upstream releases do not contain this edition's telemetry and connection changes.

## Normal release

This edition maintains its own version sequence, beginning with `v0.1.0`.
Upstream version numbers describe source provenance, not this edition's release
number. Record the relationship in [the version mapping](../docs/version-mapping.md)
and update [the changelog](../CHANGELOG.md) for each release. Keep the root,
web, and desktop package versions aligned with the new tag without its `v`
prefix. The tag supplies the shipped CLI, Desktop, and container versions.
Use a patch increment for fixes, a minor increment for features, and a major
increment for breaking changes; synchronization alone does not copy the
upstream release number.

Release from a reviewed commit on `main` by creating and pushing a new semantic
version tag such as `v0.1.0`. The Release workflow intentionally has no manual
trigger: a tag push is the only event that can publish binaries
and container images.

The verification job runs the Go tests and `govulncheck` before any publishing
job starts. The vulnerability scan is fail-closed by default.

CI and release jobs require Go `~1.27.3`: at least 1.27.3, while accepting
newer 1.27 patches. This security floor is independent of the development
minimum in `server/go.mod`. A plain `1.27.x` can resolve to an older patch
while the `setup-go` version manifest catches up with an official Go release.
When raising the security floor, update all Go workflows and the pinned
Go builder image in `Dockerfile` together so shipped binaries also receive
the fixes.

## Emergency vulnerability-scan bypass

Use the bypass only when `govulncheck` itself or its live vulnerability database
is unavailable, or when maintainers have documented a confirmed false positive
that blocks an urgent release. Never use it to publish a release with an
unresolved reachable vulnerability.

1. Record the reason and maintainer approval in the release issue or pull
   request, and confirm no other release is in progress.
2. In **Settings → Secrets and variables → Actions → Variables**, set the
   repository variable `ALLOW_VULN_BYPASS_FOR_TAG` to the exact release tag,
   for example `v0.1.1`.
3. Re-run the failed Release workflow for that tag. A different tag, an empty
   value, or any typo keeps the scan enabled.
4. Confirm the verification log contains the explicit bypass warning and retain
   the workflow URL in the incident record.
5. Delete `ALLOW_VULN_BYPASS_FOR_TAG` immediately after the release run
   completes. The tag-scoped value prevents a concurrent release with another
   tag from inheriting the bypass.

Every Go binary retains its compiler version in the standard Go build metadata;
use `go version -m <binary>` when auditing a downloaded release artifact.
