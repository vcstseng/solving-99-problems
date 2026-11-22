import fs from 'node:fs';
import research from './research.js';
import { parseL3 } from '../_lib/l3.js';

export default function () {
  const registry = JSON.parse(fs.readFileSync(new URL('./l3Registry.json', import.meta.url), 'utf8'));
  const problems = research().problems;
  return Object.entries(registry).filter(([, entry]) => entry.enabled).map(([id, entry]) => {
    const problem = problems.find(p => p.id === id);
    if (!problem?.detailUrl) throw new Error(`${id}: L3 requires an existing L2 case`);
    const source = fs.readFileSync(new URL(`../content/l3/${entry.file}`, import.meta.url), 'utf8');
    return { ...parseL3(source, id), sourceFile:entry.file,
      website:{ category:problem.domain, color:problem.color, foreground:problem.foreground },
      caseUrl:problem.detailUrl, url:`${problem.detailUrl}engineering/` };
  });
}
