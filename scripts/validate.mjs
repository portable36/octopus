import { spawnSync } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const steps = [
  ['format:check', 'Prettier'],
  ['lint', 'ESLint'],
  ['typecheck', 'TypeScript'],
  ['architecture', 'Architecture boundaries'],
  // Migrations before tests so octopus_app (RLS-bound) exists for DATABASE_URL in CI.
  ['migration:check', 'Database migrations'],
  ['test', 'Unit tests'],
  ['env:check', 'Environment contract'],
  ['build', 'Application build'],
  ['security', 'Dependency audit'],
];

for (const [script, label] of steps) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(`${npmCommand} run ${script}`, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\nValidation failed at step: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nValidation passed.');
