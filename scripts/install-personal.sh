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
  bash multica-personal.sh install --yes   无需交互，允许升级到最新稳定版
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
  up|status|stop|logs|setup-code|reset-password)
    (( $# == 1 )) || fail '此命令不需要额外参数。'
    ;;
  *) fail '无法识别该命令。执行 bash multica-personal.sh --help 可查看用法。' ;;
esac

command -v docker >/dev/null || fail '请先安装 Docker，并启动 Docker 服务。'
compose_version=$(docker compose version --short 2>/dev/null) || fail '请先安装 Docker Compose 插件（2.30 或以上）。'
compose_version=${compose_version#v}
if [[ ! "$compose_version" =~ ^([0-9]+)\.([0-9]+) ]] ||
  (( BASH_REMATCH[1] < 2 || (BASH_REMATCH[1] == 2 && BASH_REMATCH[2] < 30) )); then
  fail "Docker Compose 至少需要 2.30，当前版本为 $compose_version。"
fi
docker info >/dev/null 2>&1 || fail '无法连接 Docker。请确认 Docker 正在运行，且当前用户有权访问。'

install_dir=${MULTICA_PERSONAL_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/multica-personal}
case "$install_dir" in
  /*) ;;
  *) install_dir="$PWD/$install_dir" ;;
esac
current_release="$install_dir/current-release"
case ${INTEGRATED_PERSONAL_ENV_FILE:-} in
  '')
    if [[ -f "$install_dir/.env.integrated.personal" ]]; then
      export INTEGRATED_PERSONAL_ENV_FILE="$install_dir/.env.integrated.personal"
    fi
    ;;
  /*) ;;
  *) export INTEGRATED_PERSONAL_ENV_FILE="$PWD/$INTEGRATED_PERSONAL_ENV_FILE" ;;
esac
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
                export INTEGRATED_IMAGE="$release_image"
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
export INTEGRATED_IMAGE="$release_image"
if [[ "$action" == up ]]; then
  printf '正在启动 Multica %s。首次启动需要下载镜像，请稍候。\n' "$release_tag"
  bash "$deployment/scripts/integrated.sh" personal ||
    fail '服务未能启动。解决上面的错误后可运行 bash multica-personal.sh up 重试。'
else
  exec bash "$deployment/scripts/integrated.sh" "personal-$action" "${@:2}"
fi
