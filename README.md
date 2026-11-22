# Solving 99 Problems｜AI 解題實錄

獨立的網站呈現專案。目前只有繁體中文首頁：專案介紹、精選案例、更多案例，以及可搜尋、篩選與分頁的 99 題問題庫。首頁是未來第二層內容的入口，不顯示 Article 全文。列表一次只展開一題：已完成題目顯示完整技術／工具，尚待探索題目顯示既有問題描述與商業情境。第二層尚未建立，所有「查看完整案例」入口暫時隱藏，沒有假連結。

## 開發與建置

使用 Node.js 20.19+ 與 npm。建議採用目前受支援的 Node.js LTS。

```sh
npm ci
npm run dev
npm test
npm run build
```

開啟開發伺服器印出的網址，通常為 `http://localhost:8080`；Ctrl+C 停止。正式靜態輸出位於 `_site/`，無後端、資料庫或瀏覽器框架。技術為 Eleventy 3、Nunjucks、Markdown、原生 JavaScript 與 CSS。未新增套件。

## 檔案結構

```text
public/assets/                   瀏覽器端搜尋、篩選、分頁與列表展開互動
src/pages/index.njk              唯一首頁
src/_includes/layouts/           共用 HTML 版型
src/_includes/components/        精選卡片及技術／工具共用欄位
src/_data/problems.json          99 題原始定義、情境與分類的選擇性快照
src/_data/researchMetadata.json  八題已核實技術、工具、證據入口與四篇既有導讀
src/_data/importProvenance.json  來源與原檔 SHA-256
src/_data/research.js            兩個案例區與問題庫共用的資料整合
src/content/articles/           八篇 revised Articles 的原始 Markdown 副本
src/styles/global.css           首頁與響應式版面
scripts/import_research.py      明確執行才匯入來源的輔助工具
tests/library.test.js           資料完整性、篩選及分頁驗證
```

文章副本只用於保留原標題與供未來第二層使用，不渲染或嵌入首頁。JavaScript 關閉時顯示前 12 題，可原生展開技術／工具或問題描述；搜尋與分頁需要 JavaScript。未來 Problem Detail Page 完成後，可加入獨立標題／案例連結，保留整列與箭頭的展開功能，兩種操作分開處理。

## 資料與研究專案

研究專案仍是材料來源；原檔未修改。網站只保留選取的題庫欄位、八篇全文及維護用來源紀錄，不依賴研究目錄的絕對路徑。開發、測試及正式建置均只讀本專案的副本。

題庫來自 `99_Problems_AI淨價值審查_v4.xlsx` 的「原始題庫」，保留原 ID、名稱及分類。10 個商業領域共 57 題，另有 6 個 AI 分類共 42 題。八個完成項目依 Human 指定的 revised Articles 對應；「已完成探索／尚待探索」為 Human 指定的網站顯示名稱，不另行宣告研究驗收或部署狀態。

已完成題目顯示原文章標題；尚待探索題目顯示原題名稱，展開後讀取既有問題描述、背景及所需資料。表格「問題分類」涵蓋商業領域與 AI 應用分類。核心技術與實作工具是獨立欄位，兩個案例區與問題庫共用 `researchMetadata.json`。卡片預設最多三項，列表預設前兩項，+N 依實際陣列長度計算；展開已完成題目後直接顯示全部項目，不需再點 +N。只納入已核實的實作項目，證據入口保留在 `evidence`；候選方案不加入實績篩選。空白顯示為「—」，不推定候選工具已使用。

需要更新來源時，在明確獲授權後手動執行以下命令；它只讀取指定來源，更新本網站快照與文章副本，不在建置時自動執行：

```sh
python scripts/import_research.py --source <research-project-directory>
```

匯入後另行核對技術、工具與證據，不依文章提到的工具名稱自動認定實作。`npm test` 核對 99 個唯一 ID、10+6 類別、8/91 數量、原文章校驗碼、實績篩選及分頁邊界。

## GitHub Pages

原始碼儲存庫為 [vcstseng/solving-99-problems](https://github.com/vcstseng/solving-99-problems)。網站網址為 https://vcstseng.github.io/solving-99-problems/ 。`.github/workflows/pages.yml` 在推送至 `main` 或手動執行時，以 GitHub Actions 安裝依賴、測試、建置並部署 `_site/`。部署使用短期內建憑證，不需要另存金鑰。

專案子路徑可使用：

```sh
npm run build -- --pathprefix=/solving-99-problems/
```

Eleventy HTML Base plugin 會調整 HTML 中的資源 URL；JavaScript 模組採相對 import，頁內連結使用 hash。根網域或自訂網域使用預設 `/`。部署前驗證實際子路徑。`node_modules/`、`_site/`、環境檔、常見金鑰及本機設定均已排除版本控制。
