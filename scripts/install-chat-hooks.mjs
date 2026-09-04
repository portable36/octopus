#!/usr/bin/env node
/**
 * Install git hooks for automatic Cursor chat backup on commit/push.
 * Sets local core.hooksPath only (does not modify global git config).
 */
import { chmodSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const hooksDir = join(repoRoot, 'scripts', 'git-hooks');
const hooksRel = 'scripts/git-hooks';

execFileSync('git', ['config', 'core.hooksPath', hooksRel], {
  cwd: repoRoot,
  stdio: 'inherit',
});

for (const name of ['pre-commit', 'pre-push']) {
  const hookPath = join(hooksDir, name);
  if (!existsSync(hookPath)) {
    console.error(`Missing hook: ${hookPath}`);
    process.exit(1);
  }
  if (process.platform !== 'win32') {
    chmodSync(hookPath, 0o755);
  }
}

console.log(`Git hooks installed (core.hooksPath=${hooksRel}).`);
console.log('Hooks: pre-commit (export + stage), pre-push (re-export + backup commit if needed).');
