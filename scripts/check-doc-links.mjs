// Checks that every relative Markdown link in the docs vault, CLAUDE.md and README.md
// points at an existing file. External links (scheme:) and in-page anchors are skipped.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const SKIP_DIRS = new Set(['.obsidian', 'node_modules']);
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function* markdownFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* markdownFiles(path);
    else if (name.endsWith('.md')) yield path;
  }
}

const files = [
  ...markdownFiles(join(root, 'docs')),
  join(root, 'CLAUDE.md'),
  join(root, 'README.md'),
];
const broken = [];

for (const file of files) {
  // Code blocks and inline code often show link syntax as an example; don't check those.
  const text = readFileSync(file, 'utf8')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  for (const [, href] of text.matchAll(LINK)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) continue;
    const target = decodeURIComponent(href.split('#')[0]);
    if (!existsSync(resolve(dirname(file), target))) {
      broken.push(`${relative(root, file)}: ${href}`);
    }
  }
}

if (broken.length > 0) {
  console.error(`Broken links:\n${broken.join('\n')}`);
  process.exit(1);
}
console.log(`docs links ok (${files.length} files)`);
