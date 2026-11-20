#!/usr/bin/env bash
set -euo pipefail
invocation_dir=$PWD
cd "$(dirname "${BASH_SOURCE[0]}")/.."

mode=${1:?Specify init, deploy, status, logs, stop, build, or a personal action}
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

require_image() {
  if [[ -z "${INTEGRATED_IMAGE:-}" ]]; then echo 'Set INTEGRATED_IMAGE to your published repository:version or repository@sha256:digest.' >&2; exit 1; fi
  if [[ "$INTEGRATED_IMAGE" != *@sha256:* && "${INTEGRATED_IMAGE##*/}" != *:* ]]; then
    echo 'INTEGRATED_IMAGE must include an explicit version tag or digest.' >&2
    exit 1
  fi
  export INTEGRATED_IMAGE
}

personal_message() {
  if [[ ${INTEGRATED_PERSONAL_LANG:-} == zh-CN ]]; then
    printf '%s\n' "$1"
  else
    printf '%s\n' "$2"
  fi
}

personal() {
  local personal_file=${INTEGRATED_PERSONAL_ENV_FILE:-.env.integrated.personal}
  local personal_build_image=${INTEGRATED_BUILD_IMAGE:-multica-integrated:personal}
  local managed_postgres=false personal_local_storage=false managed_redis=false
  local redis_compose=docker-compose.integrated.personal.redis.yml
  local archive uploads_dir
  local -a compose=(docker compose --env-file /dev/null -f docker-compose.integrated.personal.yml)
  personal_setting() {
    if [[ -f "$personal_file" ]]; then
      awk -v key="$1" 'index($0,key "=") == 1 {value=substr($0,length(key)+2); sub(/\r$/, "",value)} END {if (value != "") printf "%s", value}' "$personal_file"
    fi
  }
  if [[ -n "${INTEGRATED_PERSONAL_ENV_FILE:-}" && ! -f "$personal_file" ]]; then
    personal_message "找不到个人版配置文件 $personal_file。" "Missing personal configuration file: $personal_file" >&2
    return 1
  fi
  if [[ -z "$(personal_setting DATABASE_URL)" ]]; then
    managed_postgres=true
    compose+=(-f docker-compose.integrated.personal.postgres.yml)
  fi
  if [[ "$(personal_setting MULTICA_MANAGED_REDIS)" == true ]]; then
    managed_redis=true
    compose+=(-f "$redis_compose")
  fi
  uploads_dir=$(personal_setting LOCAL_UPLOAD_DIR)
  if [[ -z "$(personal_setting S3_BUCKET)" ]]; then
    case "$uploads_dir" in
      *'/../'*|*'/..') ;;
      ''|/app/data|/app/data/*) personal_local_storage=true ;;
    esac
  fi

  case "$mode" in
    personal)
      if [[ -n "${INTEGRATED_IMAGE:-}" ]]; then
        require_image
        if [[ "$INTEGRATED_IMAGE" != *@sha256:* ]] || ! docker image inspect "$INTEGRATED_IMAGE" >/dev/null 2>&1; then
          "${compose[@]}" pull
        fi
      elif docker image inspect "$personal_build_image" >/dev/null 2>&1; then
        export INTEGRATED_IMAGE=$personal_build_image
      else
        echo 'Set INTEGRATED_IMAGE to your published image, or run make integrated-personal-build.' >&2
        return 1
      fi
      ;;
    personal-build)
      export INTEGRATED_BUILD_IMAGE=$personal_build_image
      export INTEGRATED_IMAGE=$personal_build_image
      docker buildx bake --file docker-bake.hcl integrated --load
      ;;
    *)
      if [[ -z "${INTEGRATED_IMAGE:-}" ]]; then
        INTEGRATED_IMAGE=$(docker ps -a --filter label=com.docker.compose.project="${COMPOSE_PROJECT_NAME:-multica-personal}" \
          --filter label=com.docker.compose.service=app --filter label=com.docker.compose.oneoff=False \
          --format '{{.Image}}' | sed -n '1p')
        export INTEGRATED_IMAGE=${INTEGRATED_IMAGE:-$personal_build_image}
      fi
      ;;
  esac
  case "$mode" in
    personal|personal-build)
      if ! "${compose[@]}" up -d --no-build --wait --wait-timeout "${INTEGRATED_WAIT_TIMEOUT:-600}"; then
        personal_message 'Multica 尚未就绪。运行 bash multica-personal.sh logs 查看应用日志。' \
          'Multica did not become ready. Run make integrated-personal-logs.' >&2
        return 1
      fi
      local origin setup_code
      if [[ "$managed_redis" == false ]] && [[ -n "$("${compose[@]}" -f "$redis_compose" ps --status running --quiet redis)" ]]; then
        "${compose[@]}" -f "$redis_compose" stop redis
      fi
      origin=$("${compose[@]}" exec -T app node --input-type=module -e '
        import { configure } from "/app/integrated/config.mjs";
        import { initializePersonalEnvironment } from "/app/integrated/personal.mjs";
        const { env } = configure(await initializePersonalEnvironment(process.env));
        console.log(env.MULTICA_PUBLIC_URL);
      ')
      printf '\n'
      personal_message "Multica 已就绪。访问 $origin" "Multica is ready at $origin"
      if setup_code=$("${compose[@]}" exec -T app cat /app/data/setup-code 2>/dev/null) && [[ -n "$setup_code" ]]; then
        personal_message '首次使用时，请在网页输入以下一次性初始化码，然后创建管理员账号。' 'One-time setup code'
        printf '%s\n' "$setup_code"
      fi
      ;;
    personal-status) "${compose[@]}" ps --all ;;
    personal-logs) "${compose[@]}" logs --tail=200 -f app ;;
    personal-stop)
      if [[ "$managed_redis" == false ]]; then compose+=(-f "$redis_compose"); fi
      "${compose[@]}" stop
      if [[ ${INTEGRATED_PERSONAL_LANG:-} == zh-CN ]]; then
        printf '服务已停止，数据已保留。\n'
      fi
      ;;
    personal-setup-code)
      if ! "${compose[@]}" exec -T app cat /app/data/setup-code 2>/dev/null; then
        personal_message '无法读取初始化码。请确认应用已启动，且管理员尚未创建。' \
          'Unable to read the setup code. Start the application and make sure the owner has not been created.' >&2
        return 1
      fi
      ;;
    personal-reset-password)
      if [[ ${INTEGRATED_PERSONAL_LANG:-} == zh-CN ]]; then
        printf '正在重置管理员密码。请保存命令返回的新密码。\n'
      fi
      "${compose[@]}" exec -T app node /app/integrated/entrypoint.mjs local-auth reset-password
      ;;
    personal-backup|personal-restore)
      archive=${1:?Provide a backup archive path as BACKUP_FILE}
      if [[ "$archive" != /* ]]; then archive="$invocation_dir/$archive"; fi
      source scripts/integrated-data.sh
      personal_data "${mode#personal-}" "$archive"
      ;;
    *) echo "Unknown personal command: $mode" >&2; return 1 ;;
  esac
}

if [[ "$mode" == personal || "$mode" == personal-* ]]; then
  personal "${@:2}"
  exit 0
fi

if [[ ! -f "$config_file" ]]; then echo "Missing $config_file. Run make integrated-init first." >&2; exit 1; fi
require_image
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
