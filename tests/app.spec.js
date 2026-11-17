// @ts-check
const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');

const DEFAULT_PHRASES = ['請再說一次', '我聽不到', '請等一下', '好', '不用了，謝謝', '謝謝', '請用打字', '在哪裡？', '多少錢？'];

// 備用字型走外部網路，測試時擋掉，避免不穩定
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});

/** 開頁面；storage 會先寫進 localStorage 再重新整理 */
async function open(page, storage) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto('./');
  if (storage) {
    await page.evaluate((s) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }, storage);
    await page.reload();
  }
  return errors;
}

const chipTexts = (page, id) => page.locator(`#${id} .chip .t`).allTextContents();

/** 用 JS 送出文字（不受 400ms 防誤觸影響），再按 Esc 返回 */
async function sayAndBack(page, texts) {
  await page.evaluate((list) => {
    for (const t of list) {
      document.getElementById('input').value = t;
      document.getElementById('showBtn').click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
  }, texts);
}

test.describe('全螢幕', () => {
  test('Enter 全螢幕，Shift+Enter 換行', async ({ page }) => {
    await open(page);
    await page.fill('#input', '第一行');
    await page.press('#input', 'Shift+Enter');
    await expect(page.locator('#input')).toHaveValue('第一行\n');
    await expect(page.locator('#display')).not.toHaveClass(/show/);

    await page.fill('#input', '  你好  ');
    await page.press('#input', 'Enter');
    await expect(page.locator('#display')).toHaveClass(/show/);
    await expect(page.locator('#text')).toHaveText('你好');
  });

  test('輸入法選字時的 Enter 不會送出', async ({ page }) => {
    await open(page);
    await page.fill('#input', '你好');
    const shown = await page.evaluate(() => {
      const input = document.getElementById('input');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true }));
      return document.getElementById('display').classList.contains('show');
    });
    expect(shown).toBe(false);
  });

  test('剛進入時點擊被忽略，之後點一下返回；Esc 立刻返回', async ({ page }) => {
    await open(page);
    const stillShown = await page.evaluate(() => {
      document.getElementById('input').value = '等一下';
      document.getElementById('showBtn').click();
      document.getElementById('display').click();
      return document.getElementById('display').classList.contains('show');
    });
    expect(stillShown).toBe(true);
    await page.waitForTimeout(450);
    await page.locator('#display').click();
    await expect(page.locator('#display')).not.toHaveClass(/show/);
    await expect(page.locator('#input')).toHaveValue('等一下');

    await page.locator('#showBtn').click();
    await expect(page.locator('#display')).toHaveClass(/show/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#display')).not.toHaveClass(/show/);
  });

  test('全螢幕時輸入畫面是 inert', async ({ page }) => {
    await open(page);
    await page.fill('#input', '好');
    await page.locator('#showBtn').click();
    expect(await page.evaluate(() => document.getElementById('editor').inert)).toBe(true);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.getElementById('editor').inert)).toBe(false);
  });

  for (const [name, content] of [['短句', '好'], ['長句', '請問這附近有沒有可以休息的地方，我現在身體不太舒服，需要坐下來一下。'.repeat(4)]]) {
    test(`字級不超過上限，而且不會溢出：${name}`, async ({ page }) => {
      await open(page);
      await page.fill('#input', content);
      await page.locator('#showBtn').click();
      await expect(page.locator('#display')).toHaveClass(/show/);
      await page.waitForTimeout(100);
      const m = await page.evaluate(() => {
        const d = document.getElementById('display'), t = document.getElementById('text');
        const r = t.getBoundingClientRect();
        return {
          font: parseFloat(t.style.fontSize), short: Math.min(d.clientWidth, d.clientHeight),
          fitsW: t.scrollWidth <= t.clientWidth + 1, top: r.top, bottom: r.bottom, h: d.clientHeight,
          overflow: d.classList.contains('overflow'),
        };
      });
      expect(m.font).toBeLessThanOrEqual(m.short * 0.24 + 1);
      expect(m.fitsW).toBe(true);
      expect(m.top).toBeGreaterThanOrEqual(0);
      expect(m.bottom).toBeLessThanOrEqual(m.h);
      expect(m.overflow).toBe(false);
    });
  }

  test('字級「大」的短句比「中」大', async ({ page }) => {
    await open(page);
    const sizeOf = async () => {
      await page.fill('#input', '好');
      await page.locator('#showBtn').click();
      await expect(page.locator('#display')).toHaveClass(/show/);
      const px = await page.evaluate(() => parseFloat(document.getElementById('text').style.fontSize));
      await page.keyboard.press('Escape');
      return px;
    };
    const mid = await sizeOf();
    await page.locator('#sizeBtn').click();
    await expect(page.locator('#sizeBtn')).toHaveText('字級：大');
    expect(await sizeOf()).toBeGreaterThan(mid);
  });
});

test.describe('保存', () => {
  test('字級、翻轉、草稿重新整理後還在', async ({ page }) => {
    await open(page);
    await page.locator('#sizeBtn').click();
    await page.locator('#flipBtn').click();
    await expect(page.locator('#flipBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.fill('#input', '還沒說完的草稿');
    await page.waitForTimeout(400);
    await page.reload();
    await expect(page.locator('#sizeBtn')).toHaveText('字級：大');
    await expect(page.locator('#flipBtn')).toHaveText('翻轉：開');
    await expect(page.locator('#flipBtn')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#input')).toHaveValue('還沒說完的草稿');
  });

  test('localStorage 資料壞掉時照常運作', async ({ page }) => {
    const errors = await open(page, {
      phrases: '{"a":1}', history: '"不是陣列"', flipped: '"yes"', size: '"巨"', draft: '{bad json',
    });
    expect(errors).toEqual([]);
    expect(await chipTexts(page, 'phrases')).toEqual(DEFAULT_PHRASES);
    await expect(page.locator('#history .empty')).toBeVisible();
    await expect(page.locator('#sizeBtn')).toHaveText('字級：中');
    await expect(page.locator('#flipBtn')).toHaveText('翻轉');

    await open(page, { phrases: [1, '好', null, '好', '  ', '謝謝'] });
    expect(await chipTexts(page, 'phrases')).toEqual(['好', '謝謝']);
  });
});

test.describe('常用句', () => {
  test('新增到最前面', async ({ page }) => {
    await open(page);
    await page.fill('#input', '請幫我叫計程車');
    await page.locator('#saveBtn').click();
    await expect(page.locator('#saveBtn')).toHaveText('已加入 ✓');
    expect((await chipTexts(page, 'phrases'))[0]).toBe('請幫我叫計程車');
  });

  test('刪除後可以復原到原位', async ({ page }) => {
    await open(page);
    await page.locator('#manageBtn').click();
    await page.locator('#phrases .chip').nth(2).locator('.x').click();
    expect(await chipTexts(page, 'phrases')).not.toContain('請等一下');
    await expect(page.locator('#toast')).toContainText('已刪除「請等一下」');
    // 提示文字不能被截斷（曾因 left:50% 讓提示列只有半個畫面寬）
    expect(await page.evaluate(() => {
      const m = document.getElementById('toastMsg');
      return m.scrollWidth <= m.clientWidth;
    })).toBe(true);
    await page.locator('#toastUndo').click();
    expect(await chipTexts(page, 'phrases')).toEqual(DEFAULT_PHRASES);
    await expect(page.locator('#toast')).not.toBeVisible();
  });

  test('長句的 × 看得到也點得到', async ({ page }) => {
    const long = '不好意思，我是聽障人士，麻煩您用寫的或打字的方式告訴我，謝謝您的耐心與幫忙。';
    await open(page, { phrases: [long, '好'] });
    await page.locator('#manageBtn').click();
    const chip = page.locator('#phrases .chip').first();
    const x = chip.locator('.x');
    await expect(x).toBeVisible();
    const cb = await chip.boundingBox(), xb = await x.boundingBox();
    expect(xb && cb && xb.x + xb.width <= cb.x + cb.width).toBe(true);
    await x.click();
    expect(await chipTexts(page, 'phrases')).toEqual(['好']);
  });

  test('鍵盤：Alt+→ 排序、Delete 刪除', async ({ page }) => {
    await open(page, { phrases: ['一', '二', '三'] });
    await page.locator('#manageBtn').click();
    await page.locator('#phrases .chip').first().focus();
    await page.keyboard.press('Alt+ArrowRight');
    expect(await chipTexts(page, 'phrases')).toEqual(['二', '一', '三']);
    // 焦點跟著移動的那一句
    expect(await page.evaluate(() => document.activeElement.textContent)).toContain('一');
    await page.keyboard.press('Alt+ArrowRight');
    expect(await chipTexts(page, 'phrases')).toEqual(['二', '三', '一']);
    await page.keyboard.press('Delete');
    expect(await chipTexts(page, 'phrases')).toEqual(['二', '三']);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('phrases')))).toEqual(['二', '三']);
  });

  test('匯出成 JSON', async ({ page }) => {
    await open(page, { phrases: ['一', '二'] });
    await page.locator('#manageBtn').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#exportBtn').click()]);
    expect(download.suggestedFilename()).toBe('看我說-常用句.json');
    const data = JSON.parse(await readFile(await download.path(), 'utf8'));
    expect(data).toEqual({ app: 'kan-wo-shuo', version: 1, phrases: ['一', '二'] });
  });

  test('匯入會合併去重，壞檔案顯示錯誤', async ({ page }) => {
    await open(page, { phrases: ['一', '二'] });
    await page.locator('#manageBtn').click();
    const file = (name, content) => ({ name, mimeType: 'application/json', buffer: Buffer.from(content) });

    await page.setInputFiles('#importFile', file('a.json', JSON.stringify({ phrases: ['二', ' 三 ', 3, '四'] })));
    await expect(page.locator('#toast')).toContainText('已匯入 2 句');
    expect(await chipTexts(page, 'phrases')).toEqual(['一', '二', '三', '四']);

    await page.setInputFiles('#importFile', file('b.json', JSON.stringify(['四', '五'])));
    await expect(page.locator('#toast')).toContainText('已匯入 1 句');
    expect(await chipTexts(page, 'phrases')).toEqual(['一', '二', '三', '四', '五']);

    await page.setInputFiles('#importFile', file('c.json', '這不是 JSON'));
    await expect(page.locator('#toast')).toContainText('檔案格式不對');
    expect(await chipTexts(page, 'phrases')).toHaveLength(5);
  });
});

test.describe('最近說過', () => {
  test('最多 15 句，最新的在前面', async ({ page }) => {
    await open(page);
    await sayAndBack(page, Array.from({ length: 17 }, (_, i) => `第${i}句`));
    const list = await chipTexts(page, 'history');
    expect(list).toHaveLength(15);
    expect(list[0]).toBe('第16句');
  });

  test('清空後可以復原', async ({ page }) => {
    await open(page);
    await sayAndBack(page, ['甲', '乙']);
    await page.locator('#clearHistBtn').click();
    await expect(page.locator('#history .empty')).toBeVisible();
    await page.locator('#toastUndo').click();
    expect(await chipTexts(page, 'history')).toEqual(['乙', '甲']);
  });
});

test.describe('離線', () => {
  test.use({ serviceWorkers: 'allow' });

  test('開過一次後離線也能開', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', '只在 Chromium 測 service worker 離線');
    await open(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
      }
    });
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#showBtn')).toBeVisible();
    await page.goto('./?from=homescreen');
    await expect(page.locator('#showBtn')).toBeVisible();
  });
});
