#!/usr/bin/env node
/**
 * Local API image deploy → readiness → rollback drill (Phase 30).
 * Proves build + rolling switch between two image tags against Compose deps.
 * Does not down-migrate schema (matches deployment.md policy).
 *
 * Usage: npm.cmd run deploy:drill
 * Requires: Docker + `docker compose up -d postgres redis`
 *
 * Env:
 *   DEPLOY_DRILL_PORT       host port (default 13100)
 *   DEPLOY_DRILL_SKIP_BUILD set to 1 to reuse existing drill images
 *   DEPLOY_DRILL_KEEP       set to 1 to leave the container running
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const IMAGE_A = process.env.DEPLOY_DRILL_IMAGE_A ?? 'octopus-api:drill-a';
const IMAGE_B = process.env.DEPLOY_DRILL_IMAGE_B ?? 'octopus-api:drill-b';
const CONTAINER = process.env.DEPLOY_DRILL_CONTAINER ?? 'octopus-deploy-drill';
const HOST_PORT = process.env.DEPLOY_DRILL_PORT ?? '13100';
const SKIP_BUILD = process.env.DEPLOY_DRILL_SKIP_BUILD === '1';
const KEEP = process.env.DEPLOY_DRILL_KEEP === '1';
const HEALTH_BASE = `http://127.0.0.1:${HOST_PORT}/api/v1/health`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = (result.stderr ?? '').toString().trim();
    const stdout = (result.stdout ?? '').toString().trim();
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status}): ${stderr || stdout || 'no output'}`,
    );
  }
  return result;
}

function dockerCompose(args, options = {}) {
  return run('docker', ['compose', ...args], { stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

function docker(args, options = {}) {
  return run('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

function ensureDeps() {
  try {
    docker(['version']);
  } catch {
    console.error('Deploy drill skipped: Docker is not available.');
    process.exit(0);
  }

  let services;
  try {
    const ps = dockerCompose(['ps', '--status', 'running', '--services']);
    services = (ps.stdout ?? '')
      .toString('utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(
      `Deploy drill skipped: Docker Compose unavailable (${error instanceof Error ? error.message : error}).`,
    );
    process.exit(0);
  }

  for (const required of ['postgres', 'redis']) {
    if (!services.includes(required)) {
      console.error(
        `Deploy drill skipped: ${required} is not running. Start with: docker compose up -d postgres redis`,
      );
      process.exit(0);
    }
  }
}

function composeNetwork() {
  const idResult = dockerCompose(['ps', '-q', 'postgres']);
  const containerId = (idResult.stdout ?? '').toString('utf8').trim().split(/\r?\n/)[0];
  if (!containerId) {
    throw new Error('Could not resolve postgres container id.');
  }
  const networks = docker([
    'inspect',
    '-f',
    '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}',
    containerId,
  ]);
  const name = (networks.stdout ?? '').toString('utf8').trim().split(/\r?\n/)[0]?.trim();
  if (!name) {
    throw new Error('Could not resolve Compose network for postgres.');
  }
  return name;
}

function removeContainerQuiet() {
  spawnSync('docker', ['rm', '-f', CONTAINER], { encoding: 'utf8', shell: false });
}

function buildImages() {
  if (SKIP_BUILD) {
    console.log(`Skipping image build (DEPLOY_DRILL_SKIP_BUILD=1); using ${IMAGE_A} / ${IMAGE_B}.`);
    return;
  }
  console.log(`Building ${IMAGE_A} from backend/Dockerfile…`);
  docker(['build', '-f', 'backend/Dockerfile', '-t', IMAGE_A, '.'], {
    stdio: 'inherit',
  });
  docker(['tag', IMAGE_A, IMAGE_B]);
  console.log(`Tagged ${IMAGE_B} (previous/current pair for rollback).`);
}

function startContainer(image, network) {
  removeContainerQuiet();
  docker([
    'run',
    '-d',
    '--name',
    CONTAINER,
    '--network',
    network,
    '-p',
    `${HOST_PORT}:3000`,
    '-e',
    'NODE_ENV=development',
    '-e',
    'PORT=3000',
    '-e',
    'DATABASE_URL=postgresql://octopus_app:octopus_app@postgres:5432/octopus',
    'DATABASE_OWNER_URL=postgresql://octopus:octopus@postgres:5432/octopus',
    '-e',
    'REDIS_URL=redis://redis:6379',
    '-e',
    'JWT_SECRET=deploy-drill-secret-with-at-least-32-chars',
    '-e',
    'JWT_EXPIRES_IN=15m',
    '-e',
    'MEILISEARCH_HOST=http://meilisearch:7700',
    '-e',
    'MEILISEARCH_API_KEY=masterKey',
    '-e',
    'S3_ENDPOINT=http://minio:9000',
    '-e',
    'S3_ACCESS_KEY=minioadmin',
    '-e',
    'S3_SECRET_KEY=minioadmin',
    '-e',
    'S3_BUCKET=octopus-media',
    '-e',
    'CORS_ORIGINS=http://localhost:3001',
    '-e',
    'LOG_LEVEL=warn',
    '-e',
    'OUTBOX_DISPATCH_ENABLED=false',
    '-e',
    'SHUTDOWN_TIMEOUT_MS=5000',
    image,
  ]);
}

async function waitForHealth(label, timeoutMs = 90_000) {
  const started = Date.now();
  let lastError = 'not started';
  while (Date.now() - started < timeoutMs) {
    try {
      const live = await fetch(`${HEALTH_BASE}/live`);
      if (!live.ok) {
        lastError = `live HTTP ${live.status}`;
      } else {
        const liveBody = await live.json();
        if (liveBody?.status !== 'ok') {
          lastError = `live status=${String(liveBody?.status)}`;
        } else {
          const ready = await fetch(`${HEALTH_BASE}/ready`);
          if (!ready.ok) {
            lastError = `ready HTTP ${ready.status}`;
          } else {
            console.log(`  ${label}: live+ready OK (${Date.now() - started}ms)`);
            return;
          }
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Health check failed for ${label}: ${lastError}`);
}

async function main() {
  ensureDeps();
  const started = Date.now();
  const network = composeNetwork();
  console.log(`Compose network: ${network}`);

  buildImages();

  try {
    console.log(`Deploy A (${IMAGE_A})…`);
    startContainer(IMAGE_A, network);
    await waitForHealth('deploy-a');

    console.log(`Rolling deploy to B (${IMAGE_B})…`);
    startContainer(IMAGE_B, network);
    await waitForHealth('deploy-b');

    console.log(`Rollback to A (${IMAGE_A}) — previous image, no down-migrate…`);
    startContainer(IMAGE_A, network);
    await waitForHealth('rollback-a');

    const elapsedMs = Date.now() - started;
    console.log(
      `Deploy/rollback drill OK on :${HOST_PORT}; elapsed ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(1)}s).`,
    );
    console.log('Record this when running the quarterly prod drill (redeploy previous digest).');
  } finally {
    if (!KEEP) {
      removeContainerQuiet();
    } else {
      console.log(`Left container ${CONTAINER} running (DEPLOY_DRILL_KEEP=1).`);
    }
  }
}

try {
  await main();
} catch (error) {
  removeContainerQuiet();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
