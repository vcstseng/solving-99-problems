import { normalize, filterProblems, paginate, pageNumbers } from "./library-model.js";

const form = document.querySelector("#library-filters");
const fields = Object.fromEntries(["keyword", "domain", "status", "technology", "tool"].map(id => [id, document.getElementById(id)]));
const sizeControl = document.getElementById("page-size");
const list = document.getElementById("problem-list");
const records = [...list.querySelectorAll(".problem-item")].map(element => {
  const id = element.dataset.id;
  const technologies = element.dataset.technologies.split("||").filter(Boolean);
  const tools = element.dataset.tools.split("||").filter(Boolean);
  return { element, id, domain: element.dataset.domain, group: element.dataset.group,
    status: element.dataset.status, technologies, tools,
    search: normalize([id, element.dataset.domain, element.dataset.search,
      element.querySelector(".problem-title").textContent, ...technologies, ...tools].join(" ")) };
});
let page = 1;

function closeOtherRows(except) {
  for (const item of list.querySelectorAll(".problem-item[open]")) if (item !== except) item.open = false;
}

list.addEventListener("click", event => {
  const summary = event.target.closest(".problem-summary");
  if (!summary) return;
  // Future detail links inside a row navigate independently of this disclosure.
  if (event.target.closest("a, button")) return;
  event.preventDefault();
  const item = summary.parentElement;
  if (item.open) { item.open = false; return; }
  closeOtherRows(item);
  item.open = true;
});
list.addEventListener("click", event => {
  const button = event.target.closest("[data-close-row]");
  if (!button) return;
  const item = button.closest(".problem-item");
  item.open = false;
  item.querySelector("summary").focus({ preventScroll: true });
  item.scrollIntoView({ block: "nearest" });
});

function renderPagination(totalPages) {
  const nav = document.getElementById("pagination");
  nav.replaceChildren();
  function addButton(label, target, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = !!options.disabled;
    if (options.current) button.setAttribute("aria-current", "page");
    button.setAttribute("aria-label", options.label || `第 ${target} 頁`);
    button.addEventListener("click", () => {
      page = target;
      render();
      document.querySelector("#pagination [aria-current='page']")?.focus({ preventScroll: true });
      document.querySelector(".library-toolbar").scrollIntoView({ block: "start" });
    });
    nav.append(button);
  }
  if (totalPages > 1) addButton("上一頁", page - 1, { disabled: page === 1, label: "上一頁" });
  for (const value of pageNumbers(page, totalPages)) {
    if (value === "…") { const span = document.createElement("span"); span.textContent = "…"; nav.append(span); }
    else addButton(String(value), value, { current: page === value });
  }
  if (totalPages > 1) addButton("下一頁", page + 1, { disabled: page === totalPages, label: "下一頁" });
}

function render() {
  const filters = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  const matches = filterProblems(records, filters);
  const result = paginate(matches, page, Number(sizeControl.value));
  page = result.page;
  const visible = new Set(result.items.map(p => p.id));
  for (const record of records) {
    record.element.open = false;
    record.element.hidden = !visible.has(record.id);
  }
  const completed = matches.filter(p => p.status === "complete").length;
  const count = document.getElementById("result-count");
  const detail = document.createElement("span");
  detail.textContent = `（已完成探索 ${completed} 題，尚待探索 ${matches.length - completed} 題）`;
  count.replaceChildren(document.createTextNode(`共 ${matches.length} 個問題 `), detail);
  document.getElementById("page-range").textContent = `${result.first}–${result.last} / ${matches.length}`;
  document.getElementById("empty-state").hidden = matches.length !== 0;
  document.getElementById("pagination").hidden = matches.length === 0;
  renderPagination(result.totalPages);
}

function reset() {
  for (const field of Object.values(fields)) field.value = "";
  page = 1;
  render();
}
form.addEventListener("submit", event => event.preventDefault());
form.addEventListener("input", () => { page = 1; render(); });
form.addEventListener("change", () => { page = 1; render(); });
form.addEventListener("reset", event => { event.preventDefault(); reset(); });
sizeControl.addEventListener("change", () => { page = 1; render(); });
document.querySelector("[data-clear-filters]").addEventListener("click", reset);
for (const link of document.querySelectorAll("[data-domain-link], [data-ai-link], [data-completed-link], .primary-link")) {
  link.addEventListener("click", () => {
    for (const field of Object.values(fields)) field.value = "";
    if (link.hasAttribute("data-completed-link")) fields.status.value = "complete";
    else if (link.hasAttribute("data-ai-link")) fields.domain.value = "__ai";
    else if (link.hasAttribute("data-domain-link")) fields.domain.value = link.dataset.domainLink;
    page = 1;
    render();
  });
}
render();
