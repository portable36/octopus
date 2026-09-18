#!/usr/bin/env bash
# Host / uptime probes for Octopus (Phase 28 monitoring contract).
# Usage:
#   ./check-health.sh
#   API_BASE=https://api.example.com ./check-health.sh
# Cron example (every 5m): */5 * * * * /opt/octopus/deploy/check-health.sh >>/var/log/octopus-health.log 2>&1
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:4000/api/v1}"
STORE_BASE="${STORE_BASE:-http://127.0.0.1:3000}"
FAIL=0

probe() {
  local name="$1"
  local url="$2"
  if curl -fsS --max-time 10 "$url" >/dev/null; then
    echo "ok  ${name}  ${url}"
  else
    echo "FAIL ${name}  ${url}" >&2
    FAIL=1
  fi
}

probe live "${API_BASE}/health/live"
probe ready "${API_BASE}/health/ready"
# Alerts endpoint is public diagnostic JSON; non-2xx still fails the probe.
probe alerts "${API_BASE}/health/alerts"
probe storefront "${STORE_BASE}/"

if [[ "${FAIL}" -ne 0 ]]; then
  exit 1
fi
echo "all probes ok"
