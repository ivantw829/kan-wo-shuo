<p align="center"><img src="icons/icon-512.png" width="120" alt="看我說 icon"></p>

<h1 align="center">看我說</h1>

<p align="center">在很吵、不能出聲、或說不出話的時候，打字給對方看。</p>

---

打字後按 Enter，整個螢幕會變成**黑底黃字的楷體大字**，文字自動縮放到適合的大小，舉起手機就能讓對方看清楚。

純靜態網頁，不用安裝、不用帳號、不連任何伺服器（只會載入備用字型），資料只存在你自己的瀏覽器裡。

## 誰會用到

- 聽障或重聽的人
- 暫時不能說話：喉嚨手術後、聲帶發炎、牙科治療後
- 說話有困難：口吃、失語、選擇性緘默，在壓力大時用打字比較容易
- 在很吵的地方：演唱會、工地、工廠、機場、運動比賽
- 需要安靜的地方：圖書館、病房、會議中
- 隔著玻璃窗口、戴口罩，對方聽不清楚的時候

## 功能

| 功能 | 說明 |
|---|---|
| 全螢幕大字 | 黑底黃字、標楷體，依畫面大小自動縮放；長句會縮小塞進畫面 |
| 字級 | 全螢幕文字的上限：大／中／小，避免短句變成一個巨大的字 |
| 常用句 | 點一下直接全螢幕；「＋常用」把目前文字存起來 |
| 管理常用句 | 按「管理」後拖曳排序（鍵盤用 Alt + 方向鍵），點 × 刪除 |
| 復原 | 刪除常用句、清空最近說過後，5 秒內可以按「復原」 |
| 匯出／匯入 | 管理模式下把常用句存成 JSON 檔，換手機或清掉瀏覽器資料後再匯入 |
| 最近說過 | 記住最近 15 句，點一下再次全螢幕 |
| 翻轉 | 文字轉 180°，手機平放桌上時對面的人看是正的 |
| 螢幕常亮 | 全螢幕時不會自動關螢幕（需瀏覽器支援、HTTPS） |
| 草稿保存 | 輸入框的字會自動記住，重新整理或分頁被回收後還在 |
| 離線可用 | 開過一次後，沒有網路也能開（需 HTTPS，加到主畫面更穩）；備援字型只會快取用過的字，離線時沒用過的字可能改用系統字型 |

### 操作

- **Enter**：全螢幕　**Shift + Enter**：換行
- 全螢幕時 **點一下螢幕** 或按 **Esc** 返回，剛才的文字還在，可以接著改
- 注音、倉頡選字時按 Enter 只會選字，不會送出

## 使用方式

**線上版**：<https://ivantw829.github.io/kan-wo-shuo/>（手機直接開，並可「加入主畫面」）

**電腦**：直接用瀏覽器開啟 `index.html`。

**手機**：直接開線上版。自己架設的話，把網站檔案放到任何靜態網站空間即可；或在同一個 Wi-Fi 下從電腦開本機伺服器（螢幕常亮與離線需要 HTTPS，這種方式不會有）：

```bash
npm run serve
```

再用手機開 `http://<電腦的 IP>:4173`

開啟後用瀏覽器的「加入主畫面」，就會像 App 一樣有 icon。

## 字型

依序使用裝置上有的楷體：標楷體（BiauKai / DFKai-SB）→ 楷體-繁（Kaiti TC）→ 其他楷體。
手機通常沒有內建楷體，會改用 Google Fonts 的 **霞鶩文楷 TC**（LXGW WenKai TC）。

## 檔案

```
index.html              整個網頁（HTML + CSS + JS，沒有建置步驟）
manifest.webmanifest    加入主畫面時的 App 名稱、圖示、顏色
sw.js                   service worker，讓網頁離線也能開
icons/                  網頁圖示（icon.svg、PNG 192/512、maskable、apple-touch-icon）
icons/options/          其他 icon 設計備選 A–D（不會部署）
tools/make-icons.swift  產生 icon 的腳本（macOS）
tests/                  Playwright 測試與本機伺服器
.github/workflows/      測試通過後部署到 GitHub Pages
COMMIT_CONVENTION.md    commit 訊息規範
CLAUDE.md               給 Claude Code 的專案說明
```

## 開發

clone 之後執行一次，啟用 commit 範本與格式檢查：

```bash
git config commit.template .gitmessage && git config core.hooksPath .githooks
```

commit 訊息格式見 [COMMIT_CONVENTION.md](COMMIT_CONVENTION.md)，例如：

```
feat(phrases): 新增常用句拖曳排序
```

### 測試

網站本身不用套件；`package.json` 只給測試用。測試會在桌面 Chrome、Android Chrome、iPhone Safari（WebKit）三種環境跑：

```bash
npm install
npx playwright install chromium webkit
npm test
```

### 部署

push 到 `main` 後，GitHub Actions 會先跑測試，通過才部署到 GitHub Pages。只發佈 `index.html`、`manifest.webmanifest`、`sw.js`、`icons/*.svg`、`icons/*.png`，其他開發檔案不會公開。

### 重新產生 icon

需要 macOS 和系統內建的標楷體：

```bash
swift tools/make-icons.swift "$(find /System/Library/AssetsV2 -name BiauKai.ttf 2>/dev/null | head -1)" icons/options-new
```

maskable icon（Android 主畫面）從 `icon-512.png` 縮小再補黑邊：

```bash
sips -Z 410 icons/icon-512.png --out /tmp/m.png && sips -p 512 512 --padColor 000000 /tmp/m.png --out icons/icon-maskable-512.png
```

## 授權

[MIT License](LICENSE)
