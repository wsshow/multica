# Release runbook

## Customized distribution prerequisites

The Release workflow publishes reviewed customized commits to the repository where it runs. Desktop receives `MULTICA_RELEASE_REPOSITORY` from `github.repository`, which supplies its GitHub provider, owner, and repository. Local packaging does not inject a publisher or architecture-specific channel unless this variable is explicitly set to `owner/repository`.

Confirm token/package permissions, artifact naming, signing, and checksums before creating a release tag. Container images are published beneath the current repository owner's GHCR namespace. The retained Helm publication job is restricted to the upstream owner and is skipped for this customized repository; use the source chart. CLI archives cover macOS, Linux, and Windows on AMD64 and ARM64. Desktop installers cover Linux and Windows on x64 and ARM64, without code signing; macOS Desktop signing and notarization are not configured in CI.

Consumers must explicitly configure their own release repository and Desktop update feed. Docker deployments select their own backend/web image repositories and immutable tags. Use the source Helm chart until your own chart distribution is configured. Original upstream releases do not contain this edition's telemetry and connection changes.

## Normal release

The integrated application workflow is called by Release after verification.
Configure repository variables `DOCKERHUB_USERNAME` and `DOCKERHUB_IMAGE`
(`namespace/repository`), plus the `DOCKERHUB_TOKEN` repository secret. This
token must be allowed to push to that Docker Hub repository. Unlike GHCR,
Docker Hub does not use `GITHUB_TOKEN` for this login.

The workflow builds from this checkout using Bake and native AMD64/ARM64
runners, then tests each assembled image before exporting and uploading the
same image by digest, without a temporary tag. The registry client is a pinned,
checksum-verified precompiled crane binary. Only after both succeed does the
workflow merge their digests into the version tag (without `v`). Stable versions
also update `latest`; prereleases do not. Public tags contain only release
versions and `latest`; source commits remain recorded in image labels and the
release workflow. PR and ordinary main runs only build
and test. Do not create a new release tag until the integrated-image CI checks
for its source commit have passed. Check the published manifest includes both
Linux architectures and record its digest. See the [integrated guide](../docs/integrated-image.md).

For internal tags left by the previous publisher, run **Clean Docker Hub tags**
with the current stable image version. This maintenance workflow first verifies
digest-only uploads on both architectures using the existing release image;
it does not compile or publish a new version. It then removes only `build-*`
and `sha-*` tags whose digests are retained by that stable multi-platform
manifest, while preserving the version and `latest`. The Docker Hub token needs
tag deletion permission for this maintenance action; normal releases only need
read/write permission. Never use the registry manifest deletion endpoint to
remove an alias: version and `latest` can share that manifest.

This edition maintains its own version sequence, beginning with `v0.1.0`.
Upstream version numbers describe source provenance, not this edition's release
number. Record the relationship in [the version mapping](../docs/version-mapping.md)
and update [the changelog](../CHANGELOG.md) for each release. Keep the root,
web, and desktop package versions aligned with the new tag without its `v`
prefix. The tag supplies the shipped CLI, Desktop, and container versions.
Use a patch increment for fixes, a minor increment for features, and a major
increment for breaking changes; synchronization alone does not copy the
upstream release number.

Runtime feature gates use the daemon's `cli_compatibility_version`, declared
by `server/pkg/agent/cli_compatibility.go`. Release labels and update comparisons
continue using `cli_version`. Review the compatibility value when importing
upstream features; do not derive it from this edition's release number.

Release from a reviewed commit on `main` by creating and pushing a new semantic
version tag such as `v0.1.0`. The Release workflow intentionally has no manual
trigger: a tag push is the only event that can publish binaries
and container images.

The verification job runs the Go tests and `govulncheck` before any publishing
job starts. The vulnerability scan is fail-closed by default.

Desktop metadata declares pnpm and the customized project homepage required
by Linux DEB/RPM packaging. Keep its package manager version aligned with the
workspace root. Desktop publishing explicitly selects the published release
type to match the GitHub Release already created by GoReleaser. Confirm the
expected installers are present in release assets; a successful packager can
still skip uploads when release types do not match.

Release notes use GoReleaser's GitHub changelog to credit commit authors and
recognized co-authors between the previous and current tags. Keep all commits,
including documentation, tests, and chores, so their authors are credited too.
Commit-subject `@` characters are separated from the following text with an HTML
comment; only the generated author mentions populate GitHub's Contributors list.

Update `release.header` in `.goreleaser.yml` with a Chinese user-facing summary
when preparing each release. It describes the features, fixes, upgrade requirements
and available artifacts as soon as the Release is created. Keep the full generated
changelog inside the header/footer's collapsed details block so contributor credit
is preserved. Use the tag/version template fields in versioned links and image names.

CI and release jobs require Go `~1.27.4`: at least 1.27.4, while accepting
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

## Stable release promotion

GoReleaser publishes a public release with `make_latest: false`. Stable clients
continue to receive the previous complete release while Desktop artifacts upload.
The release page and GitHub notifications can show the new release before promotion.
Container tags are published independently.

`.github/workflows/promote-release.yml` is the only entry point for changing
Latest. The Linux/Windows Desktop matrix calls it after both builds succeed.
The workflow takes its repository from `github.repository`; the validator requires
an explicit `GH_REPO` and never defaults to the official publisher. To retry after
correcting an upload, dispatch it in the customized repository:

```bash
gh workflow run promote-release.yml --repo wsshow/multica --ref main -f tag=vX.Y.Z
```

The workflow runs the reviewed validator from `main`, serializes promotion across
tags, and only promotes stable semantic versions newer than the current Latest.
Older releases finishing late and repeated promotions leave Latest unchanged.

The gate checks the four update metadata files for the configured CI Desktop
targets: `latest.yml`, `latest-arm64.yml`, `latest-linux.yml`, and
`latest-linux-arm64.yml`. Their versions must match the tag, and every referenced
artifact must have the expected architecture, upload status, and byte size.
Windows metadata requires EXE installers; Linux requires AppImage packages.
Blockmaps do not block promotion. All six CLI targets in both legacy and versioned
archive names, including macOS CLI archives, and `checksums.txt` are required.
macOS Desktop installers and metadata are not required because this customized
repository does not configure their signing or publication. The retained macOS
`afterSign` hook still verifies explicitly published signed builds.

Missing or inconsistent assets return `waiting` with the blockers and leave Latest
unchanged. API/authentication failures fail the job. Inspect the run result after
a retry; a successful dispatch only confirms it was queued. Do not bypass the gate
with a direct `gh release edit --latest`.

Land the promotion workflow on `main` before publishing the first tag that uses
`make_latest: false`. Fix a faulty release with a higher patch version through the
same gate; do not move Latest backwards or remove the completeness check.
