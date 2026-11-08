<p align="center"><img src="icons/icon-512.png" width="120" alt="看我說 icon"></p>

<h1 align="center">看我說</h1>

<p align="center">在很吵、不能出聲、或說不出話的時候，打字給對方看。</p>

---

打字後按 Enter，整個螢幕會變成**黑底黃字的楷體大字**，文字自動放到最大，舉起手機就能讓對方看清楚。

只有一個 HTML 檔，不用安裝、不用帳號、不連任何伺服器（只會載入備用字型），資料只存在你自己的瀏覽器裡。

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
| 全螢幕大字 | 黑底黃字、標楷體，依畫面大小自動縮放到最大 |
| 常用句 | 點一下直接顯示；「＋常用」把目前文字存起來 |
| 拖曳排序 | 按「管理」後拖曳常用句調整順序，點 × 刪除 |
| 最近說過 | 記住最近 15 句，點一下再次顯示 |
| 翻轉 | 文字轉 180°，手機平放桌上時對面的人看是正的 |
| 螢幕常亮 | 顯示時不會自動關螢幕（需瀏覽器支援、HTTPS） |

### 操作

- **Enter**：顯示　**Shift + Enter**：換行
- 顯示時 **點一下螢幕** 或按 **Esc** 返回，剛才的文字還在，可以接著改
- 注音、倉頡選字時按 Enter 只會選字，不會送出

## 使用方式

**電腦**：直接用瀏覽器開啟 `index.html`。

**手機**：要放到網路上才能用手機開，例如：

- 放到 GitHub Pages、Netlify、Cloudflare Pages 等靜態網站空間
- 或在同一個 Wi-Fi 下，從電腦開一個本機伺服器（螢幕常亮功能需要 HTTPS，這種方式不會有）：

  ```bash
  python3 -m http.server 8000
  ```

  再用手機開 `http://<電腦的 IP>:8000`

開啟後用瀏覽器的「加入主畫面」，就會像 App 一樣有 icon。

## 字型

依序使用裝置上有的楷體：標楷體（BiauKai / DFKai-SB）→ 楷體-繁（Kaiti TC）→ 其他楷體。
手機通常沒有內建楷體，會改用 Google Fonts 的 **霞鶩文楷 TC**（LXGW WenKai TC）。

## 檔案

```
index.html              整個網頁（HTML + CSS + JS）
icons/                  網頁圖示（icon.svg、PNG 192/512、apple-touch-icon）
icons/options/          其他 icon 設計備選 A–D
tools/make-icons.swift  產生 icon 的腳本（macOS）
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

### 重新產生 icon

需要 macOS 和系統內建的標楷體：

```bash
swift tools/make-icons.swift "$(find /System/Library/AssetsV2 -name BiauKai.ttf 2>/dev/null | head -1)" icons/options-new
```
