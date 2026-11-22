import MarkdownIt from 'markdown-it';

// Preserve the source document; public labels are localized only at render time.
const publicReplacements = [
  ['原始 L3', '原始工程文件'],
  ['網站 L3 技術深讀', '網站技術深讀'], ['可存取的 L4 證據', '可存取的原始證據'],
  ['對應 L4 的原始資料入口', '原始資料入口'], ['L4 上線時', '原始證據公開時'], ['此 L3 是', '本文是'],
  ['Engineering Map', '工程流程'], ['Evidence Index', '證據索引'],
  ['Observed｜已觀察。', '已觀察：'], ['Interpretation｜有限推論。', '有限推論：'],
  ['Not established｜尚未證明。', '尚未證明：'], ['Engineering question.', '研究問題：'],
  ['Engineering conclusion.', '工程結論：'], ['Additional observation.', '補充觀察：'],
  ['Experiment.', '實驗方式：'], ['Observed：', '已觀察：'], ['Interpretation：', '有限推論：'],
  ['實作邊界。', '實作邊界：'], ['固定條件。', '固定條件：'],
  ['Context：', '輸入內容：'], ['Evidence：', '證據來源：'],
  ['Engineering Deep Dive', '工程深讀'], ['Security & Governance Review', '安全與治理審查'],
  ['Research Closed', '研究已結案'], ['Worker AI Review', '執行 AI 審查'], ['Human Acceptance PENDING', '人工驗收待完成']
];
export function publicText(text) {
  for (const [original, label] of publicReplacements) text = text.replaceAll(original, label);
  return text.replace(/\bInvestigation (\d+)/g, '工程調查 $1').replace(/\bCase (Q\d+)/g, '反例 $1')
    .replace(/ 工程深讀 /g, '工程深讀').replace(/ 安全與治理審查/g, '安全與治理審查');
}
function presentationTokens(tokens) {
  return tokens.map(token => {
    const copy = Object.assign(Object.create(Object.getPrototypeOf(token)), token);
    copy.attrs = token.attrs?.map(pair => [...pair]) || null;
    if (token.children) {
      copy.children = presentationTokens(token.children);
      // A source lead-in is a paragraph label, rather than part of its conclusion.
      const lead = copy.children.findIndex(child => child.type === 'strong_open');
      const label = copy.children[lead + 1];
      if (lead <= 1 && lead >= 0 && label?.type === 'text' && /^(研究問題|實驗方式|已觀察|有限推論|尚未證明|補充觀察|工程結論|實作邊界|固定條件)：$/.test(label.content)) {
        copy.children[lead].attrJoin('class', 'reading-label');
      }
    }
    if (copy.type === 'text') copy.content = publicText(copy.content);
    return copy;
  });
}
export const l3Markdown = new MarkdownIt({ html:false, linkify:false, typographer:false });
const escape = l3Markdown.utils.escapeHtml;
l3Markdown.renderer.rules.table_open = () => '<div class="table-scroll" role="region" aria-label="可水平捲動的資料表" tabindex="0"><table>\n';
l3Markdown.renderer.rules.table_close = () => '</table></div>\n';
const defaultFence = l3Markdown.renderer.rules.fence;
l3Markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
  const token = tokens[index];
  if (token.info.trim() !== 'mermaid') return defaultFence(tokens, index, options, env, self);
  return `<figure class="engineering-diagram"><div class="diagram-canvas" role="region" aria-label="工程流程圖，可水平捲動" tabindex="0"></div><div class="diagram-actions"><button type="button" data-enlarge-diagram hidden>放大流程圖</button></div><details class="diagram-source" open><summary>流程圖原始碼</summary><pre><code class="language-mermaid">${escape(token.content)}</code></pre></details></figure>\n`;
};
// An original research-relative reference is not a published website resource.
// Keep its label visible, without creating a broken link to unpublished L4.
l3Markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  if (/^(https?:|mailto:|#)/i.test(token.attrGet('href') || '')) return self.renderToken(tokens, index, options);
  token.meta = { unpublished:true };
  let depth = 1;
  for (let next = index + 1; next < tokens.length; next++) {
    if (tokens[next].type === 'link_open') depth++;
    if (tokens[next].type === 'link_close' && --depth === 0) { tokens[next].meta = { unpublished:true }; break; }
  }
  return '<span class="unpublished-reference" title="原研究路徑，尚未發布為公開證據">';
};
l3Markdown.renderer.rules.link_close = (tokens, index, options, env, self) => tokens[index].meta?.unpublished ? '</span>' : self.renderToken(tokens, index, options);

const slug = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
function anchorFor(title) {
  const number = title.match(/^Investigation\s+(\d+)/i)?.[1];
  if (number) return `investigation-${number.padStart(2, '0')}`;
  if (/^Engineering Map/i.test(title)) return 'engineering-map';
  if (/^Evidence Index/i.test(title)) return 'evidence-index';
  return slug(title);
}

export function parseL3(source, expectedId, { publicLabels = true } = {}) {
  const tokens = l3Markdown.parse(source.replace(/^\uFEFF/, ''), {});
  if (tokens[0]?.type !== 'heading_open' || tokens[0].tag !== 'h1') throw new Error(`${expectedId}: missing L3 title`);
  const fullTitle = tokens[1].content;
  const match = fullTitle.match(/^([A-Z]+\d+)\s*[｜|]\s*(.+)$/u);
  if (!match || match[1] !== expectedId) throw new Error(`${expectedId}: L3 ID mismatch (${fullTitle})`);
  const body = tokens.slice(3);
  const used = new Set(['case-title']);
  const sections = [];
  const introduction = [];
  let section;
  let topDepth = 0;
  for (let i = 0; i < body.length; i++) {
    const token = body[i];
    // Top-level blocks only: a heading inside a quotation is not a chapter.
    if (token.type === 'heading_open') {
      const title = body[i + 1].content;
      const base = token.tag === 'h2' ? anchorFor(title) : `${section?.id || 'introduction'}-${slug(title)}`;
      let id = base, suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      used.add(id);
      token.attrSet('id', id);
      token.attrSet('tabindex', '-1');
      if (token.tag === 'h2' && topDepth === 0) {
        section = { id, key:id, title, headingTokens:body.slice(i, i + 3), tokens:[], toc:[] };
        sections.push(section);
        i += 2;
        continue;
      }
      if (token.tag === 'h3' && section) section.toc.push({ id, title });
    }
    if (token.type === 'paragraph_open') {
      const content = body[i + 1]?.content || '';
      if (/^\*\*(?:Evidence|證據|原始工程來源|工程來源)/i.test(content)) token.attrJoin('class', 'evidence-note');
    }
    (section ? section.tokens : introduction).push(token);
    // Track enclosing containers, excluding ordinary heading/paragraph pairs.
    if (['blockquote_open', 'bullet_list_open', 'ordered_list_open', 'list_item_open'].includes(token.type)) topDepth++;
    if (['blockquote_close', 'bullet_list_close', 'ordered_list_close', 'list_item_close'].includes(token.type)) topDepth--;
  }
  if (!sections.length) throw new Error(`${expectedId}: no L3 chapters`);
  const render = items => l3Markdown.renderer.render(publicLabels ? presentationTokens(items) : items, l3Markdown.options, {});
  const display = text => publicLabels ? publicText(text) : text;
  return { id:expectedId, fullTitle, title:match[2],
    displayTitle:match[2].replace(/^Engineering Investigations[：:]\s*/, ''),
    introductionHtml:render(introduction), sections:sections.map(s => ({ ...s, sourceTitle:s.title, title:display(s.title),
      toc:s.toc.map(h => ({ ...h, title:display(h.title) })), headingHtml:render(s.headingTokens), html:render(s.tokens) })) };
}
