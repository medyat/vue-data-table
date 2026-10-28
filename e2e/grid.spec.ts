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
    expect(rendered).toBeGreaterThan(15)
    expect(rendered).toBeLessThan(60) // 500 satırın hepsi değil
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollTop = el.scrollHeight)) // en alt
    await expect(page.locator('.dt-row[data-index="1"]')).toHaveCount(0)
    await expect(page.locator('.dt-row[data-index="490"]')).toHaveCount(1)
  })

  test("odak içindeki satır kaydırmada DOM'da kalır", async ({ page }) => {
    const link = page.locator('.dt-row[data-index="0"] a.dt-link').first()
    await link.focus()
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollTop = 20_000))
    await expect(link).toHaveCount(1)
    await expect(link).toBeFocused()
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
    // Hücre aksiyonları doğal Tab durağı (D38).
    await expect(page.locator('.dt-cell-action[aria-label="Copy name"]').first()).not.toHaveAttribute('tabindex', /.*/)
  })

  test("klavye (D38): satır Tab durağı değil; Tab satırın widget'larında doğal sırada; oklar satır gezmez", async ({
    page,
  }) => {
    const first = page.locator('.dt-row[data-index="0"]')
    await expect(first).not.toHaveAttribute('tabindex', /.*/)
    const link = first.locator('a.dt-link').first()
    await link.focus()
    await page.keyboard.press('ArrowDown')
    await expect(link).toBeFocused()
    await page.keyboard.press('Tab')
    const next = await page.evaluate(() => document.activeElement?.closest('.dt-row')?.getAttribute('data-index'))
    expect(next).toBe('0') // aynı satırın sonraki widget'ı (hücre aksiyonu / ⋯)
    await expect(page.locator('.dt-row.is-focus')).toHaveCount(0)
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

  test('resize: sürükleme min 80 px altına inmez; rozet de 80 gösterir, bırakınca sıçrama yok', async ({ page }) => {
    const head = page.locator('.dt-head-cell[data-col="customer"]')
    const handle = head.locator('.dt-resize')
    const box = (await handle.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x - 300, box.y + box.height / 2, { steps: 6 })
    expect(Math.round(await head.evaluate((el) => el.getBoundingClientRect().width))).toBe(80)
    await expect(page.locator('.dt-resize-badge')).toHaveText('80 px')
    await page.mouse.up()
    expect(Math.round(await head.evaluate((el) => el.getBoundingClientRect().width))).toBe(80)
  })
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
  expect(Math.round(h52)).toBe(57) // 56 + kenarlık (D41)
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

test('içeriğe sığdır yok (D42): çift tık genişliği değiştirmez, sütun menüsünde Fit to content yok', async ({
  page,
}) => {
  await settings(page)
  await page.goto('/t1?size=500')
  const head = page.locator('.dt-head-cell[data-col="customer"]')
  await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  const before = await head.evaluate((el) => el.getBoundingClientRect().width)
  await head.locator('.dt-resize').dblclick()
  expect(await head.evaluate((el) => el.getBoundingClientRect().width)).toBe(before)
  await head.hover()
  await head.locator('.dt-head-menu').click()
  await expect(page.getByRole('menuitem', { name: 'Move left' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Fit to content' })).toHaveCount(0)
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
