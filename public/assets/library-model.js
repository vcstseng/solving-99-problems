export function normalize(value) {
  return String(value).normalize("NFKC").toLocaleLowerCase("zh-Hant").replace(/\s+/g, " ").trim();
}

export function filterProblems(problems, filters) {
  const terms = normalize(filters.keyword || "").split(" ").filter(Boolean);
  return problems.filter(p =>
    (!filters.domain || (filters.domain === "__ai" ? p.group !== "business" : p.domain === filters.domain)) &&
    (!filters.status || p.status === filters.status) &&
    (!filters.technology || p.technologies.includes(filters.technology)) &&
    (!filters.tool || p.tools.includes(filters.tool)) &&
    terms.every(term => p.search.includes(term))
  );
}

export function paginate(problems, requestedPage, size) {
  const totalPages = Math.max(1, Math.ceil(problems.length / size));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * size;
  return { page, totalPages, items: problems.slice(start, start + size),
    first: problems.length ? start + 1 : 0, last: Math.min(start + size, problems.length) };
}

export function pageNumbers(current, total) {
  const visible = new Set([1, total]);
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) visible.add(i);
  if (current <= 2) visible.add(Math.min(3, total));
  if (current >= total - 1) visible.add(Math.max(1, total - 2));
  const pages = [...visible].sort((a, b) => a - b), result = [];
  for (let i = 0; i < pages.length; i++) {
    if (i && pages[i] - pages[i - 1] === 2) result.push(pages[i] - 1);
    else if (i && pages[i] - pages[i - 1] > 2) result.push("…");
    result.push(pages[i]);
  }
  return result;
}
