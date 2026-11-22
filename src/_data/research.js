import fs from "node:fs";
import { parseL2 } from "../_lib/l2.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const definitions = JSON.parse(read("./problems.json"));
const metadata = JSON.parse(read("./researchMetadata.json"));
const detailRegistry = JSON.parse(read("./l2Registry.json"));
const palettes = {
  "銷售": ["#ae3738", "#ffffff"], "行銷": ["#305bd4", "#ffffff"],
  "財務": ["#268252", "#ffffff"], "人資": ["#76549e", "#ffffff"],
  "採購": ["#e5a10c", "#201e1a"], "營運": ["#c66b17", "#ffffff"],
  "客服": ["#098c87", "#ffffff"], "供應鏈": ["#487b94", "#ffffff"],
  "法務／合規": ["#c12b72", "#ffffff"], "管理": ["#747334", "#ffffff"],
  "安全": ["#815348", "#ffffff"], "治理與控制": ["#715777", "#ffffff"],
  "可靠性與驗證": ["#3d6879", "#ffffff"], "AI 原生開發": ["#5d498c", "#ffffff"],
  "人機協作": ["#655c40", "#ffffff"], "系統性後果": ["#4e6460", "#ffffff"]
};
const displayOrder = ["CS07", "P02", "DEV04", "L06", "S01", "CS02", "VER02", "VER06"];

export default function () {
  const problems = definitions.map(p => {
    const actual = metadata[p.id];
    const l2 = detailRegistry[p.id]?.enabled ? parseL2(read(`../content/l2/${detailRegistry[p.id].file}`), p.id) : null;
    const article = p.completed ? read(`../content/articles/problem_${p.id}.md`) : "";
    const articleTitle = article ? article.replace(/^\uFEFF/, "").split(/\r?\n/)[0].replace(/^#\s+/, "") : "";
    const title = l2?.title || articleTitle || p.originalName;
    return { ...p, title, articleTitle, preview: actual?.preview || p.businessProblem,
      detailUrl: detailRegistry[p.id]?.enabled ? `/problems/${p.id.toLowerCase()}/` : null,
      technologies: actual?.technologies || [], tools: actual?.tools || [],
      color: palettes[p.domain][0], foreground: palettes[p.domain][1],
      status: p.completed ? "已完成探索" : "尚待探索" };
  }).sort((a, b) => {
    const ai = displayOrder.indexOf(a.id), bi = displayOrder.indexOf(b.id);
    return (ai < 0 ? 100 + a.order : ai) - (bi < 0 ? 100 + b.order : bi);
  });
  const domains = [...new Set(definitions.map(p => p.domain))].map(name => ({
    name, count: definitions.filter(p => p.domain === name).length,
    business: definitions.find(p => p.domain === name).group === "business",
    color: palettes[name][0], foreground: palettes[name][1]
  }));
  return { problems, domains, businessDomains: domains.filter(d => d.business),
    aiDomains: domains.filter(d => !d.business),
    featured: problems.find(p => p.id === "CS07"),
    selected: ["P02", "DEV04", "L06"].map(id => problems.find(p => p.id === id)),
    technologies: [...new Set(problems.flatMap(p => p.technologies))].sort((a,b) => a.localeCompare(b, "zh-Hant")),
    tools: [...new Set(problems.flatMap(p => p.tools))].sort((a,b) => a.localeCompare(b, "en")) };
}
