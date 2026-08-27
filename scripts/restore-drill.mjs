#!/usr/bin/env node
/**
 * Local Postgres backup → restore drill (Phase 29).
 * Proves dump/restore against Docker Compose; records wall-clock RTO for the drill DB.
 *
 * Usage: npm.cmd run restore:drill
 * Requires: docker compose postgres healthy (docker compose up -d postgres)
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const COMPOSE_SERVICE = 'postgres';
const SOURCE_DB = process.env.RESTORE_DRILL_SOURCE_DB ?? 'octopus';
const DRILL_DB = process.env.RESTORE_DRILL_DB ?? 'octopus_restore_drill';
const PG_USER = process.env.RESTORE_DRILL_PGUSER ?? 'octopus';

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

function psql(database, sql) {
  return dockerCompose([
    'exec',
    '-T',
    COMPOSE_SERVICE,
    'psql',
    '-U',
    PG_USER,
    '-d',
    database,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ]);
}

function ensurePostgres() {
  const ps = dockerCompose(['ps', '--status', 'running', '--services']);
  const services = (ps.stdout ?? '')
    .toString('utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!services.includes(COMPOSE_SERVICE)) {
    console.error(
      'Restore drill skipped: postgres is not running. Start with: docker compose up -d postgres',
    );
    process.exit(0);
  }
}

function main() {
  ensurePostgres();
  const started = Date.now();
  const dir = mkdtempSync(join(tmpdir(), 'octopus-restore-drill-'));
  const dumpPath = join(dir, `${SOURCE_DB}.dump`);

  try {
    console.log(`Dumping ${SOURCE_DB}…`);
    const dump = dockerCompose(
      ['exec', '-T', COMPOSE_SERVICE, 'pg_dump', '-U', PG_USER, '-d', SOURCE_DB, '-Fc'],
      { encoding: 'buffer' },
    );
    writeFileSync(dumpPath, dump.stdout);

    console.log(`Recreating ${DRILL_DB}…`);
    psql('postgres', `DROP DATABASE IF EXISTS ${DRILL_DB};`);
    psql('postgres', `CREATE DATABASE ${DRILL_DB};`);

    console.log(`Restoring into ${DRILL_DB}…`);
    const restore = spawnSync(
      'docker',
      [
        'compose',
        'exec',
        '-T',
        COMPOSE_SERVICE,
        'pg_restore',
        '-U',
        PG_USER,
        '-d',
        DRILL_DB,
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-acl',
      ],
      {
        input: readFileSync(dumpPath),
        encoding: 'buffer',
        shell: false,
      },
    );
    const restoreErr = (restore.stderr ?? Buffer.alloc(0)).toString('utf8').trim();
    const check = psql(
      DRILL_DB,
      `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public';`,
    );
    const match = /(?:^|\n)\s*(\d+)\s*(?:\n|$)/.exec((check.stdout ?? '').toString('utf8'));
    const tableCount = match ? Number.parseInt(match[1], 10) : 0;
    if (tableCount < 1) {
      throw new Error(
        `Restore drill failed: no public tables after restore. ${restoreErr || `pg_restore exit ${restore.status}`}`,
      );
    }
    if (restore.status !== 0 && restoreErr) {
      console.warn(`pg_restore reported warnings (continuing): ${restoreErr.split('\n')[0]}`);
    }

    const elapsedMs = Date.now() - started;
    console.log(
      `Restore drill OK: ${tableCount} public tables in ${DRILL_DB}; elapsed ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(1)}s).`,
    );
    console.log('Record this elapsed time in ops notes when running the quarterly prod drill.');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
