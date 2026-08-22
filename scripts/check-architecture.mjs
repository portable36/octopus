#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const srcRoot = path.join(process.cwd(), 'backend', 'src');
const modulesRoot = path.join(srcRoot, 'modules');
const kernelRoot = path.join(srcRoot, 'shared-kernel');

const LAYER_RULES = [
  { layer: 'domain', forbidden: ['application', 'infrastructure', 'presentation'] },
  { layer: 'application', forbidden: ['infrastructure', 'presentation'] },
  { layer: 'presentation', forbidden: ['infrastructure'] },
];

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.ts$/.test(entry) && !/\.spec\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

function segments(p) {
  return p.split(path.sep);
}

function checkFile(file) {
  const violations = [];
  const content = readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const relFile = path.relative(process.cwd(), file);

  const segs = segments(file);
  const fileLayer = ['domain', 'application', 'infrastructure', 'presentation'].find((l) =>
    segs.includes(l),
  );
  const moduleName = file.startsWith(modulesRoot)
    ? segments(path.relative(modulesRoot, file))[0]
    : null;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/from\s+['"]([^'"]+)['"]/);
    if (!m) continue;
    const spec = m[1];

    if (!spec.startsWith('.')) {
      if (fileLayer === 'domain' && spec.startsWith('@nestjs')) {
        violations.push(`${relFile}:${i + 1} Domain must not depend on framework code (${spec}).`);
      }
      continue;
    }

    const target = path.resolve(path.dirname(file), spec);
    const tSegs = segments(target);
    const targetLayer = ['domain', 'application', 'infrastructure', 'presentation'].find((l) =>
      tSegs.includes(l),
    );

    if (target.startsWith(kernelRoot) && file.startsWith(modulesRoot)) continue;
    if (file.startsWith(kernelRoot)) {
      if (target.startsWith(modulesRoot)) {
        violations.push(`${relFile}:${i + 1} Shared kernel must not depend on modules.`);
      }
      continue;
    }

    if (moduleName !== null && target.startsWith(modulesRoot)) {
      const targetModule = segments(path.relative(modulesRoot, target))[0];
      if (targetModule !== moduleName) {
        violations.push(
          `${relFile}:${i + 1} Cross-module import ("${targetModule}") — use contracts/events instead.`,
        );
        continue;
      }
    }

    if (
      fileLayer &&
      targetLayer &&
      LAYER_RULES.find((r) => r.layer === fileLayer)?.forbidden.includes(targetLayer)
    ) {
      violations.push(
        `${relFile}:${i + 1} ${fileLayer} layer must not import ${targetLayer} layer.`,
      );
    }
  }
  return violations;
}

if (
  !statSync(modulesRoot, { throwIfNoEntry: false }) ||
  !statSync(kernelRoot, { throwIfNoEntry: false })
) {
  console.error('backend/src/modules or backend/src/shared-kernel is missing.');
  process.exit(1);
}

const violations = [...walk(modulesRoot), ...walk(kernelRoot)].flatMap(checkFile);
if (violations.length > 0) {
  console.error('Architecture violations:\n');
  for (const v of violations) console.error(` - ${v}`);
  process.exit(1);
}
console.log('No architecture violations found.');
