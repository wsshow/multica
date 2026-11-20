# Sourced by integrated.sh after it selects the personal Compose services.

personal_data() (
  action=$1
  archive=$2
  if [[ "$managed_postgres" != true || "$personal_local_storage" != true ]]; then
    echo 'This command requires the managed personal database and local files. Back up externally configured services separately.' >&2
    return 1
  fi

  umask 077
  temporary=$(mktemp -d "$(dirname -- "$archive")/.multica-${action}.XXXXXX")
  restart_app=false
  cleanup() {
    local result=$?
    rm -rf -- "$temporary"
    if [[ "$restart_app" == true ]] && ! "${compose[@]}" start app; then
      echo 'Unable to restart Multica. Run make integrated-personal to start it again.' >&2
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
        echo 'Backup destination already exists. Choose a new archive path.' >&2
        return 1
      fi
      if [[ -z "$("${compose[@]}" ps --all --quiet app)" ]]; then
        echo 'Start and initialize the personal instance before backing it up.' >&2
        return 1
      fi

      "${compose[@]}" up -d --wait postgres
      if [[ -n "$("${compose[@]}" ps --status running --quiet app)" ]]; then
        restart_app=true
        "${compose[@]}" stop app
      fi

      "${compose[@]}" exec -T postgres pg_dump --host=/var/run/postgresql \
        --username=multica --dbname=multica --format=custom --no-privileges > "$temporary/database.dump"
      "${compose[@]}" run --rm --no-deps -T --entrypoint tar app \
        -C /app/data -cf - . > "$temporary/data.tar"
      tar -cf "$temporary/backup.tar" -C "$temporary" database.dump data.tar
      ln -- "$temporary/backup.tar" "$archive"
      echo "Saved Multica backup to $archive"
      ;;
    restore)
      if [[ ! -f "$archive" ]]; then
        echo 'Multica backup archive does not exist.' >&2
        return 1
      fi
      if [[ -n "$("${compose[@]}" ps --all --quiet app)" ]]; then
        echo 'Restore to a fresh personal instance before starting its app.' >&2
        return 1
      fi

      tar -xOf "$archive" database.dump > "$temporary/database.dump"
      tar -xOf "$archive" data.tar > "$temporary/data.tar"
      "${compose[@]}" up -d --wait postgres
      empty=$("${compose[@]}" exec -T postgres psql --host=/var/run/postgresql \
        --username=multica --dbname=multica --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 \
        --command="SELECT NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') AND schemaname NOT LIKE 'pg_toast%')")
      if [[ "$empty" != t ]]; then
        echo 'Restore requires an empty personal database.' >&2
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
      echo 'Restored Multica data. Run make integrated-personal with the matching image version to start the app.'
      ;;
  esac
)
