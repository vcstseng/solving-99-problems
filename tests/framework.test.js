import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import MarkdownIt from 'markdown-it';
import { parseFramework } from '../src/_lib/framework.js';

const source = fs.readFileSync(new URL('../src/content/framework/ai-managing-ai.md', import.meta.url), 'utf8');
const document = parseFramework(source);
const htmlFor = doc => doc.introductionHtml + doc.sections.map(s => s.headingHtml + s.html).join('');
const visible = html => html.replace(/<[^>]*>/g, '').replace(/\s+/g, '');

test('framework preserves every source paragraph, table, list and heading exactly once in order', () => {
  const md = new MarkdownIt({ html:false, typographer:false });
  const tokens = md.parse(source, {});
  const expected = md.renderer.render(tokens.slice(6), md.options, {});
  const actual = htmlFor(document);
  assert.equal(document.englishTitle, tokens[1].content);
  assert.equal(document.title, tokens[4].content);
  assert.equal(visible(actual), visible(expected));
  for (const tag of ['p','table','tr','td','li','strong']) {
    assert.equal((actual.match(new RegExp(`<${tag}(?:>| )`, 'g')) || []).length, (expected.match(new RegExp(`<${tag}(?:>| )`, 'g')) || []).length, tag);
  }
});

test('framework separates four dimensions, five roles, three stages, ten topics, conditions and principles', () => {
  assert.equal(document.sections.length, 8);
  assert.deepEqual(document.sections.slice(0, 3).map(s => s.tocTitle), [
    '一、核心概念：遞迴治理', '二、可信度的四個面向', '三、治理角色與關係'
  ]);
  assert.ok(document.sections[0].headingHtml.includes('Recursive Governance'));
  const dimensions = document.sections.find(s => s.key === 'trust-dimensions');
  assert.equal((dimensions.html.match(/<tr>/g) || []).length, 5);
  const roles = document.sections.find(s => s.key === 'governance-roles');
  assert.equal((roles.html.match(/<tr>/g) || []).length, 6);
  const lifecycle = document.sections.find(s => s.key === 'lifecycle');
  assert.equal(lifecycle.toc.length, 3);
  assert.deepEqual(lifecycle.toc.map(s => s.children.length), [3,3,4]);
  assert.equal(document.sections.find(s => s.key === 'cross-cutting-conditions').toc.length, 3);
  assert.equal(document.sections.find(s => s.key === 'principles').toc.length, 3);
  assert.ok(htmlFor(document).includes('而非規定所有系統都必須採用固定的五層管理鏈'));
  assert.doesNotMatch(htmlFor(document), /VER06|CS07|查看完整案例/);
});

test('framework TOC anchors are unique, cover headings and remain stable after a paragraph update', () => {
  const allIds = [...htmlFor(document).matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(allIds.length, new Set(allIds).size);
  const walk = items => items.flatMap(item => [item.id, ...walk(item.children || [])]);
  const toc = document.sections.flatMap(s => [s.id, ...walk(s.toc)]);
  assert.equal(toc.length, new Set(toc).size);
  for (const id of toc) assert.ok(allIds.includes(id), id);
  const changed = parseFramework(source.replace('### A. 設計（Design）', '新增段落。\n\n### A. 設計（Design）'));
  assert.deepEqual(changed.sections.flatMap(s => [s.id, ...walk(s.toc)]), toc);
  assert.ok(htmlFor(changed).includes('新增段落。'));
});
