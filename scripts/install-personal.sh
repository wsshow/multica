#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf '\n无法继续。%s\n' "$1" >&2
  exit 1
}

show_help() {
  cat <<'HELP'
Multica 个人版

  bash multica-personal.sh                 安装最新稳定版，或确认后升级
  bash multica-personal.sh install --yes   无需交互，安装或升级到最新稳定版
  bash multica-personal.sh configure       配置访问端口、PostgreSQL、附件存储和 Redis
  bash multica-personal.sh up              启动已安装的版本
  bash multica-personal.sh status          查看运行状态
  bash multica-personal.sh logs            查看应用日志
  bash multica-personal.sh stop            停止服务并保留数据
  bash multica-personal.sh setup-code      查看初始化码
  bash multica-personal.sh reset-password  重置管理员密码
  bash multica-personal.sh backup 文件路径   备份默认数据库和本地附件
  bash multica-personal.sh restore 文件路径  恢复到空实例
HELP
}

download() {
  curl --proto '=https' --proto-redir '=https' --fail --silent --show-error \
    --location --connect-timeout 10 --max-time 60 --retry 2 --output "$2" "$1"
}

valid_repository() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+$ && ${1#*/} != . && ${1#*/} != .. ]]
}

read_release() {
  local extra
  IFS=' ' read -r release_repo release_tag release_commit release_image extra < "$1" &&
    valid_repository "$release_repo" &&
    [[ -z "$extra" &&
      "$release_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ && "$release_commit" =~ ^[0-9a-f]{40}$ &&
      "$release_image" =~ ^[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9._-]*@sha256:[0-9a-f]{64}$ ]]
}

prompt_value() {
  local label=$1 value
  printf '%s ' "$label" >&2
  if [[ ${2:-} == hidden ]]; then
    IFS= read -r -s value || fail '已取消输入。'
    printf '\n' >&2
  else
    IFS= read -r value || fail '已取消输入。'
  fi
  [[ "$value" != *$'\r'* ]] || fail '请在一行内输入配置值。'
  printf '%s' "$value"
}

valid_host_port() {
  [[ "$1" =~ ^[0-9]{1,5}$ ]] && (( 10#$1 >= 1 && 10#$1 <= 65535 ))
}

read_host_port() {
  local value container
  if [[ -f "$host_port_file" ]]; then
    if IFS= read -r value < "$host_port_file" && valid_host_port "$value"; then
      printf '%s' "$((10#$value))"
      return
    fi
    [[ "$action" == configure ]] || fail '已保存的端口无效。请运行 bash multica-personal.sh configure 重新设置。'
    printf '已保存的端口无效，请重新选择访问端口。\n' >&2
  fi
  if [[ -f "$current_release" ]] && container=$(docker ps -aq \
    --filter "label=com.docker.compose.project=${COMPOSE_PROJECT_NAME:-multica-personal}" \
    --filter label=com.docker.compose.service=app --filter label=com.docker.compose.oneoff=False 2>/dev/null) &&
    [[ -n "$container" ]] && value=$(docker container inspect --format \
      '{{range index .HostConfig.PortBindings "8080/tcp"}}{{println .HostPort}}{{end}}' \
      "${container%%$'\n'*}" 2>/dev/null) && valid_host_port "${value%%$'\n'*}"; then
    value=${value%%$'\n'*}
    printf '%s' "$((10#$value))"
  else
    printf '8080'
  fi
}

save_host_port() {
  local pending
  mkdir -p "$install_dir" || fail "无法写入安装目录 $install_dir。"
  pending=$(mktemp "$install_dir/.host-port.XXXXXX") || fail '无法保存访问端口。'
  if ! printf '%s\n' "$1" > "$pending" || ! mv -f -- "$pending" "$host_port_file"; then
    rm -f -- "$pending"
    fail '无法保存访问端口。'
  fi
}

prompt_host_port() {
  local value
  while true; do
    value=$(prompt_value "访问端口 [$1]（回车使用）")
    value=${value:-$1}
    if valid_host_port "$value"; then
      printf '%s' "$((10#$value))"
      return
    fi
    printf '请输入 1 到 65535 之间的整数。\n' >&2
  done
}

personal_setting() {
  if [[ -f "$personal_config" ]]; then
    awk -v key="$1" 'index($0,key "=") == 1 {value=substr($0,length(key)+2); sub(/\r$/, "", value)} END {printf "%s", value}' "$personal_config"
  fi
}

save_personal_settings() {
  local pending setting
  local -a keys=()
  for setting in "$@"; do keys+=("${setting%%=*}"); done
  mkdir -p "$(dirname -- "$personal_config")" || fail '无法创建个人版配置目录。'
  pending=$(mktemp "${personal_config}.XXXXXX") || fail '无法创建个人版配置文件。'
  if [[ -f "$personal_config" ]] && ! awk -F= -v keys="${keys[*]}" \
    'BEGIN {count = split(keys, names, " "); for (i = 1; i <= count; i++) changed[names[i]] = 1}
     !($1 in changed)' "$personal_config" > "$pending"; then
    rm -f -- "$pending"
    fail '无法读取当前配置。'
  fi
  if ! printf '%s\n' "$@" >> "$pending" || ! mv -f -- "$pending" "$personal_config"; then
    rm -f -- "$pending"
    fail '无法保存个人版配置。'
  fi
  printf '配置已保存，下次启动时生效。\n'
}

confirm_service_change() {
  [[ -f "$current_release" ]] || return 0
  local answer
  printf '请先备份当前数据，并确认新服务已准备好接收迁移。保存后，下次启动会使用新的配置。\n'
  answer=$(prompt_value '保存变更？[y/N]') || return 1
  case "$answer" in
    y|Y|yes|YES) return 0 ;;
    *) printf '已取消变更。\n'; return 1 ;;
  esac
}

configure_database() {
  local choice url
  choice=$(prompt_value '数据库 [1 随附 PostgreSQL / 2 外部 PostgreSQL / 回车返回]')
  case "$choice" in
    1)
      if [[ -n "$(personal_setting DATABASE_URL)" ]] && confirm_service_change; then
        save_personal_settings DATABASE_URL=
      fi
      ;;
    2)
      printf '连接串示例 postgresql://user:password@db.example.com:5432/multica?sslmode=require\n'
      printf '如果连接串中的密码含 @、# 或 /，请先进行 URL 编码。\n'
      while true; do
        url=$(prompt_value 'PostgreSQL 连接串（隐藏输入，回车返回）' hidden)
        [[ -n "$url" ]] || return 0
        if [[ "$url" =~ ^postgres(ql)?://[^[:space:]/]+/[^[:space:]/?\#]+[^[:space:]]*$ ]]; then break; fi
        printf '请输入包含主机和数据库名的 PostgreSQL 连接串。\n'
      done
      if confirm_service_change; then save_personal_settings "DATABASE_URL=$url"; fi
      ;;
    '') ;;
    *) printf '请输入 1 或 2。\n' ;;
  esac
}

configure_storage() {
  local choice bucket region endpoint access secret entered_region
  choice=$(prompt_value '附件存储 [1 本地文件 / 2 S3 兼容存储 / 回车返回]')
  case "$choice" in
    1)
      if [[ -n "$(personal_setting S3_BUCKET)" ]] && confirm_service_change; then
        save_personal_settings S3_BUCKET= S3_REGION= AWS_ENDPOINT_URL= AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY=
      fi
      ;;
    2)
      bucket=$(prompt_value '已创建的桶名（回车返回）')
      [[ -n "$bucket" ]] || return 0
      [[ "$bucket" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || { printf '请输入桶名，例如 multica。\n'; return 0; }
      region=$(personal_setting S3_REGION)
      region=${region:-us-east-1}
      while true; do
        entered_region=$(prompt_value "区域 [$region]（回车使用）")
        entered_region=${entered_region:-$region}
        if [[ "$entered_region" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]]; then
          region=$entered_region
          break
        fi
        printf '请输入存储服务配置的区域，例如 us-east-1。\n'
      done
      while true; do
        endpoint=$(prompt_value 'S3 API 地址（AWS S3 可留空）')
        if [[ -z "$endpoint" || "$endpoint" =~ ^https?://[^[:space:]/@?\#]+(/[^[:space:]?\#]*)?$ ]]; then break; fi
        printf '请输入以 http:// 或 https:// 开头的 S3 API 地址。\n'
      done
      while true; do
        access=$(prompt_value 'Access Key ID（隐藏输入，使用容器凭据链可留空）' hidden)
        secret=$(prompt_value 'Secret Access Key（隐藏输入，与 Access Key ID 同时填写或留空）' hidden)
        if [[ -n "$access" && -n "$secret" || -z "$access" && -z "$secret" ]]; then break; fi
        printf '请同时填写两项密钥，或将它们同时留空。\n'
      done
      if confirm_service_change; then
        save_personal_settings "S3_BUCKET=$bucket" "S3_REGION=$region" "AWS_ENDPOINT_URL=$endpoint" \
          "AWS_ACCESS_KEY_ID=$access" "AWS_SECRET_ACCESS_KEY=$secret"
      fi
      ;;
    '') ;;
    *) printf '请输入 1 或 2。\n' ;;
  esac
}

configure_redis() {
  local choice url
  local url_pattern='^rediss?://([^[:space:]/?#@]*@)?[^[:space:]/?#@]+([/?][^[:space:]#]*)?$'
  local options='1 不启用 / 2 自动部署 / 3 连接已有 Redis'
  if [[ -n ${deployment:-} && ! -s "$deployment/$redis_compose" ]]; then
    options='1 不启用 / 3 连接已有 Redis'
  fi
  while true; do
    choice=$(prompt_value "Redis [$options / 回车保持当前设置]")
    case "$choice" in
      1)
        if [[ "$(personal_setting MULTICA_MANAGED_REDIS)" == true || -n "$(personal_setting REDIS_URL)" ]]; then
          save_personal_settings MULTICA_MANAGED_REDIS= REDIS_URL=
        fi
        return 0
        ;;
      2)
        if [[ -n ${deployment:-} && ! -s "$deployment/$redis_compose" ]]; then
          printf '当前版本不支持自动部署 Redis。请先升级，或连接已有 Redis。\n'
          continue
        fi
        save_personal_settings MULTICA_MANAGED_REDIS=true REDIS_URL=
        return 0
        ;;
      3)
        while true; do
          url=$(prompt_value 'Redis 连接串（隐藏输入，回车返回）' hidden)
          [[ -n "$url" ]] || return 0
          if [[ "$url" =~ $url_pattern ]]; then break; fi
          printf '请输入 Redis 连接串，例如 redis://redis.example.com:6379/0。\n'
        done
        save_personal_settings MULTICA_MANAGED_REDIS= "REDIS_URL=$url"
        return 0
        ;;
      '') return 0 ;;
      *) printf '请输入菜单中的选项。\n' ;;
    esac
  done
}

configure_personal() {
  local choice database storage redis
  while true; do
    database='随附 PostgreSQL'
    storage='本地文件'
    redis='未启用'
    if [[ -n "$(personal_setting DATABASE_URL)" ]]; then database='外部 PostgreSQL'; fi
    if [[ -n "$(personal_setting S3_BUCKET)" ]]; then storage='S3 兼容存储'; fi
    if [[ "$(personal_setting MULTICA_MANAGED_REDIS)" == true ]]; then
      redis='自动部署'
    elif [[ -n "$(personal_setting REDIS_URL)" ]]; then
      redis='已有服务'
    fi
    printf '\n  1  访问端口（%s）\n  2  数据库（%s）\n  3  附件存储（%s）\n  4  Redis（%s）\n\n' "$host_port" "$database" "$storage" "$redis"
    choice=$(prompt_value '请选择 [1/2/3/4，回车完成]')
    case "$choice" in
      1)
        host_port=$(prompt_host_port "$host_port")
        save_host_port "$host_port"
        printf '访问端口已保存，下次启动时生效。\n'
        ;;
      2) configure_database ;;
      3) configure_storage ;;
      4) configure_redis ;;
      '') return 0 ;;
      *) printf '请输入 1、2、3 或 4。\n' ;;
    esac
  done
}

action=${1:-install}
case "$action" in
  -h|--help) show_help; exit 0 ;;
  install)
    if (( $# > 2 )) || [[ -n ${2:-} && ${2:-} != --yes ]]; then
      fail '升级选项为 install --yes。执行 bash multica-personal.sh --help 可查看用法。'
    fi
    ;;
  backup|restore)
    (( $# == 2 )) || fail '请在命令后提供一份备份文件的路径。'
    ;;
  configure|up|status|stop|logs|setup-code|reset-password)
    (( $# == 1 )) || fail '此命令不需要额外参数。'
    ;;
  *) fail '无法识别该命令。执行 bash multica-personal.sh --help 可查看用法。' ;;
esac

install_dir=${MULTICA_PERSONAL_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/multica-personal}
case "$install_dir" in
  /*) ;;
  *) install_dir="$PWD/$install_dir" ;;
esac
current_release="$install_dir/current-release"
host_port_file="$install_dir/host-port"
redis_compose=docker-compose.integrated.personal.redis.yml
personal_config=${INTEGRATED_PERSONAL_ENV_FILE:-$install_dir/.env.integrated.personal}
case "$personal_config" in
  /*) ;;
  *) personal_config="$PWD/$personal_config" ;;
esac
if [[ -n ${INTEGRATED_PERSONAL_ENV_FILE:-} || -f "$personal_config" ]]; then
  export INTEGRATED_PERSONAL_ENV_FILE="$personal_config"
fi

if [[ "$action" == configure ]]; then
  [[ -t 0 ]] || fail '请在终端中运行 bash multica-personal.sh configure。'
  if [[ -f "$current_release" ]] && read_release "$current_release"; then
    deployment="$install_dir/releases/$release_repo/$release_commit"
  fi
  host_port=$(read_host_port)
  if [[ -n ${INTEGRATED_HOST_PORT:-} ]]; then
    printf '当前环境指定了 INTEGRATED_HOST_PORT，优先使用该端口。\n'
  fi
  configure_personal
  exit 0
fi

command -v docker >/dev/null || fail '请先安装 Docker，并启动 Docker 服务。'
compose_version=$(docker compose version --short 2>/dev/null) || fail '请先安装 Docker Compose 插件（2.30 或以上）。'
compose_version=${compose_version#v}
if [[ ! "$compose_version" =~ ^([0-9]+)\.([0-9]+) ]] ||
  (( BASH_REMATCH[1] < 2 || (BASH_REMATCH[1] == 2 && BASH_REMATCH[2] < 30) )); then
  fail "Docker Compose 至少需要 2.30，当前版本为 $compose_version。"
fi
docker info >/dev/null 2>&1 || fail '无法连接 Docker。请确认 Docker 正在运行，且当前用户有权访问。'

port_override=${INTEGRATED_HOST_PORT:-}
if [[ -n "$port_override" ]]; then
  valid_host_port "$port_override" || fail 'INTEGRATED_HOST_PORT 应为 1 到 65535 之间的整数。'
  host_port=$((10#$port_override))
else
  host_port=$(read_host_port)
fi
export INTEGRATED_PERSONAL_LANG=zh-CN

if [[ "$action" == install || ( "$action" == restore && ! -f "$current_release" ) ]]; then
  command -v curl >/dev/null || fail '请先安装 curl，以便下载发布信息和部署文件。'
  repository=${MULTICA_RELEASE_REPOSITORY:-wsshow/multica}
  valid_repository "$repository" || fail '发布仓库地址应为 owner/repository。'
  requested_version=${MULTICA_PERSONAL_VERSION:-}
  if [[ -n "$requested_version" ]]; then
    [[ "$requested_version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail '请使用 vX.Y.Z 指定稳定版。'
    release_path="download/$requested_version"
    printf '\nMultica 个人版\n\n正在查找 %s…\n' "$requested_version"
  else
    release_path=latest/download
    printf '\nMultica 个人版\n\n正在查找最新稳定版…\n'
  fi
  umask 077
  mkdir -p "$install_dir/releases" || fail "无法创建安装目录 $install_dir。请检查写入权限。"
  temporary=$(mktemp -d "$install_dir/.install.XXXXXX") || fail '无法创建临时下载目录。'
  trap 'rm -rf -- "$temporary"' EXIT
  download "https://github.com/$repository/releases/$release_path/multica-personal-release.txt" "$temporary/release" ||
    fail "未能获取个人版发布信息。请检查网络，或在 https://github.com/$repository/releases 查看可用版本。"
  read_release "$temporary/release" && [[ "$release_repo" == "$repository" &&
    ( -z "$requested_version" || "$release_tag" == "$requested_version" ) ]] ||
    fail '发布信息格式不正确。请从仓库的发布页重试。'

  if [[ -f "$current_release" ]]; then
    IFS=' ' read -r installed_repo installed_tag installed_commit installed_image < "$current_release" ||
      fail '无法读取已安装版本。请保留现有数据后再修复本机的版本记录。'
    if [[ "$installed_tag" != "$release_tag" || "$installed_image" != "$release_image" ]]; then
      printf '已安装 %s，可更新到 %s。升级会自动应用数据库迁移。\n' "$installed_tag" "$release_tag"
      if [[ ${2:-} != --yes ]]; then
        if [[ ! -t 0 ]]; then
          fail '升级需要确认。请在终端运行脚本，或备份后使用 install --yes。'
        fi
        printf '\n  1  备份后升级（推荐）\n  2  直接升级\n  3  取消\n\n'
        while true; do
          printf '请选择 [1/2/3，回车取消] '
          answer=
          read -r answer || true
          case "$answer" in
            1)
              archive="$PWD/multica-backup-$(date +%Y%m%d-%H%M%S).tar"
              if ! (
                read_release "$current_release" || fail '已安装版本的记录不完整，无法自动备份。'
                export INTEGRATED_IMAGE="$release_image" INTEGRATED_HOST_PORT="$host_port"
                bash "$install_dir/releases/$release_repo/$release_commit/scripts/integrated.sh" personal-backup "$archive"
              ); then
                fail '备份未完成，已取消升级。'
              fi
              break
              ;;
            2) break ;;
            ''|3) printf '已取消升级。\n'; exit 0 ;;
            *) printf '请输入 1、2 或 3。\n' ;;
          esac
        done
      fi
    fi
  fi

  deployment="$install_dir/releases/$release_repo/$release_commit"
  missing=()
  for file in docker-compose.integrated.personal.yml docker-compose.integrated.personal.postgres.yml \
    scripts/integrated.sh scripts/integrated-data.sh .env.integrated.personal.example; do
    if [[ ! -s "$deployment/$file" ]]; then missing+=("$file"); fi
  done
  if (( ${#missing[@]} )); then
    printf '正在准备 %s 的部署文件…\n' "$release_tag"
    mkdir -p "$temporary/deployment/scripts" "$deployment/scripts"
    for file in "${missing[@]}"; do
      download "https://raw.githubusercontent.com/$release_repo/$release_commit/$file" "$temporary/deployment/$file" ||
        fail "未能下载 $file。请检查网络后重试。"
    done
    for file in "${missing[@]}"; do mv "$temporary/deployment/$file" "$deployment/$file"; done
  fi
  # Older releases use the same installer but did not ship the Redis override.
  if [[ ! -s "$deployment/$redis_compose" ]] && grep -Fq "$redis_compose" "$deployment/scripts/integrated.sh"; then
    download "https://raw.githubusercontent.com/$release_repo/$release_commit/$redis_compose" "$temporary/redis-compose" ||
      fail '未能下载 Redis 部署文件。请检查网络后重试。'
    mv "$temporary/redis-compose" "$deployment/$redis_compose"
  fi

  if [[ "$action" == install && ! -f "$current_release" && -t 0 && ${2:-} != --yes ]]; then
    if [[ ! -f "$host_port_file" && -z ${INTEGRATED_HOST_PORT:-} ]]; then
      host_port=$(prompt_host_port "$host_port")
    fi
    if [[ ! -f "$personal_config" ]]; then
      while true; do
        choice=$(prompt_value '数据库和附件 [1 自定义 / 回车使用随附 PostgreSQL 和本地附件]')
        case "$choice" in
          1) configure_personal; break ;;
          '') configure_redis; break ;;
          *) printf '请输入 1 或回车。\n' ;;
        esac
      done
    fi
  fi

  if [[ "$(personal_setting MULTICA_MANAGED_REDIS)" == true && ! -s "$deployment/$redis_compose" ]]; then
    fail '所选版本不支持自动部署 Redis。请选用较新版本，或先运行 bash multica-personal.sh configure 更改 Redis 设置。'
  fi
  if [[ ! -f "$host_port_file" ]]; then save_host_port "$host_port"; fi
  mv "$temporary/release" "$current_release"
  rm -rf -- "$temporary"
  trap - EXIT
  if [[ "$action" == install ]]; then action=up; fi
else
  [[ -f "$current_release" ]] && read_release "$current_release" ||
    fail '没有找到已安装的个人版。请先运行 bash multica-personal.sh。'
  deployment="$install_dir/releases/$release_repo/$release_commit"
fi

[[ -f "$deployment/scripts/integrated.sh" ]] || fail '本机部署文件缺失。请重新运行安装命令以修复。'
if [[ -f "$personal_config" ]]; then
  export INTEGRATED_PERSONAL_ENV_FILE="$personal_config"
fi
if [[ -n "$port_override" ]]; then host_port=$((10#$port_override)); fi
export INTEGRATED_IMAGE="$release_image" INTEGRATED_HOST_PORT="$host_port"
if [[ "$action" == up ]]; then
  printf '正在启动 Multica %s。首次启动需要下载镜像，请稍候。\n' "$release_tag"
  bash "$deployment/scripts/integrated.sh" personal ||
    fail '服务未能启动。如果需要修改端口或外部服务，先运行 bash multica-personal.sh configure，再运行 bash multica-personal.sh up 重试。'
else
  exec bash "$deployment/scripts/integrated.sh" "personal-$action" "${@:2}"
fi
