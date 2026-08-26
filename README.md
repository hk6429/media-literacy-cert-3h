# 媒體素養認證 3 小時

獨立的教師線上增能與課程完成證書網站。教師只需第一次填寫姓名、學校與 Email；系統會保存六個模組、150 題評量、有效學習時間、微教案與證書資料。管理端可查詢完成名單及匯出 CSV。

## 功能

- 三小時課程：媒體框架、商業行銷、媒體再現與網路傷害、資訊查證、平台演算法、AI 深偽倫理。
- 六個圖文模組，每卷 30 分鐘。
- 每卷 25 題評量，合計 150 題全部必答，各卷 80 分通過。
- 首頁與六卷教材使用七張專屬 AI 生成 Q 版國風潑墨圖片。
- 一頁媒體素養微教案。
- 頁面可見且持續互動時累積有效學習時間。
- 完成 180 分鐘及全部任務後核發唯一證書。
- 公開證書驗證只顯示遮罩姓名、學校與完成日期。
- 管理端使用 HttpOnly 簽章 Cookie，可搜尋、查看教案與匯出 CSV。
- 教師可下載／匯入本機學習進度憑證，換電腦不必重新註冊。

## 技術架構

- Cloudflare Worker：API、驗證與靜態資產。
- SQLite-backed Durable Object：強一致課程紀錄與後臺查詢，不占用 D1 名額。
- Web Crypto：亂數憑證、Token 雜湊、HMAC 管理工作階段及固定時間密碼比對。
- Vanilla HTML、CSS、JavaScript：無前端框架與額外建置步驟。
- TypeScript、Vitest、Cloudflare Vitest Plugin：型別與 Workers Runtime 測試。

## 本機開發

需求：Node.js 22 以上、npm。

```bash
npm install
cp .dev.vars.example .dev.vars
```

編輯 `.dev.vars`：

```text
ADMIN_PASSWORD=長且不重複的管理密碼
SESSION_SECRET=至少32位元組的隨機字串
```

啟動：

```bash
npm run dev
```

檢查：

```bash
npm run check
```

## 部署

先確認 Cloudflare OAuth 登入有效：

```bash
npx wrangler whoami
```

設定正式站 Secret；指令會互動式要求輸入，不會把內容寫進 shell 歷史或 Git：

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

部署：

```bash
npm run deploy
```

第一次部署會依 `wrangler.jsonc` 的 `exports` 宣告建立獨立 SQLite-backed Durable Object namespace。

## 完成條件

1. 有效學習時間達 10,800 秒。
2. 六個模組的 150 題均完成，且各卷達 80 分。
3. 完成一頁微教案。

以上條件均由後端判定；前端不能直接核發證書。

## 資料與隱私

蒐集姓名、學校、Email、進度、成績、微教案、完成時間與證書編號，只用於恢復學習、完成判定、證書核發及管理查詢。公開驗證不顯示 Email、成績或教案。

本網站核發的是課程完成證書；是否登錄正式教師研習時數，依實際辦理單位與學校規定。

## 專案結構

```text
src/                 Worker、六卷教材、150 題題庫、Durable Object
public/              教師端、AI 圖片、管理端、證書驗證與樣式
docs/                設計哲學與視覺規範
test/                課程、資料層與 HTTP 測試
wrangler.jsonc       Cloudflare bindings、靜態資產與觀測設定
worker-configuration.d.ts  由 wrangler types 產生，不提交 Git
```

## 素材來源原則

課程內容依使用者提供之 112 學年度媒體素養教師研習影片、整理稿與既有教學簡報重新編寫。網站連結官方公開課程頁，不重新散布原始影片檔。

網站圖片全部透過 AI 生成，不使用網路抓圖或 SVG 插畫；生成提示與設計原則記錄於 `docs/design-philosophy.md`。
