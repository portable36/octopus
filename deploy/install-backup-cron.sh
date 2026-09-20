#!/usr/bin/env bash
# Install (or refresh) the daily Postgres backup cron on this host (Phase 29).
# Run once on the VPS after compose is live under DEPLOY_COMPOSE_DIR.
#
#   cd /opt/octopus && chmod +x deploy/install-backup-cron.sh deploy/backup-postgres.sh
#   ./deploy/install-backup-cron.sh
#
# Env:
#   DEPLOY_COMPOSE_DIR   default /opt/octopus
#   BACKUP_CRON_SCHEDULE default "15 2 * * *" (02:15 UTC daily)
#   BACKUP_CRON_LOG      default /var/log/octopus-backup.log
set -euo pipefail

COMPOSE_DIR="${DEPLOY_COMPOSE_DIR:-/opt/octopus}"
SCHEDULE="${BACKUP_CRON_SCHEDULE:-15 2 * * *}"
LOG_FILE="${BACKUP_CRON_LOG:-/var/log/octopus-backup.log}"
BACKUP_SCRIPT="${COMPOSE_DIR}/deploy/backup-postgres.sh"
MARKER="# octopus-postgres-backup"

if [[ ! -f "${BACKUP_SCRIPT}" ]]; then
  echo "missing ${BACKUP_SCRIPT} — checkout/pull the repo under ${COMPOSE_DIR} first" >&2
  exit 1
fi

chmod +x "${BACKUP_SCRIPT}" "${COMPOSE_DIR}/deploy/install-backup-cron.sh" 2>/dev/null || true

# Smoke once before installing cron (fails closed if postgres is down).
echo "Running one-shot backup smoke…"
DEPLOY_COMPOSE_DIR="${COMPOSE_DIR}" "${BACKUP_SCRIPT}"

line="${SCHEDULE} DEPLOY_COMPOSE_DIR=${COMPOSE_DIR} ${BACKUP_SCRIPT} >>${LOG_FILE} 2>&1 ${MARKER}"

existing="$(crontab -l 2>/dev/null || true)"
filtered="$(printf '%s\n' "${existing}" | grep -v "${MARKER}" || true)"
{
  printf '%s\n' "${filtered}"
  printf '%s\n' "${line}"
} | grep -v '^$' | crontab -

echo "Installed cron:"
crontab -l | grep "${MARKER}" || true
echo "Log: ${LOG_FILE}"
echo "OK — daily Postgres backups scheduled."
