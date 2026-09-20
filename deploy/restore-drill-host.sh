#!/usr/bin/env bash
# Host-side Postgres restore drill (Phase 29 quarterly cadence).
# Restores the newest daily dump into an isolated DB; does not touch the live DB.
#
# Prerequisites: deploy/backup-postgres.sh has produced at least one daily dump.
#
#   DEPLOY_COMPOSE_DIR=/opt/octopus ./deploy/restore-drill-host.sh
#
# Env:
#   DEPLOY_COMPOSE_DIR / DEPLOY_COMPOSE_FILE / PG_* / BACKUP_DIR — same as backup-postgres.sh
#   RESTORE_DRILL_DB   default octopus_restore_drill
set -euo pipefail

COMPOSE_DIR="${DEPLOY_COMPOSE_DIR:-/opt/octopus}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-${COMPOSE_DIR}/backups/postgres}"
PG_SERVICE="${PG_SERVICE:-postgres}"
PG_USER="${PG_USER:-octopus}"
PG_DB="${PG_DB:-octopus}"
DRILL_DB="${RESTORE_DRILL_DB:-octopus_restore_drill}"

cd "${COMPOSE_DIR}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "missing ${COMPOSE_DIR}/${COMPOSE_FILE}" >&2
  exit 1
fi

if ! docker compose -f "${COMPOSE_FILE}" ps --status running --services 2>/dev/null | grep -qx "${PG_SERVICE}"; then
  echo "postgres service '${PG_SERVICE}' is not running" >&2
  exit 1
fi

latest="$(ls -1t "${BACKUP_DIR}/daily/${PG_DB}-"*.dump 2>/dev/null | head -n 1 || true)"
if [[ -z "${latest}" ]]; then
  echo "no daily dumps under ${BACKUP_DIR}/daily — run deploy/backup-postgres.sh first" >&2
  exit 1
fi

started="$(date +%s)"
echo "Restore drill from ${latest} → ${DRILL_DB}"

docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
  psql -U "${PG_USER}" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS ${DRILL_DB};" \
  -c "CREATE DATABASE ${DRILL_DB};"

docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
  pg_restore -U "${PG_USER}" -d "${DRILL_DB}" --clean --if-exists --no-owner --no-acl \
  <"${latest}" || true

tables="$(
  docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
    psql -U "${PG_USER}" -d "${DRILL_DB}" -At -c \
    "SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public';"
)"
tables="$(echo "${tables}" | tr -d '[:space:]')"

if [[ -z "${tables}" || "${tables}" -lt 1 ]]; then
  echo "Restore drill FAILED: no public tables in ${DRILL_DB}" >&2
  exit 1
fi

elapsed=$(( $(date +%s) - started ))
echo "Restore drill OK: ${tables} public tables in ${DRILL_DB}; elapsed ${elapsed}s."
echo "Record backup=${latest} started_unix=${started} elapsed_s=${elapsed} in ops notes."
