import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import MarkdownIt from 'markdown-it';
import { parseL3 } from '../src/_lib/l3.js';
import cases from '../src/_data/l3Cases.js';

const data = cases();
const sourceFor = entry => fs.readFileSync(new URL(`../src/content/l3/${entry.sourceFile}`, import.meta.url), 'utf8');
const htmlFor = entry => entry.introductionHtml + entry.sections.map(s => s.headingHtml + s.html).join('');
const visible = html => html.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
const md = new MarkdownIt({ html:false, typographer:false });

test('all eight L3 documents preserve original body order, paragraphs, tables, code and Mermaid definitions', () => {
  const provenance = JSON.parse(fs.readFileSync(new URL('../src/_data/l3Provenance.json', import.meta.url), 'utf8'));
  for (const entry of data) {
    const source = sourceFor(entry);
    const tokens = md.parse(source, {});
    const expected = md.renderer.render(tokens.slice(3), md.options, {});
    const actual = htmlFor(parseL3(source, entry.id, { publicLabels:false }));
    const withoutDiagramUI = actual.replace(/<figure class="engineering-diagram">[\s\S]*?<code class="language-mermaid">([\s\S]*?)<\/code>[\s\S]*?<\/figure>/g, '<pre><code>$1</code></pre>');
    assert.equal(visible(withoutDiagramUI), visible(expected), entry.id);
    for (const tag of ['table', 'p', 'li', 'h2', 'h3', 'pre']) {
      assert.equal((actual.match(new RegExp(`<${tag}(?:>| )`, 'g')) || []).length, (expected.match(new RegExp(`<${tag}(?:>| )`, 'g')) || []).length, entry.id + ' ' + tag);
    }
    assert.equal(crypto.createHash('sha256').update(Buffer.from(source)).digest('hex'), provenance[entry.id].sha256, entry.id);
  }
});

test('all completed cases have explicit engineering routes and titles derived from their own Markdown', () => {
  assert.deepEqual(data.map(c => c.id).sort(), ['CS02','CS07','DEV04','L06','P02','S01','VER02','VER06']);
  for (const entry of data) {
    assert.equal(entry.url, `/problems/${entry.id.toLowerCase()}/engineering/`);
    assert.equal(entry.caseUrl, `/problems/${entry.id.toLowerCase()}/`);
    assert.equal(entry.title, md.parse(sourceFor(entry), {})[1].content.split('｜').slice(1).join('｜'));
    assert.throws(() => parseL3(sourceFor(entry), 'INVALID'), /ID mismatch/);
  }
});

test('every L3 TOC follows source headings and keeps chapter anchors stable after a subsection insertion', () => {
  for (const entry of data) {
    const source = sourceFor(entry);
    const raw = parseL3(source, entry.id, { publicLabels:false });
    assert.deepEqual(raw.sections.map(s => s.title), [...source.matchAll(/^## (.+)$/gm)].map(m => m[1].trim()));
    const firstSubheading = source.match(/^### (.+)$/m)?.[0];
    const changed = parseL3(firstSubheading ? source.replace(firstSubheading, '### 新增小節\n\n測試段落。\n\n' + firstSubheading) : source + '\n### 新增小節\n\n測試段落。\n', entry.id);
    assert.deepEqual(changed.sections.map(s => s.id), entry.sections.map(s => s.id));
    assert.ok(changed.sections.some(s => s.toc.some(h => h.title === '新增小節')));
    const all = changed.sections.flatMap(s => [s.id, ...s.toc.map(h => h.id)]);
    assert.equal(new Set(all).size, all.length);
  }
});

test('unpublished evidence references retain their labels without broken website links', () => {
  const changed = parseL3(sourceFor(data[0]) + '\n[原始證據](src/baseline.py)\n\n[網站](https://example.com/)\n', data[0].id);
  const html = changed.sections.at(-1).html;
  assert.match(html, /unpublished-reference[^>]*>原始證據<\/span>/);
  assert.ok(!html.includes('href="src/baseline.py"'));
  assert.ok(html.includes('href="https://example.com/"'));
});

test('public labels hide internal layer numbers while all research numbers remain intact', () => {
  for (const entry of data) {
    const source = sourceFor(entry);
    let html = htmlFor(entry);
    assert.doesNotMatch(html, /\bL[34]\b|Observed｜|Interpretation｜|Not established｜|Engineering question\./, entry.id);
    let raw = htmlFor(parseL3(source, entry.id, { publicLabels:false }));
    // MathML and its visual rendering contain the same formula twice;
    // check its source separately and compare all other numbers exactly.
    html = html.replace(/<div class="equation"[\s\S]*?<\/div>/g, '');
    for (const formula of source.match(/\\\[[\s\S]*?\\\]/g) || []) raw = raw.replace(md.render(formula), '');
    assert.deepEqual(html.match(/\d+(?:[./]\d+)?%?/g), raw.replace(/\bL[34]\b/g, '').match(/\d+(?:[./]\d+)?%?/g), entry.id);
  }
});

test('P02 formula is static accessible math with the exact original TeX', () => {
  const entry = data.find(c => c.id === 'P02');
  const formula = sourceFor(entry).match(/\\\[\s*\n([\s\S]*?)\n\s*\\\]/)[1];
  const html = htmlFor(entry);
  assert.equal(entry.hasMath, true);
  assert.match(html, /class="equation"/);
  assert.match(html, /<math /);
  assert.ok(html.includes(`<annotation encoding="application/x-tex">${formula}</annotation>`));
  assert.equal(data.filter(c => c.hasMath).length, 1);
});

test('DEV04 code and private publication boundaries remain visible without publishing research artifacts', () => {
  const code = htmlFor(data.find(c => c.id === 'DEV04'));
  assert.match(code, /class="language-python"/);
  assert.ok(code.includes('return deepcopy(self._orders)'));
  assert.ok(code.includes('return self._orders.copy()'));
  for (const entry of data) assert.match(htmlFor(entry), /研究資料與公開範圍/);
});
