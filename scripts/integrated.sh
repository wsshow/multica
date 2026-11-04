#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

mode=${1:?Specify init, deploy, status, logs, stop, or build}
config_file=${INTEGRATED_ENV_FILE:-.env.integrated}
export INTEGRATED_ENV_FILE="$config_file"

if [[ "$mode" == init ]]; then
  command -v openssl >/dev/null || { echo 'OpenSSL is required to generate initial secrets.' >&2; exit 1; }
  umask 077
  if [[ ! -e "$config_file" ]]; then cp .env.integrated.example "$config_file"; fi
  initialize_key() {
    local key=$1 value=$2 temporary
    if ! awk -F= -v key="$key" '$1 == key && length(substr($0, length(key)+2)) > 0 {found=1} END {exit !found}' "$config_file"; then
      temporary=$(mktemp "${config_file}.XXXXXX")
      awk -v key="$key" -v value="$value" 'index($0,key "=") == 1 {print key "=" value; found=1; next} {print} END {if (!found) print key "=" value}' "$config_file" > "$temporary"
      mv "$temporary" "$config_file"
    fi
  }
  initialize_key JWT_SECRET "$(openssl rand -hex 32)"
  if awk '$0 == "MULTICA_VCS_INTEGRATION_ENABLED=true" {found=1} END {exit !found}' "$config_file"; then
    initialize_key MULTICA_VCS_SECRET_KEY "$(openssl rand -base64 32)"
  fi
  echo "Prepared $config_file. Fill in your public URL, external database, object storage, and login delivery settings."
  exit 0
fi

if [[ "$mode" == build ]]; then
  docker buildx version >/dev/null
  exec docker buildx bake --file docker-bake.hcl integrated --load
fi

version=$(docker compose version --short) || { echo 'Docker Compose 2.30+ is required.' >&2; exit 1; }
version=${version#v}
if [[ ! "$version" =~ ^([0-9]+)\.([0-9]+) ]] || (( BASH_REMATCH[1] < 2 || (BASH_REMATCH[1] == 2 && BASH_REMATCH[2] < 30) )); then
  echo 'Docker Compose 2.30+ is required for raw environment files.' >&2
  exit 1
fi
if [[ ! -f "$config_file" ]]; then echo "Missing $config_file. Run make integrated-init first." >&2; exit 1; fi
if [[ -z "${INTEGRATED_IMAGE:-}" ]]; then echo 'Set INTEGRATED_IMAGE to your published repository:version or repository@sha256:digest.' >&2; exit 1; fi
if [[ "$INTEGRATED_IMAGE" != *@sha256:* && "${INTEGRATED_IMAGE##*/}" != *:* ]]; then
  echo 'INTEGRATED_IMAGE must include an explicit version tag or digest.' >&2
  exit 1
fi
compose=(docker compose --env-file /dev/null -f docker-compose.integrated.yml)
case "$mode" in
  deploy)
    "${compose[@]}" pull app
    "${compose[@]}" run --rm --no-deps --entrypoint node app --input-type=module -e '
      import { configure } from "/app/integrated/config.mjs";
      try { configure(process.env); }
      catch (error) { console.error(`integrated: ${error.message}`); process.exit(1); }
    '
    if ! "${compose[@]}" up -d --no-build --wait --wait-timeout "${INTEGRATED_WAIT_TIMEOUT:-600}"; then
      echo 'Application did not become ready. Run make integrated-logs with the same INTEGRATED_IMAGE.' >&2
      exit 1
    fi
    ;;
  status) "${compose[@]}" ps ;;
  logs) "${compose[@]}" logs --tail=200 -f app ;;
  stop) "${compose[@]}" down ;;
  *) echo "Unknown integrated command: $mode" >&2; exit 2 ;;
esac
