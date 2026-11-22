import MarkdownIt from "markdown-it";

// Use the Markdown AST rather than splitting paragraphs or maintaining a second
// summary. Every source body token is rendered exactly once, in source order.
export const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });
markdown.renderer.rules.table_open = () => '<div class="table-scroll" role="region" aria-label="可水平捲動的資料表" tabindex="0"><table>\n';
markdown.renderer.rules.table_close = () => '</table></div>\n';
const sectionKeys = new Map([
  ["案例概覽", "overview"], ["商業視角", "business"],
  ["技術視角", "technical"], ["案例範圍與限制", "scope"]
]);
const plainTitle = text => text.split("｜")[0].trim();
const slug = text => text.normalize("NFKC").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "heading";
const technicalNames = new Map([
  ["技術方法", "methods"], ["使用技術與工具", "tools"], ["技術與工具", "tools"],
  ["實作流程", "workflow"]
]);

function headingAnchor(title, section, level, parent) {
  const clean = title.replace(/^\d+\s*[｜|.、:：]\s*/u, "");
  if (level === 3) {
    if (/^(重點收穫|Key Takeaways)/i.test(clean)) return `${section}-takeaways`;
    if (section === "technical" && technicalNames.has(clean)) return `${section}-${technicalNames.get(clean)}`;
    const number = title.match(/^(\d+)\s*[｜|.、:：]/u)?.[1];
    return `${section}-${number ? number.padStart(2, "0") : slug(title)}`;
  }
  return `${parent || section}-${slug(title)}`;
}

export function parseL2(source, expectedId) {
  const tokens = markdown.parse(source.replace(/^\uFEFF/, ""), {});
  if (tokens[0]?.type !== "heading_open" || tokens[0].tag !== "h1") throw new Error(`${expectedId}: missing case title`);
  const fullTitle = tokens[1].content;
  const match = fullTitle.match(/^([A-Z]+\d+)\s*[｜|]\s*(.+)$/u);
  if (!match || match[1] !== expectedId) throw new Error(`${expectedId}: Markdown ID mismatch (${fullTitle})`);
  const start = tokens.findIndex((token, i) => i > 2 && token.type === "heading_open");
  if (start < 0) throw new Error(`${expectedId}: missing body`);
  const metadataTokens = tokens.slice(3, start);
  const fields = Object.fromEntries(metadataTokens.filter(t => t.type === "inline")
    .flatMap(t => t.content.split(/\r?\n/)).map(line => {
      const field = line.match(/^\*\*([^：:]+)[：:]\*\*\s*(.+?)\s*$/u);
      if (!field) throw new Error(`${expectedId}: unrecognized metadata: ${line}`);
      return [field[1], field[2]];
    }));
  for (const label of ["問題分類", "探索狀態", "案例類型"]) {
    if (!fields[label]) throw new Error(`${expectedId}: missing ${label}`);
  }

  const sections = [];
  const usedIds = new Set();
  const uniqueId = base => {
    let id = base, suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    return id;
  };
  let section;
  let parentHeading;
  for (let i = start; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "heading_open") {
      const inline = tokens[i + 1];
      const close = tokens[i + 2];
      let key = sectionKeys.get(plainTitle(inline.content));
      const isTop = token.tag === "h1" || key === "overview" || key === "scope";
      if (isTop) {
        key ||= `section-${slug(inline.content)}`;
        if (sections.some(s => s.key === key)) throw new Error(`${expectedId}: duplicate ${key}`);
        section = { key, id: key, title: inline.content, headings: [], tokens: [], headingTokens: [token, inline, close] };
        sections.push(section);
        uniqueId(key);
        parentHeading = null;
        token.tag = close.tag = "h2";
        token.attrSet("id", key);
        token.attrSet("tabindex", "-1");
        i += 2;
        continue;
      }
      if (!section) throw new Error(`${expectedId}: content outside a section`);
      const level = Number(token.tag.slice(1)) + 1;
      token.tag = close.tag = `h${Math.min(level, 6)}`;
      const heading = { id: uniqueId(headingAnchor(inline.content, section.key, level, parentHeading)), title: inline.content, level, children: [] };
      if (level === 3) parentHeading = heading.id;
      section.headings.push(heading);
      token.attrSet("id", heading.id);
      token.attrSet("tabindex", "-1");
    }
    if (!section) throw new Error(`${expectedId}: missing section`);
    section.tokens.push(token);
  }
  for (const s of sections) {
    s.headingHtml = markdown.renderer.render(s.headingTokens, markdown.options, {});
    const takeawayAt = s.tokens.findIndex((t, i) => t.type === "heading_open" && /重點收穫|Key Takeaways/.test(s.tokens[i + 1]?.content));
    if (takeawayAt >= 0) {
      const id = s.tokens[takeawayAt].attrGet("id");
      s.html = markdown.renderer.render(s.tokens.slice(0, takeawayAt), markdown.options, {}) +
        `<section class="key-takeaways" aria-labelledby="${id}">` +
        markdown.renderer.render(s.tokens.slice(takeawayAt), markdown.options, {}) + "</section>";
    } else s.html = markdown.renderer.render(s.tokens, markdown.options, {});
    s.toc = [];
    const stack = [{ level: 1, children: s.toc }];
    for (const heading of s.headings.filter(h => h.level === 3)) {
      while (stack.length > 1 && stack.at(-1).level >= heading.level) stack.pop();
      stack.at(-1).children.push(heading);
      stack.push(heading);
    }
    s.isView = ["business", "technical"].includes(s.key);
    delete s.tokens;
    delete s.headingTokens;
  }
  const acceptanceText = source.match(/[^\n。]*(?:最終人工驗收|Human Final Acceptance)[^\n。]*/iu)?.[0] || "";
  const humanAcceptance = /待完成|仍待完成|pending/iu.test(acceptanceText) ? "pending" : null;
  return { id: expectedId, title: match[2], fullTitle, fields, humanAcceptance, acceptanceText,
    metadataHtml: markdown.renderer.render(metadataTokens, markdown.options, {}), sections };
}
