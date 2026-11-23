import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html:false, linkify:false, typographer:false });
const sectionNames = new Map([
  ['核心概念', 'recursive-governance'], ['可信度的四個面向', 'trust-dimensions'],
  ['治理角色與關係', 'governance-roles'], ['框架的三個階段與十個主題', 'lifecycle'],
  ['橫跨三個階段的三項條件', 'cross-cutting-conditions'], ['三項核心原則', 'principles'],
  ['框架定位與邊界', 'scope'], ['總結', 'summary']
]);
const slug = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
markdown.renderer.rules.table_open = (tokens, index, options, env) => env.section === 'trust-dimensions'
  ? '<div class="framework-dimensions"><table role="table">\n'
  : '<div class="table-scroll" role="region" aria-label="可水平捲動的資料表" tabindex="0"><table>\n';
markdown.renderer.rules.table_close = () => '</table></div>\n';

export function parseFramework(source) {
  const tokens = markdown.parse(source.replace(/^\uFEFF/, ''), {});
  if (tokens[0]?.tag !== 'h1' || tokens[3]?.tag !== 'h2') throw new Error('Framework requires its English and Chinese titles.');
  const englishTitle = tokens[1].content;
  const title = tokens[4].content;
  const introduction = [];
  const sections = [];
  const ids = new Set(['framework-title']);
  let section;
  let stage;
  const unique = base => {
    let id = base, suffix = 2;
    while (ids.has(id)) id = `${base}-${suffix++}`;
    ids.add(id);
    return id;
  };
  for (let i = 6; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open') {
      const heading = tokens[i + 1].content;
      const close = tokens[i + 2];
      let id;
      if (token.tag === 'h2') {
        const name = heading.replace(/^[一二三四五六七八九十]+、/, '');
        const key = [...sectionNames].find(([prefix]) => name.startsWith(prefix))?.[1] || slug(name);
        id = unique(key);
        section = { key:id, id, title:heading, headingTokens:tokens.slice(i, i + 3), tokens:[], toc:[] };
        sections.push(section);
        stage = null;
        token.attrSet('id', id);
        token.attrSet('tabindex', '-1');
        i += 2;
        continue;
      }
      if (!section) {
        id = unique('core-question');
        token.tag = close.tag = 'h2';
      } else if (section.key === 'lifecycle' && /^[A-C]\.\s/.test(heading)) {
        id = unique(`stage-${heading[0].toLowerCase()}`);
        token.attrJoin('class', 'framework-stage');
        stage = { id, title:heading, children:[] };
        section.toc.push(stage);
      } else {
        const number = heading.match(/^(\d+)\.\s/)?.[1];
        id = unique(section.key === 'lifecycle' && number ? `topic-${number.padStart(2, '0')}` : `${section.key}-${slug(heading)}`);
        const item = { id, title:heading, children:[] };
        if (section.key === 'lifecycle' && stage && number) {
          token.tag = close.tag = 'h4';
          token.attrJoin('class', 'framework-topic');
          stage.children.push(item);
        } else section.toc.push(item);
      }
      token.attrSet('id', id);
      token.attrSet('tabindex', '-1');
    }
    (section ? section.tokens : introduction).push(token);
  }
  const render = (items, env = {}) => markdown.renderer.render(items, markdown.options, env);
  const renderSection = s => {
    if (s.key !== 'cross-cutting-conditions') return render(s.tokens, { section:s.key });
    const parts = [];
    let current = [];
    for (const token of s.tokens) {
      if (token.type === 'heading_open' && token.tag === 'h3' && current.length) {
        parts.push(current);
        current = [];
      }
      current.push(token);
    }
    if (current.length) parts.push(current);
    return `<div class="framework-conditions">${parts.map(items => `<section>${render(items)}</section>`).join('')}</div>`;
  };
  return { title, englishTitle, introductionHtml:render(introduction), sections:sections.map(s => ({ ...s,
    headingHtml:render(s.headingTokens), html:renderSection(s) })) };
}
