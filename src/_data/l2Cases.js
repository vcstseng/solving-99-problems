import fs from "node:fs";
import registry from "./l2Registry.json" with { type: "json" };
import research from "./research.js";
import { parseL2 } from "../_lib/l2.js";

export default function () {
  const problems = research().problems;
  return Object.entries(registry).filter(([, entry]) => entry.enabled).map(([id, entry]) => {
    const source = fs.readFileSync(new URL(`../content/l2/${entry.file}`, import.meta.url), "utf8");
    const document = parseL2(source, id);
    const problem = problems.find(p => p.id === id);
    if (!problem?.completed) throw new Error(`${id}: no completed homepage case`);
    return { ...document, sourceFile: entry.file,
      // The original document fields stay separate from catalogue display names.
      website: { category: problem.domain, status: problem.status, color: problem.color, foreground: problem.foreground },
      url: problem.detailUrl };
  });
}
