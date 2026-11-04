#!/usr/bin/env bash
set -euo pipefail

: "${IMAGE:?Set IMAGE to the Docker Hub repository}"
: "${ARCH:?Set ARCH to the tested architecture}"
: "${INTEGRATED_BUILD_IMAGE:?Set INTEGRATED_BUILD_IMAGE to the tested local image}"
: "${RUNNER_TEMP:?Set RUNNER_TEMP to the runner temporary directory}"

archive="$RUNNER_TEMP/integrated-tested-image.tar"
trap 'rm -f "$archive"' EXIT
docker image save "$INTEGRATED_BUILD_IMAGE" -o "$archive"
digest=$(crane digest --tarball "$archive")
[[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]]
mkdir -p /tmp/integrated-digests
crane push "$archive" "$IMAGE@$digest" --image-refs "/tmp/integrated-digests/$ARCH"
[[ "$(crane digest "$IMAGE@$digest")" == "$digest" ]]
