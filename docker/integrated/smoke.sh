#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
export INTEGRATED_BUILD_IMAGE=${INTEGRATED_BUILD_IMAGE:-multica-integrated:ci}
compose=(docker compose --env-file /dev/null -f docker/integrated/compose.smoke.yml)
temporary=$(mktemp -d)
cleanup() {
  local status=$?
  if (( status != 0 )); then "${compose[@]}" logs --tail=100 || true; fi
  "${compose[@]}" --profile redis down -v --remove-orphans >/dev/null
  INTEGRATED_IMAGE="$INTEGRATED_BUILD_IMAGE" INTEGRATED_ENV_FILE="$temporary/raw.env" docker compose --project-name multica-integrated-raw-smoke --env-file /dev/null -f docker-compose.integrated.yml down >/dev/null
  rm -rf "$temporary"
}
trap cleanup EXIT
printf '%s\n' 'SMTP_PASSWORD=literal $value with spaces' > "$temporary/raw.env"
INTEGRATED_IMAGE="$INTEGRATED_BUILD_IMAGE" INTEGRATED_ENV_FILE="$temporary/raw.env" docker compose --project-name multica-integrated-raw-smoke --env-file /dev/null -f docker-compose.integrated.yml run --rm --no-deps --entrypoint node app -e 'require("node:assert/strict").equal(process.env.SMTP_PASSWORD, "literal $value with spaces")'
wait_ready() {
  for ((attempt=0; attempt<300; attempt++)); do
    if curl -fsS http://127.0.0.1:18080/readyz >/dev/null 2>&1; then return; fi
    local container
    container=$("${compose[@]}" ps -aq app)
    if [[ -n "$container" && $(docker inspect -f '{{.State.Running}}' "$container") != true ]]; then return 1; fi
    sleep 2
  done
  return 1
}
"${compose[@]}" up -d
wait_ready
bucket_ready=false
for ((attempt=0; attempt<60; attempt++)); do
  if curl -fsS --aws-sigv4 aws:amz:us-east-1:s3 --user smoke-access:smoke-secret -X PUT http://127.0.0.1:18333/multica >/dev/null 2>&1; then bucket_ready=true; break; fi
  sleep 2
done
[[ "$bucket_ready" == true ]] || { echo 'S3 fixture did not become ready.' >&2; exit 1; }
node docker/integrated/smoke.mjs exercise "$temporary/state.json"
"${compose[@]}" up -d --force-recreate app
wait_ready
node docker/integrated/smoke.mjs restore "$temporary/state.json"

# Each critical component must take down its siblings, including clean exits.
for component in backend web gateway; do
  "${compose[@]}" exec -T app node --input-type=module - "$component" <<'JS'
import { readdirSync, readFileSync } from 'node:fs';
const target = process.argv[2];
for (const id of readdirSync('/proc').filter(name => /^\d+$/.test(name))) {
  let command;
  try { command = readFileSync(`/proc/${id}/cmdline`, 'utf8').replaceAll('\0', ' '); } catch { continue; }
  if ((target === 'backend' && command.startsWith('/app/server ')) ||
      (target === 'web' && (command.includes('/app/apps/web/server.js') || command.startsWith('next-server'))) ||
      (target === 'gateway' && command.startsWith('nginx: master'))) {
    process.kill(Number(id), 'SIGKILL');
    process.exit(0);
  }
}
throw new Error(`Missing component: ${target}`);
JS
  container=$("${compose[@]}" ps -aq app)
  for ((attempt=0; attempt<40; attempt++)); do
    if [[ $(docker inspect -f '{{.State.Running}}' "$container") == false ]]; then break; fi
    sleep 1
  done
  [[ $(docker inspect -f '{{.State.Running}}' "$container") == false ]]
  [[ $(docker inspect -f '{{.State.ExitCode}}' "$container") != 0 ]]
  "${compose[@]}" start app
  wait_ready
done

"${compose[@]}" --profile redis up -d redis
export SMOKE_REDIS_URL=redis://redis:6379/0
"${compose[@]}" up -d --force-recreate app
wait_ready
node docker/integrated/smoke.mjs restore "$temporary/state.json"
"${compose[@]}" stop database
sleep 4
[[ $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/readyz) == 503 ]]
"${compose[@]}" start database
wait_ready
"${compose[@]}" stop app
container=$("${compose[@]}" ps -aq app)
[[ $(docker inspect -f '{{.State.ExitCode}}' "$container") != 137 ]]
echo 'Integrated image smoke checks passed.'
