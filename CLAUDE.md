# CLAUDE.md

「看我說」：一個打字後用全螢幕黑底黃字楷體大字顯示的輔助溝通網頁。使用者說繁體中文，回覆與文件一律用繁體中文。

## 專案結構

- `index.html`：全部程式碼都在這裡（內嵌 CSS、JS），**沒有建置步驟、網站不依賴任何套件**。保持單一檔案，除非使用者要求拆開。
- `manifest.webmanifest`、`sw.js`：離線與加入主畫面。`sw.js` 對同源與 Google Fonts 用 stale-while-revalidate（背景更新包在 `e.waitUntil`；離線導覽沒快取時退回 `'./'`），改 `index.html` 不必調版本號；只有 `PRECACHE` 清單變動（新增／改名檔案）才要調高 `CACHE`（目前 `kan-wo-shuo-v2`）。service worker 只在 `http(s)` 註冊，`file://` 與 `data:` 預覽不會有。
- `icons/`：正式 icon。`icon.svg`（favicon，圓角）、`icon-192.png`、`icon-512.png`、`apple-touch-icon.png`（180px，滿版方形不透明，iOS 會自己切圓角）、`icon-maskable-512.png`（Android 主畫面用，由 `icon-512.png` 縮成 410px 四周補黑，指令見 README）。
- `package.json`、`playwright.config.js`、`tests/`：**只給測試用**的開發工具（`@playwright/test`），網站本身不會載入。`tests/serve.mjs` 是不用套件的靜態伺服器（`npm run serve`，port 4173）。
- `.github/workflows/pages.yml`：PR 與 push 都跑測試；`main` 測試通過才部署到 GitHub Pages（來源是「GitHub Actions」）。只發佈 `index.html`、`manifest.webmanifest`、`sw.js`、`icons/*.svg`、`icons/*.png`。**新增網站要用的檔案時，要一起加進這個 workflow 的複製步驟和 `sw.js` 的 `PRECACHE`。**
- `icons/options/`：備選設計 A（巨字「說」裁切）、B（印章「看我說」）、C（一點 + 小印「說」）、D（黃底黑「看」）。**目前正式使用 C**，是使用者選的。
- `tools/make-icons.swift`：用 CoreText 把楷體字形轉成路徑，輸出 SVG（不依賴字型）與 PNG。改 icon 時改這個腳本再重產，不要手改 SVG。PNG 小尺寸用 `sips -z` 從 512 縮。

## 設計規則

- 顏色：黃 `#FFD500`、黑 `#000`。半透明黃用 `--fg-dim`、`--fg-faint`。不要加其他顏色。
- 字型堆疊（CSS 變數 `--kai`）：`BiauKai, 標楷體, DFKai-SB, Kaiti TC, TW-Kai, STKaiti, KaiTi, LXGW WenKai TC, serif`。最後的霞鶩文楷從 Google Fonts 載入，是手機的備援。
- 全螢幕的字**不是越大越好**：使用者覺得短句撐滿整個螢幕很沒用。字級上限是畫面短邊 × `SIZES`（大 0.34／中 0.24／小 0.16，預設中），長句再自動縮小。
- 按鈕和提示文字用「全螢幕」，不用「顯示」（使用者指定）。
- 輸入框的字要適中：56px 使用者覺得太大，28px 又太小，目前是 `clamp(24px, 4.5vw, 40px)`。
- 手機優先：注意 `env(safe-area-inset-*)`、`100dvh`、`touch-action`。

## 程式重點

- `fit()`：二分搜尋字級，讓 `#text` 的 `scrollWidth/scrollHeight` 塞進顯示區，上限由 `SIZES[size]` 決定。改顯示樣式（padding、line-height）後要確認它還正確。
- Enter 送出時要排除輸入法選字：`!e.isComposing && e.keyCode !== 229`。不能拿掉。
- localStorage 鍵：`phrases`（常用句陣列）、`history`（最近 15 句）、`flipped`（布林）、`size`（`大`／`中`／`小`）、`draft`（輸入框草稿字串，輸入後 300ms 寫入）。所有讀寫都經過 `store`，包在 try/catch 裡，存取失敗時網頁照常運作。字串陣列一律用 `store.getList`（經過 `cleanList` 過濾非字串、空白與重複），資料壞掉時退回預設值。
- chip 的文字在 `.t` span 裡，ellipsis 只套在 `.t`，這樣管理模式的 × 不會被截掉。
- 常用句管理只在「管理」模式啟用：拖曳排序用 Pointer Events；鍵盤聚焦 chip 按 Alt+方向鍵移動、Delete／Backspace 刪除（`phrasesEl` 上的 keydown，`renderPhrases(focusIndex)` 會把焦點放回去）；點 chip 本體不刪除，點 × 才刪除。
- 刪除常用句、清空最近說過都要經過 `notify(msg, undo)` 顯示 `#toast` 並可「復原」（5 秒）；同時只有一則。
- 匯出格式：`{ "app": "kan-wo-shuo", "version": 1, "phrases": [...] }`，檔名 `看我說-常用句.json`。匯入也接受純字串陣列，與現有常用句合併去重，接在後面。
- 全螢幕時 `#editor` 設 `inert`，返回時拿掉。重算字級用 `ResizeObserver(display)` 加 rAF（`scheduleFit`），字型 `loadingdone` 也會重算；最小字級還放不下時 `#display` 加 `.overflow` 可捲動。
- 進入全螢幕後 400ms（`IGNORE_MS`）內忽略點擊與 Enter／空白鍵返回，避免送出的按鍵穿透；Esc 不受限。
- 全螢幕 API 與 Wake Lock 都是「能用就用」，失敗要安靜略過（iPhone Safari 不支援元素全螢幕）。

## 測試

- 改完先跑 `npm test`（Playwright：Desktop Chromium、Pixel 7、iPhone 15 WebKit）。新功能或修 bug 要在 `tests/app.spec.js` 補測試。第一次要 `npm install && npx playwright install chromium webkit`。
- Playwright 的 `page.fill` 可以填中文；測 400ms 防誤觸時用 `page.evaluate` 同步呼叫，避免時間不穩。測試預設擋掉 Google Fonts 與 service worker，只有離線測試打開 service worker。
- 用 Browser pane 預覽：直接開檔案時是 `data:` URL，**localStorage 會被停用**、相對路徑的 icon 不會顯示，這是預覽限制不是 bug。要完整預覽就 `npm run serve` 再開 `http://localhost:4173/`。
- Browser pane 的自動化無法輸入中文，在那裡測試時用 JS 設定 `#input` 的 value 再點「全螢幕」按鈕。
- 手機觸控、主畫面 icon 只能請使用者在實機確認，回報時要說明哪些沒測到。

## Commit

- 一律遵守 [COMMIT_CONVENTION.md](COMMIT_CONVENTION.md)：`<類型>(<範圍>): <繁中摘要>`，標題 ≤ 50 字元、不加句號；有說明時必須有「原因：」「變更：」「驗證：」三段。
- `.githooks/commit-msg` 會檢查格式。新 clone 要先執行：`git config commit.template .gitmessage && git config core.hooksPath .githooks`
- 不要用 `--no-verify` 跳過檢查。
- 只有使用者要求時才 commit。
