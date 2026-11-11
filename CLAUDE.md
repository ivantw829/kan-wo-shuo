# CLAUDE.md

「看我說」：一個打字後用全螢幕黑底黃字楷體大字顯示的輔助溝通網頁。使用者說繁體中文，回覆與文件一律用繁體中文。

## 專案結構

- `index.html`：全部程式碼都在這裡（內嵌 CSS、JS），**沒有建置步驟、沒有套件**。保持單一檔案，除非使用者要求拆開。
- `manifest.webmanifest`、`sw.js`：離線與加入主畫面。`sw.js` 對同源與 Google Fonts 用 stale-while-revalidate，改 `index.html` 不必調版本號；只有 `PRECACHE` 清單變動（新增／改名檔案）才要調高 `CACHE`。service worker 只在 `http(s)` 註冊，`file://` 與 `data:` 預覽不會有。
- `icons/`：正式 icon。`icon.svg`（favicon，圓角）、`icon-192.png`、`icon-512.png`、`apple-touch-icon.png`（180px，滿版方形不透明，iOS 會自己切圓角）。
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
- localStorage 鍵：`phrases`（常用句陣列）、`history`（最近 15 句）、`flipped`（布林）、`size`（`大`／`中`／`小`）、`draft`（輸入框草稿字串，輸入後 300ms 寫入）。所有讀寫都經過 `store`，包在 try/catch 裡，存取失敗時網頁照常運作。
- 常用句拖曳排序用 Pointer Events，只在「管理」模式啟用；管理模式下點 chip 本體不刪除，點 × 才刪除。
- 進入全螢幕後 400ms（`IGNORE_MS`）內忽略點擊與 Enter／空白鍵返回，避免送出的按鍵穿透；Esc 不受限。
- 全螢幕 API 與 Wake Lock 都是「能用就用」，失敗要安靜略過（iPhone Safari 不支援元素全螢幕）。

## 測試

- 用 Browser pane 預覽：它是用 `data:` URL 載入，**localStorage 會被停用**、相對路徑的 icon 不會顯示，這是預覽限制不是 bug。
- 自動化工具無法輸入中文，測試時用 JS 設定 `#input` 的 value 再點「全螢幕」按鈕。
- 手機觸控、主畫面 icon 只能請使用者在實機確認，回報時要說明哪些沒測到。

## Commit

- 一律遵守 [COMMIT_CONVENTION.md](COMMIT_CONVENTION.md)：`<類型>(<範圍>): <繁中摘要>`，標題 ≤ 50 字元、不加句號；有說明時必須有「原因：」「變更：」「驗證：」三段。
- `.githooks/commit-msg` 會檢查格式。新 clone 要先執行：`git config commit.template .gitmessage && git config core.hooksPath .githooks`
- 不要用 `--no-verify` 跳過檢查。
- 只有使用者要求時才 commit。
