import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps/api/src/modules');

const forbidden = [
  { from: 'domain', patterns: ['@nestjs/', 'mikro-orm', 'redis', 'bullmq', 'axios', 'http://', 'https://'] },
  { from: 'application', patterns: ['@nestjs/platform-', 'mikro-orm', 'bullmq'] },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const violations = [];

for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  const normalized = file.split(path.sep).join('/');

  for (const rule of forbidden) {
    const marker = `/${rule.from}/`;
    if (!normalized.includes(marker)) continue;

    for (const pattern of rule.patterns) {
      if (text.includes(pattern)) {
        violations.push(`${normalized}: forbidden dependency "${pattern}" in ${rule.from}`);
      }
    }
  }
}

if (violations.length) {
  console.error('Architecture violations found:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Architecture boundary check passed.');
