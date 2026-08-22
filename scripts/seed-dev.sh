#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo "Refusing to seed production." >&2
  exit 1
fi

npm --workspace apps/api run db:migrate
npm --workspace apps/api run db:seed
