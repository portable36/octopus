#!/usr/bin/env bash
# Host-side Postgres backup for Octopus prod compose (Phase 29).
# Writes custom-format dumps under BACKUP_DIR, retains 30 daily + 12 monthly.
#
# Usage (on VPS, from /opt/octopus or any checkout with docker-compose.prod.yml):
#   ./deploy/backup-postgres.sh
#
# Cron (daily 02:15 UTC example):
#   15 2 * * * DEPLOY_COMPOSE_DIR=/opt/octopus /opt/octopus/deploy/backup-postgres.sh >>/var/log/octopus-backup.log 2>&1
#
# Env overrides:
#   DEPLOY_COMPOSE_DIR   default /opt/octopus
#   DEPLOY_COMPOSE_FILE  default docker-compose.prod.yml
#   BACKUP_DIR           default $DEPLOY_COMPOSE_DIR/backups/postgres
#   PG_SERVICE           default postgres
#   PG_USER / PG_DB      default octopus
#   RETAIN_DAILY_DAYS    default 30
#   RETAIN_MONTHLY       default 12
set -euo pipefail

COMPOSE_DIR="${DEPLOY_COMPOSE_DIR:-/opt/octopus}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-${COMPOSE_DIR}/backups/postgres}"
PG_SERVICE="${PG_SERVICE:-postgres}"
PG_USER="${PG_USER:-octopus}"
PG_DB="${PG_DB:-octopus}"
RETAIN_DAILY_DAYS="${RETAIN_DAILY_DAYS:-30}"
RETAIN_MONTHLY="${RETAIN_MONTHLY:-12}"

cd "${COMPOSE_DIR}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "missing ${COMPOSE_DIR}/${COMPOSE_FILE}" >&2
  exit 1
fi

if ! docker compose -f "${COMPOSE_FILE}" ps --status running --services 2>/dev/null | grep -qx "${PG_SERVICE}"; then
  echo "postgres service '${PG_SERVICE}' is not running under ${COMPOSE_FILE}" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}/daily" "${BACKUP_DIR}/monthly"
chmod 700 "${BACKUP_DIR}" "${BACKUP_DIR}/daily" "${BACKUP_DIR}/monthly" 2>/dev/null || true

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
day="$(date -u +%Y%m%d)"
month="$(date -u +%Y%m)"
daily_path="${BACKUP_DIR}/daily/${PG_DB}-${stamp}.dump"
tmp_path="${daily_path}.partial"

echo "Backing up ${PG_DB} → ${daily_path}"
docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
  pg_dump -U "${PG_USER}" -d "${PG_DB}" -Fc --no-owner --no-acl \
  >"${tmp_path}"
mv "${tmp_path}" "${daily_path}"
chmod 600 "${daily_path}"

# First successful backup of the UTC month → monthly copy (retention ladder).
monthly_path="${BACKUP_DIR}/monthly/${PG_DB}-${month}.dump"
if [[ ! -f "${monthly_path}" ]]; then
  cp -p "${daily_path}" "${monthly_path}"
  chmod 600 "${monthly_path}"
  echo "Monthly snapshot: ${monthly_path}"
fi

# Prune dailies older than retention (GNU find -mtime; busybox ok on alpine hosts too).
find "${BACKUP_DIR}/daily" -type f -name "${PG_DB}-*.dump" -mtime "+${RETAIN_DAILY_DAYS}" -delete 2>/dev/null || true

# Keep newest N monthly dumps.
mapfile -t monthlies < <(ls -1t "${BACKUP_DIR}/monthly/${PG_DB}-"*.dump 2>/dev/null || true)
if ((${#monthlies[@]} > RETAIN_MONTHLY)); then
  for stale in "${monthlies[@]:RETAIN_MONTHLY}"; do
    rm -f "${stale}"
  done
fi

bytes="$(wc -c <"${daily_path}" | tr -d ' ')"
echo "OK day=${day} bytes=${bytes} file=${daily_path}"
