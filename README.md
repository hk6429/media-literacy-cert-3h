# 媒體素養三小時自學課程

獨立的教師線上自學與課程完成證明網站。系統保存六個模組、150 題評量、逐卷有效學習時間、六份實作證據、微教案與完成證明資料；管理端可查詢名單及匯出 CSV。

> 本站為陳乃誠教師自編課程，未宣稱由教育部、國教署、國教院或地方政府認證。本站完成證明不是全國教師在職進修網研習時數證明。

## 功能

- 三小時課程：媒體框架、商業行銷、媒體再現與網路傷害、資訊查證、平台演算法、AI 深偽倫理。
- 六個圖文模組，每卷至少 25 分鐘，微教案教學轉化至少 30 分鐘。
- 每卷 25 題評量，合計 150 題全部必答，各卷 80 分通過。
- 首頁與六卷教材使用七張專屬 AI 生成 Q 版國風潑墨圖片。
- 每卷繳交一份結構化實作證據：分析對象、具體觀察、判斷理由及限制／下一步。
- 一頁媒體素養微教案，含可觀察目標、分鐘流程、學生產出、評量證據與安全檢核。
- 頁面可見且持續互動時，分卷累積有效學習時間。
- 完成全部條件後核發唯一的本站課程完成證明。
- 公開驗證只顯示遮罩姓名、學校與完成日期。
- 新學員使用 30 天、可撤銷 HttpOnly 工作階段與一次性復原碼；不在 localStorage 保存永久登入憑證，舊版憑證遷移後立即失效。
- 管理端使用具名帳號、密碼、TOTP 驗證器、可撤銷工作階段及稽核紀錄。

## 技術架構

- Cloudflare Worker：API、驗證與靜態資產。
- SQLite-backed Durable Object：強一致課程紀錄與後臺查詢，不占用 D1 名額。
- Web Crypto：亂數復原碼、工作階段雜湊、TOTP 及固定時間密碼比對。
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
ADMIN_USERNAME=具名管理員帳號
ADMIN_TOTP_SECRET=驗證器使用的 Base32 密鑰
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
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_TOTP_SECRET
npx wrangler secret put SESSION_SECRET
```

部署：

```bash
npm run deploy
```

第一次部署會依 `wrangler.jsonc` 的 `exports` 宣告建立獨立 SQLite-backed Durable Object namespace。

## 完成條件

1. 六卷各累積至少 1,500 秒有效學習活動。
2. 六個模組共 150 題均完成，且各卷達 80 分。
3. 六卷各繳交一份實作證據。
4. 微教案區累積至少 1,800 秒，並通過教案品質檢核。

以上條件均由後端判定；前端不能直接核發證書。

## 資料與隱私

蒐集姓名、學校、Email、進度、成績、實作證據、微教案、完成時間與完成證明編號，只用於恢復學習、完成判定、證明核發及管理查詢。公開驗證不顯示 Email、成績、實作證據或教案；詳細告知事項見網站首頁。

登入者可在課程總覽安全登出或直接刪除自己的個人資料。Durable Object 每日執行到期清理，完成或最後活動超過三年的學員資料會刪除；過期工作階段、稽核與限制紀錄也依各自期限清理。權利請求聯絡 `doc614@mail.zgjh.hc.edu.tw`。

## 專案結構

```text
src/                 Worker、六卷教材、150 題題庫、Durable Object
public/              教師端、AI 圖片、管理端、完成證明驗證與樣式
docs/                設計哲學與視覺規範
test/                課程、資料層與 HTTP 測試
wrangler.jsonc       Cloudflare bindings、靜態資產與觀測設定
worker-configuration.d.ts  由 wrangler types 產生，不提交 Git
```

## 素材來源原則

課程內容依使用者提供之 112 學年度媒體素養教師研習影片、整理稿與既有教學簡報重新編寫。網站連結官方公開課程頁，不重新散布原始影片檔。

網站圖片全部透過 AI 生成，不使用網路抓圖或 SVG 插畫；生成提示與設計原則記錄於 `docs/design-philosophy.md`。素材來源、使用方式與題庫代碼對照見 `docs/source-rights-register.md` 及 `docs/question-source-map.md`。
