import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import cases from "../src/_data/l2Cases.js";
import research from "../src/_data/research.js";
import registry from "../src/_data/l2Registry.json" with { type: "json" };
import provenance from "../src/_data/l2Provenance.json" with { type: "json" };
import { markdown, parseL2 } from "../src/_lib/l2.js";

const data = cases();
const sourceFor = entry => fs.readFileSync(new URL(`../src/content/l2/${entry.sourceFile}`, import.meta.url), "utf8");
const visible = html => html.replace(/<[^>]*>/g, "").replace(/\s+/g, "");

test("only CS07 and P02 have L2 routes; filenames and display fields do not redefine identity", () => {
  assert.deepEqual(data.map(d => d.id), ["CS07", "P02"]);
  assert.equal(registry.VER02.file, "VER2_L2.md");
  assert.equal(registry.VER06.file, "VER6_L2.md");
  assert.deepEqual(research().problems.filter(p => p.detailUrl).map(p => p.id), ["CS07", "P02"]);
  assert.equal(data[0].fields["問題分類"], "客戶服務");
  assert.equal(data[0].website.category, "客服");
  assert.equal(data[0].fields["探索狀態"], "已完成");
  assert.equal(data[0].website.status, "已完成探索");
  assert.equal(data[0].humanAcceptance, "pending");
  assert.equal(data[1].humanAcceptance, "pending");
  for (const entry of data) {
    const home = research().problems.find(p => p.id === entry.id);
    assert.equal(entry.title, home.title);
    assert.equal(entry.website.status, home.status);
  }
  assert.match(data[1].fields["探索狀態"], /AI 方案未達預設目標/);
  assert.match(data[1].fields["探索狀態"], /最終人工驗收待完成/);
  assert.throws(() => parseL2(sourceFor(data[0]), "P02"), /ID mismatch/);
});

test("rendered sections preserve every original body text, heading, list and table exactly once in order", () => {
  for (const entry of data) {
    const source = sourceFor(entry);
    const tokens = markdown.parse(source, {});
    const start = tokens.findIndex((t, i) => i > 2 && t.type === "heading_open");
    const expected = markdown.renderer.render(tokens.slice(start), markdown.options, {});
    const actual = entry.sections.map(s => s.headingHtml + s.html).join("");
    assert.equal(visible(actual), visible(expected), entry.id + " full body differs");
    assert.equal((actual.match(/<table>/g) || []).length, tokens.filter(t => t.type === "table_open").length);
    assert.equal((actual.match(/<p>/g) || []).length, (expected.match(/<p>/g) || []).length);
    assert.equal(entry.sections.filter(s => /key-takeaways/.test(s.html)).length, 2);
  }
});

test("the TOC covers major sections and H3; all body headings have unique anchors", () => {
  for (const entry of data) {
    const anchors = entry.sections.flatMap(s => [s.id, ...s.headings.map(h => h.id)]);
    assert.equal(new Set(anchors).size, anchors.length);
    for (const section of entry.sections) for (const h of section.headings) assert.ok(section.html.includes(`id="${h.id}"`));
    assert.deepEqual(entry.sections.map(s => s.key), ["overview", "business", "technical", "scope"]);
    assert.ok(entry.sections.every(s => s.toc.every(h => h.level === 3 && h.children.length === 0)));
  }
  assert.equal(data[0].sections[1].toc.length, 5);
  assert.equal(data[1].sections[1].toc.length, 7);
});

test("major anchors remain stable after inserting H4, and duplicate heading text stays unique", () => {
  const original = parseL2(sourceFor(data[0]), "CS07");
  const inserted = parseL2(sourceFor(data[0]).replace("### A. 政策檢索比較", "### 額外小節\n\n測試段落。\n\n### A. 政策檢索比較"), "CS07");
  const majors = entry => entry.sections.flatMap(s => [s.id, ...s.toc.map(h => h.id)]);
  assert.deepEqual(majors(inserted), majors(original));
  assert.ok(majors(original).includes("business-01"));
  assert.ok(majors(original).includes("business-takeaways"));
  for (const id of ["technical-methods", "technical-tools", "technical-workflow", "technical-takeaways"]) assert.ok(majors(original).includes(id));
  const duplicate = parseL2(sourceFor(data[0]).replace("### A. 政策檢索比較", "### 同名小節\n\n### 同名小節\n\n### A. 政策檢索比較"), "CS07");
  const all = duplicate.sections.flatMap(s => [s.id, ...s.headings.map(h => h.id)]);
  assert.equal(new Set(all).size, all.length);
});

test("Markdown updates change content and TOC without changing the template or a summary JSON", () => {
  const changed = parseL2(sourceFor(data[0]).replace("## 02｜使用技術與工具", "## 新增章節測試\n\n內容更新測試。\n\n## 02｜使用技術與工具"), "CS07");
  assert.ok(changed.sections[2].toc.some(h => h.title === "新增章節測試"));
  assert.ok(changed.sections[2].html.includes("內容更新測試。"));
});

test("original L2 snapshot bytes match their import hashes", () => {
  for (const entry of data) {
    const bytes = fs.readFileSync(new URL(`../src/content/l2/${entry.sourceFile}`, import.meta.url));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), provenance[entry.id].sha256);
  }
});
