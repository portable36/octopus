#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const migrationEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://octopus:octopus@localhost:5432/octopus',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET ?? 'local-migration-secret-with-at-least-32-characters',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '15m',
  MEILISEARCH_HOST: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
  MEILISEARCH_API_KEY: process.env.MEILISEARCH_API_KEY ?? 'masterKey',
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? 'minioadmin',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? 'minioadmin',
  S3_BUCKET: process.env.S3_BUCKET ?? 'octopus-media',
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:3001',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  SHUTDOWN_TIMEOUT_MS: process.env.SHUTDOWN_TIMEOUT_MS ?? '10000',
};

function runMigrationCommand(script) {
  return spawnSync(`${npmCommand} run ${script} -w backend`, {
    stdio: 'inherit',
    shell: true,
    env: migrationEnv,
  });
}

if (process.env.SKIP_MIGRATION_CHECK === '1') {
  console.log('Migration validation skipped (SKIP_MIGRATION_CHECK=1).');
  process.exit(0);
}

console.log('Applying database migrations...');
const up = runMigrationCommand('migration:up');
if (up.status !== 0) {
  if (process.env.CI !== 'true') {
    console.warn(
      'Migration validation skipped locally: ensure PostgreSQL is running (docker compose up postgres).',
    );
    process.exit(0);
  }
  console.error('Migration apply failed.');
  process.exit(up.status ?? 1);
}

console.log('Checking for pending migrations...');
const pending = runMigrationCommand('migration:pending');
if (pending.status !== 0) {
  console.error('Pending migrations remain after apply.');
  process.exit(pending.status ?? 1);
}

console.log('Migration validation passed.');
