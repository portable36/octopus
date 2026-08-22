#!/usr/bin/env bash
set -Eeuo pipefail

echo "== Production validation =="

required_commands=(node npm)
for cmd in "${required_commands[@]}"; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Missing required command: $cmd" >&2
    exit 1
  }
done

echo "[1/8] Formatting"
npm run format:check

echo "[2/8] Lint"
npm run lint

echo "[3/8] Type checking"
npm run typecheck

echo "[4/8] Architecture boundaries"
npm run architecture

echo "[5/8] Unit + integration tests"
npm run test

echo "[6/8] Dependency audit"
npm run security

echo "[7/8] Migration validation"
npm run db:migrate:check

echo "[8/8] Production build"
npm run build

echo "Validation passed."
