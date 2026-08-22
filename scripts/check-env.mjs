#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const envExamplePath = path.join(root, '.env.example');

if (!existsSync(envExamplePath)) {
  console.error('.env.example is missing.');
  process.exit(1);
}

const exampleKeys = new Set(
  readFileSync(envExamplePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim()),
);

const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'MEILISEARCH_HOST',
  'MEILISEARCH_API_KEY',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_BUCKET',
  'CORS_ORIGINS',
  'LOG_LEVEL',
  'SHUTDOWN_TIMEOUT_MS',
];

const missing = requiredVars.filter((v) => !exampleKeys.has(v));
if (missing.length > 0) {
  console.error(`.env.example is missing required variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('.env.example covers all required variables.');
