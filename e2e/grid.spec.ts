// Faz 1 kabul kriterleri (gerçek tarayıcı): guard ve klavye senaryoları, sabit sütun gölgesi, sanal DOM, resize, yoğunluk.
import { expect, test, type Page } from '@playwright/test'

const settings = (page: Page, density = 'standard', theme = 'light') =>
  page.addInitScript(
    ([d, t]) => localStorage.setItem('pg:settings', JSON.stringify({ theme: t, density: d, locale: 'en' })),
    [density, theme],
  )

test.describe('T1 · liste ızgarası', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.goto('/t1?size=500')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  })

  test("sanal satırlar: görünür + overscan DOM'da, kaydırınca pencere kayar", async ({ page }) => {
    const rendered = await page.locator('.dt-row').count()
    expect(rendered).toBeGreaterThan(20)
    expect(rendered).toBeLessThan(60) // 500 satırın hepsi değil
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollTop = 20_000))
    // 0. satır roving odak taşıdığı için DOM'da kalır (08 §2); 1. satır kaybolur.
    await expect(page.locator('.dt-row[data-index="1"]')).toHaveCount(0)
    await expect(page.locator('.dt-row[data-index="490"]')).toHaveCount(1)
  })

  test("odaklı satır kaydırmada DOM'da kalır", async ({ page }) => {
    const row0 = page.locator('.dt-row[data-index="0"]')
    await row0.focus()
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollTop = 20_000))
    await expect(row0).toHaveCount(1)
    await expect(row0).toBeFocused()
  })

  test('guard: hücre düğmesine tık satır tıklamasını tetiklemez', async ({ page }) => {
    await page.evaluate(() => {
      ;(window as unknown as { clicks: number }).clicks = 0
      document
        .querySelector('.dt-grid')!
        .addEventListener('click', () => ((window as unknown as { clicks: number }).clicks += 1))
    })
    const row = page.locator('.dt-row[data-index="1"]')
    await row.hover()
    const copy = row.locator('.dt-cell-action[aria-label="Copy name"]')
    await expect(copy).toBeVisible()
    await copy.click()
    // Tık düğmede kaldı: satır odağı çerçeve çizmez (fare), seçim/açma yok.
    await expect(row).not.toHaveClass(/is-focus/)
    await expect(page.locator('.dt-cell-action[aria-label="Copy name"]').first()).toHaveAttribute('tabindex', '-1')
  })

  test("klavye: Tab tek durak, oklar satır, → widget, Esc satır; input içinde oklar input'ta", async ({ page }) => {
    await page.keyboard.press('Tab') // tarayıcı adres çubuğundan ilk Tab durağına
    const first = page.locator('.dt-row[data-index="0"]')
    for (let i = 0; i < 40 && !(await first.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab')
    await expect(first).toBeFocused()
    await expect(first).toHaveClass(/is-focus/)
    await page.keyboard.press('ArrowDown')
    const second = page.locator('.dt-row[data-index="1"]')
    await expect(second).toBeFocused()
    // T1'de expand açık: kapalı satırda ilk → detayı açar, ikincisi ilk widget'a (birincil link) geçer (08 §2).
    await page.keyboard.press('ArrowRight')
    await expect(second.locator('.dt-expand')).toHaveAttribute('aria-expanded', 'true')
    await expect(second).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(second.locator('a.dt-link').first()).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(second.locator('.dt-cell-action').first()).toBeFocused()
    await expect(second.locator('.dt-cell-actions').first()).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(second.locator('a.dt-link').first()).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(second).toBeFocused()
    await page.keyboard.press('End')
    await expect(page.locator('.dt-row[data-index="499"]')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(first).toBeFocused()
    // Tab ızgaradan çıkar: widget'lar Tab durağı değil.
    await page.keyboard.press('Tab')
    await expect(page.locator('.dt-row:focus, .dt-row a:focus, .dt-row button:focus')).toHaveCount(0)
  })

  test('sabit sütun gölgesi yalnızca o yöne kaydırılmışken', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 })
    const grid = page.locator('.dt-grid')
    await expect(grid).not.toHaveClass(/is-scrolled-start/)
    await expect(grid).toHaveClass(/is-scrolled-end/)
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollLeft = 200))
    await expect(grid).toHaveClass(/is-scrolled-start/)
    const edge = page.locator('.dt-row[data-index="0"] .dt-cell.is-pinned-start.is-pin-edge')
    await expect(edge).toHaveCSS('position', 'sticky')
    expect(await edge.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none')
  })

  test('resize: tutamaç sürüklenince genişlik px olur, rozet görünür; satırlar yeniden çizilmez', async ({ page }) => {
    const handle = page.locator('.dt-head-cell[data-col="customer"] .dt-resize')
    const box = (await handle.boundingBox())!
    const before = await page
      .locator('.dt-head-cell[data-col="customer"]')
      .evaluate((el) => el.getBoundingClientRect().width)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 4 })
    await expect(page.locator('.dt-resize-badge')).toBeVisible()
    await page.mouse.up()
    const after = await page
      .locator('.dt-head-cell[data-col="customer"]')
      .evaluate((el) => el.getBoundingClientRect().width)
    expect(after).toBeGreaterThan(before + 40)
    const cols = await page.locator('.dt-grid').evaluate((el) => el.style.getPropertyValue('--cols'))
    expect(cols).toMatch(/\d+px/)
  })
})

test('çift tık: içeriğe sığdır, tekrar edince sabit kalır', async ({ page }) => {
  await settings(page)
  await page.goto('/t1?size=500')
  await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  const width = () =>
    page.locator('.dt-head-cell[data-col="customer"]').evaluate((el) => el.getBoundingClientRect().width)
  const handle = page.locator('.dt-head-cell[data-col="customer"] .dt-resize')
  // Önce daralt (içerik kesilsin), sonra TEK çift tıkla sığdır.
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x - 120, box.y + box.height / 2, { steps: 4 })
  await page.mouse.up()
  const narrowed = await width()
  const truncated = await page
    .locator('.dt-row [data-col="customer"] .dt-cell-content')
    .evaluateAll((els) => els.some((e) => e.scrollWidth > e.clientWidth))
  expect(truncated).toBe(true)
  await handle.dblclick()
  const fitted = await width()
  expect(fitted).toBeGreaterThan(narrowed)
  const longest = await page.locator('.dt-row [data-col="customer"] .dt-cell-content').evaluateAll((els) =>
    Math.max(
      ...els.map((e) => {
        const el = e as HTMLElement
        el.style.width = 'max-content'
        el.style.maxWidth = 'none'
        const w = el.getBoundingClientRect().width
        el.style.width = ''
        el.style.maxWidth = ''
        return w
      }),
    ),
  )
  expect(fitted).toBeGreaterThan(longest)
  expect(fitted).toBeLessThan(longest + 80)
  await handle.dblclick()
  await handle.dblclick()
  expect(Math.round(await width())).toBe(Math.round(fitted))
})

test("yoğunluk: Comfortable'da ikinci satır, Compact'ta 32 px satır", async ({ page }) => {
  await settings(page)
  // Faz 2: T1 yoğunluğu tercihten alır (Display › Density); tercih deposu playground scope'lu localStorage.
  await page.addInitScript(() =>
    localStorage.setItem('dt:playground:prefs:production-orders', JSON.stringify({ density: 'comfortable' })),
  )
  await page.goto('/t1?size=500')
  await expect(page.locator('.dt-row[data-index="0"] .dt-secondary')).toBeVisible()
  const h52 = await page.locator('.dt-row[data-index="0"]').evaluate((el) => el.getBoundingClientRect().height)
  expect(Math.round(h52)).toBe(53)
  await page.getByRole('button', { name: 'Display' }).click()
  await page.getByRole('button', { name: 'Compact' }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.dt-row[data-index="0"] .dt-secondary')).toHaveCount(0)
  await expect
    .poll(async () =>
      Math.round(await page.locator('.dt-row[data-index="0"]').evaluate((el) => el.getBoundingClientRect().height)),
    )
    .toBe(33)
})

test('T8: uzun header kesikken tek çift tık sığdırır (header ölçümü)', async ({ page }) => {
  await settings(page)
  await page.goto('/t8')
  await expect(page.locator('.dt-row').first()).toBeVisible()
  const head = page.locator('.dt-head-cell[data-col="boolD"]').first()
  const text = head.locator('.dt-head-text')
  expect(await text.evaluate((e) => e.scrollWidth > e.clientWidth + 1)).toBe(true) // "boolean · destructive" kesik
  await head.locator('.dt-resize').dblclick()
  expect(await text.evaluate((e) => e.scrollWidth > e.clientWidth + 1)).toBe(false)
  const w1 = await head.evaluate((el) => el.getBoundingClientRect().width)
  await head.locator('.dt-resize').dblclick()
  expect(Math.round(await head.evaluate((el) => el.getBoundingClientRect().width))).toBe(Math.round(w1))
})

test('T8: 23 tip light ve dark görsel referansı', async ({ page }) => {
  for (const theme of ['light', 'dark-class']) {
    await settings(page, 'standard', theme)
    await page.clock.setFixedTime(new Date('2026-10-21T10:00:00')) // "3d late" gibi göreli tarihler sabit
    await page.goto('/t8')
    await expect(page.locator('.dt-row').first()).toBeVisible()
    // Sayfa kendi içinde kayar (pg-scroll): tüm tabloların görünmesi için viewport içerik yüksekliğine açılır.
    const h = await page.locator('.pg-page').evaluate((el) => el.scrollHeight)
    await page.setViewportSize({ width: 1280, height: h + 80 })
    await expect(page).toHaveScreenshot(`t8-${theme}.png`, { fullPage: true, maxDiffPixelRatio: 0.01 })
  }
})
