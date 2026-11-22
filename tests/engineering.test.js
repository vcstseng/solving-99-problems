import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import MarkdownIt from 'markdown-it';
import { parseL3 } from '../src/_lib/l3.js';
import cases from '../src/_data/l3Cases.js';

const bytes = fs.readFileSync(new URL('../src/content/l3/CS07_L3.md', import.meta.url));
const source = bytes.toString('utf8');
const document = parseL3(source, 'CS07');
const visible = html => html.replace(/<[^>]*>/g, '').replace(/\s+/g, '');

test('CS07 L3 preserves the original document body, tables, paragraphs and Mermaid definition', () => {
  const md = new MarkdownIt({ html:false, typographer:false });
  const tokens = md.parse(source, {});
  const expected = md.renderer.render(tokens.slice(3), md.options, {});
  const original = parseL3(source, 'CS07', { publicLabels:false });
  const actual = original.introductionHtml + original.sections.map(s => s.headingHtml + s.html).join('');
  const withoutDiagramUI = actual.replace(/<figure class="engineering-diagram">[\s\S]*?<code class="language-mermaid">([\s\S]*?)<\/code>[\s\S]*?<\/figure>/g, '<pre><code>$1</code></pre>');
  assert.equal(visible(withoutDiagramUI), visible(expected));
  for (const tag of ['table', 'p', 'li', 'h2', 'h3']) {
    assert.equal((actual.match(new RegExp(`<${tag}(?:>| )`, 'g')) || []).length, (expected.match(new RegExp(`<${tag}(?:>| )`, 'g')) || []).length, tag);
  }
  const provenance = JSON.parse(fs.readFileSync(new URL('../src/_data/l3Provenance.json', import.meta.url), 'utf8'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), provenance.CS07.sha256);
});

test('L3 registry publishes only CS07 and keeps identity separate from L2 presentation title', () => {
  const data = cases();
  assert.deepEqual(data.map(c => c.id), ['CS07']);
  assert.equal(data[0].url, '/problems/cs07/engineering/');
  assert.equal(data[0].caseUrl, '/problems/cs07/');
  assert.equal(data[0].title, 'Engineering Investigations：正確政策為何仍產生錯誤回答？');
  assert.throws(() => parseL3(source, 'P02'), /ID mismatch/);
});

test('L3 TOC follows source headings and keeps chapter anchors stable when inserting a subsection', () => {
  assert.deepEqual(document.sections.map(s => s.id), ['engineering-map', 'investigation-01', 'investigation-02', 'investigation-03', 'investigation-04', 'investigation-05', 'evidence-index']);
  const changed = parseL3(source.replace('### Case Q03', '### 新增小節\n\n測試段落。\n\n### Case Q03'), 'CS07');
  assert.deepEqual(changed.sections.map(s => s.id), document.sections.map(s => s.id));
  assert.ok(changed.sections[3].toc.some(h => h.title === '新增小節'));
  const all = changed.sections.flatMap(s => [s.id, ...s.toc.map(h => h.id)]);
  assert.equal(new Set(all).size, all.length);
});

test('unpublished evidence references retain their labels without becoming broken website links', () => {
  const changed = parseL3(source + '\n[原始證據](src/baseline.py)\n\n[網站](https://example.com/)\n', 'CS07');
  const html = changed.sections.at(-1).html;
  assert.match(html, /unpublished-reference[^>]*>原始證據<\/span>/);
  assert.ok(!html.includes('href="src/baseline.py"'));
  assert.ok(html.includes('href="https://example.com/"'));
});

test('public labels are Chinese, internal layer numbers are hidden and research facts stay intact', () => {
  const html = document.introductionHtml + document.sections.map(s => s.headingHtml + s.html).join('');
  assert.doesNotMatch(html, /\bL[34]\b|Observed｜|Interpretation｜|Not established｜|Engineering question\./);
  assert.match(html, /reading-label">已觀察：<\/strong>/);
  assert.equal(document.displayTitle, '正確政策為何仍產生錯誤回答？');
  assert.equal(document.sections[3].toc[0].title, '反例 Q03｜十四日政策，回答七日');
  assert.equal(document.sections.at(-1).title, '證據索引｜原始資料入口');
  const raw = parseL3(source, 'CS07', { publicLabels:false });
  const text = item => item.introductionHtml + item.sections.map(s => s.headingHtml+s.html).join('');
  assert.deepEqual(text(document).match(/\d+(?:[./]\d+)?%?/g), text(raw).replace(/\bL[34]\b/g, '').match(/\d+(?:[./]\d+)?%?/g));
});
