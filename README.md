# Solving 99 Problems｜AI 解題實錄

獨立的靜態網站專案。首頁包含專案介紹、案例卡片及可搜尋、組合篩選、分頁的 99 題問題庫。已完成八個 L2：CS07、P02、CS02、DEV04、L06、S01、VER02、VER06，全部使用同一套 Markdown Renderer。八個案例均另提供工程深讀頁面。Hero 以領域色塊中的完整標題為主，識別碼縮小。

## 開發與建置

使用 Node.js 20.19+、npm、Eleventy 3、Nunjucks、Markdown、原生 JavaScript 與 CSS。`markdown-it` 為 Eleventy 已使用的解析器，登錄為直接依賴以處理內容與目錄；沒有新增前端框架。

```sh
npm ci
npm run dev
npm test
npm run build
```

開啟開發伺服器印出的網址，通常為 `http://localhost:8080`。正式靜態輸出為 `_site/`。案例網址使用原始 ID 小寫，例如 `/problems/cs07/`、`/problems/p02/`、`/problems/ver02/`。

## 檔案結構

```text
src/pages/index.njk                 首頁
src/pages/case.njk                  八個案例共用的 L2 版型
src/_lib/l2.js                      Markdown 解析、章節與目錄產生
src/_data/l2Registry.json           明確 ID／檔名對應及啟用範圍
src/_data/l2Cases.js                原文件欄位與網站顯示欄位分開整合
src/_data/l2Provenance.json         L2 原檔匯入校驗碼
src/content/l2/                     原始 L2 Markdown 的逐位元組副本
src/_data/problems.json             99 題原始定義與分類快照
src/_data/researchMetadata.json     首頁已核實的技術／工具及既有導讀
src/_data/research.js               首頁共用案例資料
src/content/articles/              八篇 revised Articles 原始副本，保留首頁標題
src/_includes/                     共用版型與首頁元件
src/styles/                        全域及 L2 響應式樣式
public/assets/                     問題庫與 TOC 原生互動
scripts/sync-l2.mjs                 只讀研究來源，更新網站 L2 副本
scripts/import_research.py          既有題庫與 Article 選擇性匯入
tests/                            內容完整性、ID、目錄、來源、搜尋與分頁驗證
```

## L2 內容更新

L2 直接使用已確認的 Markdown，不維護第二套摘要或結果表。原始段落、標題、表格、Key Takeaways、核心收穫及限制依文件順序呈現。HTML 標題層級只作語意整理，文字不改寫。章節、色帶與目錄由 Markdown 自動產生，不限制文章高度、章節數或流程步驟數。

研究專案保持獨立，原檔不修改。更新研究來源後，一次同步即可，不需重新排版：

```sh
npm run sync:l2 -- --source "<L2 Markdown directory>"
npm run build
```

目前本機已用忽略版本控制的 `l2-source.local` 指定研究專案的 L2 資料夾；也可設定 `L2_SOURCE_DIR` 覆蓋此來源。Eleventy 會監看該資料夾，在建置前同步最新八份 L2 原檔；僅寫入網站副本。沒有設定本機來源時，開發與 GitHub 建置皆只使用本專案副本，不依賴任何外部本機路徑。直接更新 `src/content/l2/` 也會觸發重新建置；若從研究來源更新，請使用同步命令以一併更新原檔校驗碼。

`l2Registry.json` 明確指定 `VER02 → VER2_L2.md`、`VER06 → VER6_L2.md`；不由檔名猜 ID。目前八個案例均為 enabled，依對應產生頁面，並核對文件標題內的原始 ID。原文件分類、研究狀態與案例類型保留於原始欄位。首頁與 L2 共用網站分類及「已完成探索／尚待探索」標籤；L2 額外顯示原文件分類、原始研究狀態與人工驗收 Pending，不將探索完成當作人工驗收通過。啟用 L2 的案例正式標題直接取自 L2 Markdown；首頁短摘要集中於 `researchMetadata.json`，不截取 L2 前 N 字，也不在執行時生成內容。

Anchor 採穩定的章節編號或語意名稱，例如 `business-01`、`business-takeaways`、`technical-methods`、`technical-tools`、`technical-workflow`、`technical-takeaways`。H4 插入不改變主要 Anchor；同名標題會產生唯一 ID。TOC 僅列主要章節與 H3，H4 仍有可直接連結的 Anchor。

桌面為正文加單一 Sticky TOC，標示目前閱讀位置；手機為單欄及可收合目錄。關閉 JavaScript 時，全文、表格、章節連結與原生目錄仍可閱讀，位置高亮需要 JavaScript。表格會換行，必要時可在表格區域內水平捲動。首頁列表展開與前往 L2 為獨立操作，尚未完成題目仍只顯示既有問題描述。

## L3 本機預覽與內容更新

八個案例均已啟用工程深讀，例如 `/problems/cs07/engineering/`、`/problems/p02/engineering/`；各 L2 頁尾提供往返入口。`src/_data/l3Registry.json` 明確對應 ID 與檔案；`src/content/l3/` 保留原始 Markdown 副本及匯入校驗碼。章節、表格與目錄依原文產生，不重新摘要研究內容。公開介面使用中文章節／段落標籤與中文主標，移除內部 L3／L4 編號；這些顯示轉換集中於 `src/_lib/l3.js`，不修改 Markdown、研究數字或驗收結論。

```sh
npm run sync:l3 -- --source "<L3 Markdown directory>"
npm run dev
```

可用不進版本控制的 `l3-source.local` 或 `L3_SOURCE_DIR` 指定本機來源，開發時自動同步。沒有本機設定時，建置使用專案內副本。Mermaid 使用本機提供的 `@mermaid-js/tiny` 渲染 SVG，支援放大；載入失敗或停用 JavaScript 時仍保留原始碼。尚未公開的研究相對路徑不產生 L4 連結。啟用 JavaScript 時目錄只展開目前章節的小節；停用時全部目錄仍可使用。P02 的原始 TeX 公式由 KaTeX 在建置時轉成 HTML／MathML，字型與樣式由網站本身提供，不呼叫外部服務。八個案例共用同一版型，支援不同章節數、表格與程式碼。

## AI 管理 AI 框架頁

`/ai-managing-ai/` 使用 `src/content/framework/ai-managing-ai.md` 的完整內容。更新該 Markdown 即會重新產生章節、表格、階段／主題及目錄；不在元件內另外維護一套框架文案。四個面向以響應式 2×2 區塊呈現，五種角色另有非線性的關係示意；頁面不放案例。

全站頁首共用 `src/_includes/components/site-header.njk`；「AI 管理 AI」連到框架頁，首頁原有精選案例區塊保留。桌面使用單一 Sticky 目錄，手機目錄可收合，選單開啟期間保留原閱讀章節。

## 原始資料

題庫來自 `99_Problems_AI淨價值審查_v4.xlsx` 的「原始題庫」：10 個商業領域 57 題，6 個 AI 分類 42 題，共 99 個唯一 ID；八個完成項目依既有 revised Articles 對應。首頁實際技術與工具維持共用的 `researchMetadata.json`，不把候選方案加入實績篩選。L2 正文使用已確認的 L2 文件，不從其他研究文件重新生成。

## GitHub Pages

原始碼儲存庫：[vcstseng/solving-99-problems](https://github.com/vcstseng/solving-99-problems)。已發布首頁網址：https://vcstseng.github.io/solving-99-problems/ 。推送至 `main` 後，`.github/workflows/pages.yml` 執行安裝、測試、建置與部署。既有 GitHub Actions 部署流程維持不變。

```sh
npm run build -- --pathprefix=/solving-99-problems/
```

HTML Base plugin 調整資源與內部頁面 URL；頁內目錄使用 hash。`node_modules/`、`_site/`、環境檔、常見金鑰與本機設定已排除版本控制。
