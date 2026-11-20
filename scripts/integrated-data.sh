# Sourced by integrated.sh after it selects the personal Compose services.

personal_data() (
  action=$1
  archive=$2
  if [[ "$managed_postgres" != true || "$personal_local_storage" != true ]]; then
    personal_message '此命令适用于默认数据库和本地附件。外部 PostgreSQL 或 S3 请单独备份或还原。' \
      'This command requires the managed personal database and local files. Back up externally configured services separately.' >&2
    return 1
  fi

  umask 077
  temporary=$(mktemp -d "$(dirname -- "$archive")/.multica-${action}.XXXXXX")
  restart_app=false
  stop_database=false
  cleanup() {
    local result=$?
    rm -rf -- "$temporary"
    if [[ "$restart_app" == true ]] && ! "${compose[@]}" start app; then
      personal_message '无法重新启动 Multica。运行 bash multica-personal.sh up 重试。' \
        'Unable to restart Multica. Run make integrated-personal to start it again.' >&2
      result=1
    fi
    if [[ "$stop_database" == true ]] && ! "${compose[@]}" stop postgres; then
      personal_message '备份后的数据库停止失败。运行 bash multica-personal.sh stop 重试。' \
        'Unable to stop the database after backup. Run make integrated-personal-stop.' >&2
      result=1
    fi
    exit "$result"
  }
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  case "$action" in
    backup)
      if [[ -e "$archive" || -L "$archive" ]]; then
        personal_message '备份文件已存在，请换一个保存路径。' \
          'Backup destination already exists. Choose a new archive path.' >&2
        return 1
      fi
      if [[ -z "$("${compose[@]}" ps --all --quiet app)" ]]; then
        personal_message '请先启动并初始化个人版，再备份数据。' \
          'Start and initialize the personal instance before backing it up.' >&2
        return 1
      fi

      if [[ -z "$("${compose[@]}" ps --status running --quiet postgres)" ]]; then
        stop_database=true
      fi
      "${compose[@]}" up -d --wait postgres
      if [[ -n "$("${compose[@]}" ps --status running --quiet app)" ]]; then
        stop_database=false
        restart_app=true
        "${compose[@]}" stop app
      fi

      "${compose[@]}" exec -T postgres pg_dump --host=/var/run/postgresql \
        --username=multica --dbname=multica --format=custom --no-privileges > "$temporary/database.dump"
      "${compose[@]}" run --rm --no-deps -T --entrypoint tar app \
        -C /app/data -cf - . > "$temporary/data.tar"
      tar -cf "$temporary/backup.tar" -C "$temporary" database.dump data.tar
      ln -- "$temporary/backup.tar" "$archive"
      personal_message "备份已保存到 $archive" "Saved Multica backup to $archive"
      ;;
    restore)
      if [[ ! -f "$archive" ]]; then
        personal_message '找不到指定的备份文件。' 'Multica backup archive does not exist.' >&2
        return 1
      fi
      if [[ -n "$("${compose[@]}" ps --all --quiet app)" ]]; then
        personal_message '请在启动新实例之前还原备份。现有实例的数据已保留。' \
          'Restore to a fresh personal instance before starting its app.' >&2
        return 1
      fi

      tar -xOf "$archive" database.dump > "$temporary/database.dump"
      tar -xOf "$archive" data.tar > "$temporary/data.tar"
      "${compose[@]}" up -d --wait postgres
      empty=$("${compose[@]}" exec -T postgres psql --host=/var/run/postgresql \
        --username=multica --dbname=multica --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 \
        --command="SELECT NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') AND schemaname NOT LIKE 'pg_toast%')")
      if [[ "$empty" != t ]]; then
        personal_message '还原需要使用空数据库。' 'Restore requires an empty personal database.' >&2
        return 1
      fi

      "${compose[@]}" run --rm --no-deps -T --entrypoint sh app -ec '
        if [ -n "$(ls -A /app/data)" ]; then
          echo "Restore requires an empty personal data volume." >&2
          exit 1
        fi
        mkdir /app/data/.restore
        if ! tar -C /app/data/.restore -xf -; then
          rm -rf /app/data/.restore
          exit 1
        fi
      ' < "$temporary/data.tar"
      if ! "${compose[@]}" exec -T postgres pg_restore --host=/var/run/postgresql \
        --username=multica --dbname=multica --single-transaction --exit-on-error \
        --no-owner --no-privileges < "$temporary/database.dump"; then
        "${compose[@]}" run --rm --no-deps -T --entrypoint rm app -rf /app/data/.restore
        return 1
      fi
      "${compose[@]}" run --rm --no-deps -T --entrypoint sh app -ec '
        cd /app/data/.restore
        find . -mindepth 1 -maxdepth 1 -exec mv {} /app/data/ \;
        cd /app/data
        rmdir .restore
      '
      personal_message '数据已还原。运行 bash multica-personal.sh up 启动服务。' \
        'Restored Multica data. Run make integrated-personal with the matching image version to start the app.'
      ;;
  esac
)
