#!/usr/bin/env node
// Renders public/ icons from scripts/icon.svg with sharp. Deterministic and idempotent:
// re-run any time the source SVG changes, and commit the outputs (no runtime asset generation).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const svgPath = join(root, 'scripts', 'icon.svg');
const publicDir = join(root, 'public');

const svg = readFileSync(svgPath, 'utf8');

// Pull out the artwork (the two suit glyphs, without the rounded background rect) so the
// maskable variant can re-compose it on its own full-bleed background.
const artworkMatch = svg.match(/<g id="artwork">([\s\S]*?)<\/g>\s*<\/svg>/);
if (!artworkMatch) throw new Error('icon.svg: could not find the artwork group');
const artworkInner = artworkMatch[1];

// oklch(0.19 0.03 50) — pub theme bg, src/core/tokens.ts (see icon.svg for the full palette).
const BG = '#1f1007';

// Maskable icons are cropped to an OS-defined shape, so the background must be full-bleed
// (no rounded corners of our own) and the artwork kept inside the ~80% safe zone.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <g transform="translate(256 256) scale(0.8) translate(-256 -256)">${artworkInner}</g>
</svg>`;

mkdirSync(publicDir, { recursive: true });

async function render(svgSource, size, outFile) {
  await sharp(Buffer.from(svgSource)).resize(size, size).png().toFile(join(publicDir, outFile));
  console.log(`wrote public/${outFile}`);
}

await render(svg, 192, 'icon-192.png');
await render(svg, 512, 'icon-512.png');
await render(maskableSvg, 512, 'icon-maskable-512.png');
await render(svg, 180, 'apple-touch-icon.png');

writeFileSync(join(publicDir, 'favicon.svg'), svg);
console.log('wrote public/favicon.svg');
