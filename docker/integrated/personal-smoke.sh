#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
temporary=$(mktemp -d)
export INTEGRATED_IMAGE=${INTEGRATED_BUILD_IMAGE:-multica-integrated:ci}
export INTEGRATED_PERSONAL_ENV_FILE="$temporary/no-config.env"
export INTEGRATED_HOST_PORT=18081
compose=(docker compose --project-name multica-personal-smoke --env-file /dev/null
  -f docker-compose.integrated.personal.yml -f docker-compose.integrated.personal.postgres.yml)
cleanup() {
  local status=$?
  if (( status != 0 )); then "${compose[@]}" logs --tail=100 || true; fi
  "${compose[@]}" down -v --remove-orphans
  rm -rf "$temporary"
}
trap cleanup EXIT

"${compose[@]}" up -d --no-build --wait --wait-timeout 420
"${compose[@]}" exec -T app cat /app/data/setup-code |
  node docker/integrated/personal-smoke.mjs exercise "$temporary/state.json"
"${compose[@]}" up -d --force-recreate --no-deps --wait --wait-timeout 300 app
node docker/integrated/personal-smoke.mjs restore "$temporary/state.json"
