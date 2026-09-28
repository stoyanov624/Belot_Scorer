#!/usr/bin/env node
/**
 * Bundle size budget checker for dist/assets/*.{js,css}
 * Budgets ensure fast load: entry ≤105kB gz (app code),
 * CSS ≤10kB gz (styles), lazy chunks ≤50kB gz (features),
 * total JS ≤210kB gz (all parsed/executed).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGETS = {
  entry: 105,
  css: 10,
  chunk: 50,
  totalJs: 210,
};

const assetsDir = join(process.cwd(), 'dist', 'assets');
const files = readdirSync(assetsDir)
  .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  .sort();

const results = [];
let totalJsGz = 0;
const offenders = [];

for (const file of files) {
  const path = join(assetsDir, file);
  const raw = readFileSync(path);
  const gz = gzipSync(raw);
  const rawKb = (raw.length / 1024).toFixed(2);
  const gzKb = (gz.length / 1024).toFixed(2);

  results.push({ file, rawKb, gzKb });

  if (file.endsWith('.js')) {
    totalJsGz += gz.length / 1024;
    const isEntry = /^index-.*\.js$/.test(file);
    const limit = isEntry ? BUDGETS.entry : BUDGETS.chunk;

    if (Number(gzKb) > limit) {
      offenders.push(`${file}: ${gzKb} kB (limit: ${limit} kB)`);
    }
  } else if (Number(gzKb) > BUDGETS.css) {
    offenders.push(`${file}: ${gzKb} kB (limit: ${BUDGETS.css} kB)`);
  }
}

if (totalJsGz > BUDGETS.totalJs) {
  offenders.push(`Total JS: ${totalJsGz.toFixed(2)} kB (limit: ${BUDGETS.totalJs} kB)`);
}

if (offenders.length > 0) {
  console.error('✗ Bundle size budget exceeded:');
  for (const o of offenders) {
    console.error(`  ${o}`);
  }
  process.exit(1);
}

console.log('✓ Bundle sizes (assets only):');
console.log('  File                          Raw (kB)  Gzip (kB)');
for (const { file, rawKb, gzKb } of results) {
  console.log(`  ${file.padEnd(30)} ${rawKb.padStart(7)} ${gzKb.padStart(9)}`);
}
console.log(`  ${'─'.repeat(50)}`);
console.log(`  ${'Total JS'.padEnd(30)} ${' '.padStart(7)} ${totalJsGz.toFixed(2).padStart(9)}`);
