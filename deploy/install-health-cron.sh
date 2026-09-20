#!/usr/bin/env bash
# Install (or refresh) the host health-probe cron (Phase 28 uptime + optional pager).
# Run once on the VPS after compose is live under DEPLOY_COMPOSE_DIR.
#
#   cd /opt/octopus && chmod +x deploy/install-health-cron.sh deploy/check-health.sh
#   ./deploy/install-health-cron.sh
#
# Env:
#   DEPLOY_COMPOSE_DIR   default /opt/octopus
#   HEALTH_CRON_SCHEDULE default "*/5 * * * *" (every 5 minutes)
#   HEALTH_CRON_LOG      default /var/log/octopus-health.log
#   API_BASE             default http://127.0.0.1:4000/api/v1
#   STORE_BASE           default http://127.0.0.1:3000
#   PAGER_WEBHOOK_URL    optional Slack/Discord/Better Stack webhook on probe failure
#
# If host.secrets.env (or .env) next to compose defines those vars, they are sourced
# for the one-shot smoke and baked into the crontab line.
set -euo pipefail

COMPOSE_DIR="${DEPLOY_COMPOSE_DIR:-/opt/octopus}"
SCHEDULE="${HEALTH_CRON_SCHEDULE:-*/5 * * * *}"
LOG_FILE="${HEALTH_CRON_LOG:-/var/log/octopus-health.log}"
HEALTH_SCRIPT="${COMPOSE_DIR}/deploy/check-health.sh"
MARKER="# octopus-health-probe"

if [[ ! -f "${HEALTH_SCRIPT}" ]]; then
  echo "missing ${HEALTH_SCRIPT} — checkout/pull the repo under ${COMPOSE_DIR} first" >&2
  exit 1
fi

chmod +x "${HEALTH_SCRIPT}" "${COMPOSE_DIR}/deploy/install-health-cron.sh" 2>/dev/null || true

# Load optional host secrets for API_BASE / STORE_BASE / PAGER_WEBHOOK_URL.
for candidate in "${COMPOSE_DIR}/host.secrets.env" "${COMPOSE_DIR}/.env"; do
  if [[ -f "${candidate}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${candidate}"
    set +a
    break
  fi
done

API_BASE="${API_BASE:-http://127.0.0.1:4000/api/v1}"
STORE_BASE="${STORE_BASE:-http://127.0.0.1:3000}"

echo "Running one-shot health smoke (API_BASE=${API_BASE})…"
API_BASE="${API_BASE}" STORE_BASE="${STORE_BASE}" \
  PAGER_WEBHOOK_URL="${PAGER_WEBHOOK_URL:-}" \
  "${HEALTH_SCRIPT}"

env_prefix="API_BASE=${API_BASE} STORE_BASE=${STORE_BASE}"
if [[ -n "${PAGER_WEBHOOK_URL:-}" ]]; then
  env_prefix="${env_prefix} PAGER_WEBHOOK_URL=${PAGER_WEBHOOK_URL}"
  echo "Pager webhook: configured"
else
  echo "Pager webhook: unset (set PAGER_WEBHOOK_URL in host.secrets.env to notify on FAIL)"
fi

line="${SCHEDULE} ${env_prefix} ${HEALTH_SCRIPT} >>${LOG_FILE} 2>&1 ${MARKER}"

existing="$(crontab -l 2>/dev/null || true)"
filtered="$(printf '%s\n' "${existing}" | grep -v "${MARKER}" || true)"
{
  printf '%s\n' "${filtered}"
  printf '%s\n' "${line}"
} | grep -v '^$' | crontab -

echo "Installed cron:"
crontab -l | grep "${MARKER}" || true
echo "Log: ${LOG_FILE}"
echo "OK — health probes scheduled every 5m (or HEALTH_CRON_SCHEDULE)."
