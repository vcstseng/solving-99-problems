import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseL2 } from '../src/_lib/l2.js';

export function syncL2(sourceDir) {
  if (!sourceDir) throw new Error('Provide --source <L2 Markdown directory> or L2_SOURCE_DIR.');
  const registry = JSON.parse(fs.readFileSync(new URL('../src/_data/l2Registry.json', import.meta.url), 'utf8'));
  const destination = new URL('../src/content/l2/', import.meta.url);
  const selected = Object.entries(registry).filter(([, entry]) => entry.enabled).map(([id, entry]) => {
    const bytes = fs.readFileSync(path.join(sourceDir, entry.file));
    parseL2(bytes.toString('utf8'), id);
    return { id, entry, bytes };
  });
  fs.mkdirSync(destination, { recursive:true });
  const writeIfChanged = (target, bytes) => {
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) fs.writeFileSync(target, bytes);
  };
  const manifest = {};
  for (const { id, entry, bytes } of selected) {
    writeIfChanged(new URL(entry.file, destination), bytes);
    manifest[id] = { file:entry.file, sha256:crypto.createHash('sha256').update(bytes).digest('hex') };
  }
  writeIfChanged(new URL('../src/_data/l2Provenance.json', import.meta.url), Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  return selected.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flag = process.argv.indexOf('--source');
  const count = syncL2(flag >= 0 ? process.argv[flag + 1] : process.env.L2_SOURCE_DIR);
  console.log(`Synced ${count} original L2 documents; research source files were only read.`);
}
