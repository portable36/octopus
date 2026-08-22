import { spawnSync } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const steps = [
  ['format:check', 'Prettier'],
  ['lint', 'ESLint'],
  ['typecheck', 'TypeScript'],
  ['architecture', 'Architecture boundaries'],
  ['test', 'Unit tests'],
  ['env:check', 'Environment contract'],
  ['build', 'Application build'],
  ['migration:check', 'Database migrations'],
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
