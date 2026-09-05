#!/usr/bin/env node
/**
 * Headless export of Cursor Composer chats to .cursor/chat-backups/
 * Uses vendored cursor-chat-transfer lib (MIT). Exits 0 on missing deps (CI-safe).
 */
import { createRequire } from 'node:module';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { buildExportObject } = require('./cursor-chat-transfer-lib/transfer.js');
const { findSqlite3 } = require('./cursor-chat-transfer-lib/db.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_RETENTION = 10;
const WARN_PREFIX = '[cursor-chat-export]';

function logWarn(message) {
  console.warn(`${WARN_PREFIX} ${message}`);
}

function logInfo(message) {
  console.log(`${WARN_PREFIX} ${message}`);
}

function getRepoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return resolve(__dirname, '..');
  }
}

function normalizePath(p) {
  return resolve(p).replace(/\\/g, '/').toLowerCase();
}

function getDefaultCursorUserDir() {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Cursor');
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'Cursor');
  }
  return join(homedir(), '.config', 'Cursor');
}

function parseWorkspaceFolder(workspaceJsonPath) {
  try {
    const obj = JSON.parse(readFileSync(workspaceJsonPath, 'utf8'));
    const folder = obj?.folder;
    if (typeof folder !== 'string') return null;
    let p = folder;
    if (p.startsWith('file://')) {
      try {
        p = decodeURIComponent(new URL(p).pathname);
        if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(p)) {
          p = p.slice(1);
        }
      } catch {
        return null;
      }
    }
    return resolve(p);
  } catch {
    return null;
  }
}

function findWorkspaceStateDb(repoRoot) {
  const storageRoot = join(getDefaultCursorUserDir(), 'User', 'workspaceStorage');
  if (!existsSync(storageRoot)) return null;

  const target = normalizePath(repoRoot);
  let best = null;

  for (const ent of readdirSync(storageRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const wsJson = join(storageRoot, ent.name, 'workspace.json');
    const stateDb = join(storageRoot, ent.name, 'state.vscdb');
    if (!existsSync(wsJson) || !existsSync(stateDb)) continue;

    const folderPath = parseWorkspaceFolder(wsJson);
    if (!folderPath) continue;
    if (normalizePath(folderPath) !== target) continue;

    const mtime = statSync(stateDb).mtimeMs;
    if (!best || mtime > best.mtime) {
      best = { path: stateDb, mtime };
    }
  }

  return best?.path ?? null;
}

function getGlobalStateDb() {
  const p = join(getDefaultCursorUserDir(), 'User', 'globalStorage', 'state.vscdb');
  return existsSync(p) ? p : null;
}

function slugifyRepoPath(repoRoot) {
  return normalizePath(repoRoot)
    .replace(/^[a-z]:\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findAgentTranscriptsDir(repoRoot) {
  const slug = slugifyRepoPath(repoRoot);
  const candidates = [
    join(homedir(), '.cursor', 'projects', slug, 'agent-transcripts'),
    join(homedir(), '.cursor', 'projects', slug.replace(/-/g, '_'), 'agent-transcripts'),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }

  const projectsRoot = join(homedir(), '.cursor', 'projects');
  if (!existsSync(projectsRoot)) return null;

  const repoNorm = normalizePath(repoRoot);
  for (const ent of readdirSync(projectsRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = join(projectsRoot, ent.name, 'agent-transcripts');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.jsonl')) continue;
      try {
        const sample = readFileSync(join(dir, file), 'utf8').slice(0, 4000);
        if (sample.includes(repoNorm) || sample.includes(repoRoot)) {
          return dir;
        }
      } catch {
        // skip unreadable
      }
    }
  }

  return null;
}

function copyAgentTranscripts(sourceDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  if (!sourceDir || !existsSync(sourceDir)) {
    for (const f of readdirSync(destDir)) {
      if (f.endsWith('.jsonl')) unlinkSync(join(destDir, f));
    }
    return 0;
  }

  const incoming = new Set(readdirSync(sourceDir).filter((f) => f.endsWith('.jsonl')));

  for (const file of incoming) {
    cpSync(join(sourceDir, file), join(destDir, file));
  }

  for (const file of readdirSync(destDir)) {
    if (file.endsWith('.jsonl') && !incoming.has(file)) {
      unlinkSync(join(destDir, file));
    }
  }

  return incoming.size;
}

function pruneSnapshots(backupDir) {
  const snapshots = readdirSync(backupDir)
    .filter(
      (f) =>
        f.endsWith('.cursor-chat.json') && f !== 'latest.cursor-chat.json' && f !== 'manifest.json',
    )
    .map((f) => ({ name: f, mtime: statSync(join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const snap of snapshots.slice(SNAPSHOT_RETENTION)) {
    unlinkSync(join(backupDir, snap.name));
  }
}

function formatSnapshotName(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.cursor-chat.json`
  );
}

async function main() {
  const repoRoot = getRepoRoot();
  const backupDir = join(repoRoot, '.cursor', 'chat-backups');
  mkdirSync(backupDir, { recursive: true });

  if (!findSqlite3()) {
    logWarn('sqlite3 CLI not found; skipping chat export (install sqlite3 for backups).');
    process.exit(0);
  }

  const wsDb = findWorkspaceStateDb(repoRoot);
  const glDb = getGlobalStateDb();

  if (!wsDb || !glDb) {
    logWarn(
      'Cursor workspace or global database not found; skipping export (open this project in Cursor first).',
    );
    process.exit(0);
  }

  const wsUri = { fsPath: wsDb };
  const glUri = { fsPath: glDb };

  let exportObj;
  try {
    exportObj = await buildExportObject(wsUri, glUri);
  } catch (err) {
    logWarn(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(0);
  }

  const payload = {
    allComposers: exportObj.allComposers,
    composers: exportObj.composers,
    bubbles: exportObj.bubbles,
  };

  const json = JSON.stringify(payload, null, 2);
  const latestPath = join(backupDir, 'latest.cursor-chat.json');
  const snapshotPath = join(backupDir, formatSnapshotName(new Date()));

  writeFileSync(latestPath, json, 'utf8');
  writeFileSync(snapshotPath, json, 'utf8');
  pruneSnapshots(backupDir);

  const agentSource = findAgentTranscriptsDir(repoRoot);
  const agentDest = join(backupDir, 'agent-transcripts');
  const agentCount = copyAgentTranscripts(agentSource, agentDest);

  const manifest = {
    exportedAt: new Date().toISOString(),
    repoPath: repoRoot,
    composerCount: exportObj.allComposers?.length ?? 0,
    composersWithData: exportObj.debugInfo?.composersWithData ?? 0,
    composersWithBubbles: exportObj.debugInfo?.composersWithBubbles ?? 0,
    agentTranscriptCount: agentCount,
    snapshotFile: snapshotPath.split(/[/\\]/).pop(),
  };

  writeFileSync(join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  logInfo(
    `Exported ${manifest.composerCount} composer(s), ${agentCount} agent transcript(s) → ${backupDir}`,
  );
}

main().catch((err) => {
  logWarn(err instanceof Error ? err.message : String(err));
  process.exit(0);
});
