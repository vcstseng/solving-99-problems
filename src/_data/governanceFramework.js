import fs from 'node:fs';
import { parseFramework } from '../_lib/framework.js';

export default function () {
  return parseFramework(fs.readFileSync(new URL('../content/framework/ai-managing-ai.md', import.meta.url), 'utf8'));
}
