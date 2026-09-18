#!/usr/bin/env bash
# Host-side rolling pull for Octopus prod compose.
# Usage: OCTOPUS_IMAGE=ghcr.io/org/octopus:sha ./host-pull-roll.sh
# Or:    ./host-pull-roll.sh ghcr.io/org/octopus:sha
# Secrets: ensure COMPOSE_DIR has .env and/or host.secrets.env (see host.secrets.env.example).
# Health:  after deploy, optional ./check-health.sh
set -euo pipefail

IMAGE="${1:-${OCTOPUS_IMAGE:-}}"
if [[ -z "${IMAGE}" ]]; then
  echo "usage: $0 <image-ref>   (or set OCTOPUS_IMAGE)" >&2
  exit 2
fi

COMPOSE_DIR="${DEPLOY_COMPOSE_DIR:-/opt/octopus}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-docker-compose.prod.yml}"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:4000/api/v1/health/ready}"
HEALTH_TIMEOUT_SEC="${DEPLOY_HEALTH_TIMEOUT_SEC:-180}"

cd "${COMPOSE_DIR}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "missing ${COMPOSE_DIR}/${COMPOSE_FILE}" >&2
  exit 1
fi

PREV_REF=""
CID="$(docker compose -f "${COMPOSE_FILE}" ps -q backend-api 2>/dev/null || true)"
if [[ -n "${CID}" ]]; then
  PREV_REF="$(docker inspect --format='{{.Config.Image}}' "${CID}" 2>/dev/null || true)"
fi
export OCTOPUS_IMAGE="${IMAGE}"

echo "Pulling ${OCTOPUS_IMAGE}…"
docker compose -f "${COMPOSE_FILE}" pull backend-api seo-worker frontend-store

echo "Rolling up (no rebuild)…"
docker compose -f "${COMPOSE_FILE}" up -d --no-build --remove-orphans backend-api seo-worker frontend-store

echo "Waiting for readiness at ${HEALTH_URL}…"
deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
until curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo "Readiness timed out; attempting rollback…" >&2
    if [[ -n "${PREV_REF}" && "${PREV_REF}" != "${IMAGE}" ]]; then
      export OCTOPUS_IMAGE="${PREV_REF}"
      docker compose -f "${COMPOSE_FILE}" up -d --no-build backend-api seo-worker frontend-store || true
    fi
    exit 1
  fi
  sleep 5
done

echo "Deploy healthy: ${OCTOPUS_IMAGE}"
