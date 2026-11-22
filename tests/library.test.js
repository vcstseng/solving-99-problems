import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import research from "../src/_data/research.js";
import { filterProblems, normalize, paginate, pageNumbers } from "../public/assets/library-model.js";

const data = research();
const records = data.problems.map(p => ({ ...p, status: p.completed ? "complete" : "pending",
  search: normalize([p.id, p.title, p.originalName, p.businessProblem, ...p.technologies, ...p.tools].join(" ")) }));

test("the original catalogue remains 99 unique IDs across 10 business and 6 AI categories", () => {
  assert.equal(records.length, 99);
  assert.equal(new Set(records.map(p => p.id)).size, 99);
  assert.equal(data.businessDomains.length, 10);
  assert.equal(data.aiDomains.length, 6);
  assert.equal(records.filter(p => p.completed).length, 8);
  assert.equal(records.filter(p => !p.completed).length, 91);
  assert.equal(data.businessDomains.reduce((s,d) => s + d.count, 0), 57);
  assert.equal(data.aiDomains.reduce((s,d) => s + d.count, 0), 42);
  assert.equal(new Set(data.businessDomains.map(d => d.color)).size, 10);
});

test("copied articles retain original bytes and original titles", () => {
  const provenance = JSON.parse(fs.readFileSync(new URL("../src/_data/importProvenance.json", import.meta.url)));
  for (const p of records.filter(p => p.completed)) {
    const bytes = fs.readFileSync(new URL(`../src/content/articles/problem_${p.id}.md`, import.meta.url));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), provenance.articles[p.id].sha256);
    assert.equal(p.articleTitle, bytes.toString("utf8").replace(/^\uFEFF/, "").split(/\r?\n/)[0].replace(/^#\s+/, ""));
  }
});

test("candidate tools cannot leak into actual-use filters", () => {
  for (const p of records.filter(p => !p.completed)) {
    assert.deepEqual(p.tools, []);
    assert.deepEqual(p.technologies, []);
  }
  assert.equal(filterProblems(records, { status: "pending", tool: "Python" }).length, 0);
  assert.equal(filterProblems(records, { status: "pending", technology: "RAG" }).length, 0);
  const metadata = JSON.parse(fs.readFileSync(new URL("../src/_data/researchMetadata.json", import.meta.url)));
  for (const p of records.filter(p => p.completed)) assert.ok(metadata[p.id].evidence.length > 0);
});

test("keyword, domain, progress, technology and tool filters combine with AND", () => {
  assert.deepEqual(filterProblems(records, { keyword: "ｃｓ０７ RAG", domain: "客服", technology: "RAG", tool: "Ollama", status: "complete" }).map(p => p.id), ["CS07"]);
  assert.equal(filterProblems(records, { domain: "__ai" }).length, 42);
  assert.equal(filterProblems(records, { domain: "客服" }).length, 7);
  assert.equal(filterProblems(records, { status: "complete" }).length, 8);
  assert.equal(filterProblems(records, { keyword: "不存在的關鍵字XYZ" }).length, 0);
});

test("pagination covers all 99 exactly once and handles filtered or empty results", () => {
  const seen = [];
  for (let p = 1; p <= 9; p++) seen.push(...paginate(records, p, 12).items.map(x => x.id));
  assert.equal(seen.length, 99);
  assert.equal(new Set(seen).size, 99);
  const last = paginate(records, 9, 12);
  assert.equal(last.first, 97); assert.equal(last.last, 99); assert.equal(last.items.length, 3);
  assert.equal(paginate(records.slice(0, 8), 9, 12).page, 1);
  assert.equal(paginate([], 9, 12).first, 0);
  assert.equal(paginate([], 9, 12).last, 0);
  assert.deepEqual(pageNumbers(1, 9), [1, 2, 3, "…", 9]);
  assert.deepEqual(pageNumbers(5, 9), [1, "…", 4, 5, 6, "…", 9]);
});
