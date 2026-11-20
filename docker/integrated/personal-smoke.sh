#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
temporary=$(mktemp -d)
export INTEGRATED_BUILD_IMAGE=${INTEGRATED_BUILD_IMAGE:-multica-integrated:ci}
export INTEGRATED_IMAGE=$INTEGRATED_BUILD_IMAGE
export INTEGRATED_PERSONAL_ENV_FILE="$temporary/personal.env"
export INTEGRATED_HOST_PORT=18081
export COMPOSE_PROJECT_NAME=multica-personal-smoke
compose=(docker compose --env-file /dev/null
  -f docker-compose.integrated.personal.yml -f docker-compose.integrated.personal.postgres.yml)
managed_compose=("${compose[@]}" -f docker-compose.integrated.personal.redis.yml)
cleanup() {
  local status=$?
  if (( status != 0 )); then "${managed_compose[@]}" logs --tail=100 || true; fi
  "${managed_compose[@]}" down -v --remove-orphans
  rm -rf "$temporary"
}
trap cleanup EXIT

"${compose[@]}" up -d --no-build --wait --wait-timeout 420
"${compose[@]}" exec -T app cat /app/data/setup-code |
  node docker/integrated/personal-smoke.mjs exercise "$temporary/state.json"

printf 'MULTICA_MANAGED_REDIS=true\n' > "$INTEGRATED_PERSONAL_ENV_FILE"
INTEGRATED_IMAGE= bash scripts/integrated.sh personal
[[ $("${managed_compose[@]}" exec -T redis redis-cli ping) == PONG ]]
[[ $("${managed_compose[@]}" exec -T app printenv REDIS_URL) == redis://redis:6379/0 ]]
node docker/integrated/personal-smoke.mjs restore "$temporary/state.json"

: > "$INTEGRATED_PERSONAL_ENV_FILE"
INTEGRATED_IMAGE= bash scripts/integrated.sh personal
[[ -z "$("${managed_compose[@]}" ps --status running --quiet redis)" ]]
node docker/integrated/personal-smoke.mjs restore "$temporary/state.json"
