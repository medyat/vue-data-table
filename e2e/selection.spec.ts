// Faz 4 kabul kriterleri (gerçek tarayıcı, T1): seçim (checkbox, ⇧ aralık, header, X / ⇧↓ / ⌘A / Esc), bulk bar ve ⋯ menüsü,
// D19 (sayfa değişince temizlenir, refresh'te kalır), satır menüsü (⋯, sağ tık, Copy toast), expand (chevron, → ←, sorgu
// değişince kapanır, sanal yükseklik), row-click modları, toolbar seçim çubuğu.
import { expect, test, type Page } from '@playwright/test'

const settings = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem('pg:settings', JSON.stringify({ theme: 'light', density: 'standard', locale: 'en' })),
  )
const row = (page: Page, i: number) => page.locator(`.dt-row[data-index="${i}"]`)
const box = (page: Page, i: number) => row(page, i).locator('.dt-cell-select input')
const bulk = (page: Page) => page.locator('.dt-bulk')
const plainCell = (page: Page, i: number) => row(page, i).locator('[data-col="customer"]')

test.describe('T1 · seçim ve bulk bar', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.goto('/t1')
    await expect(row(page, 0)).toBeVisible()
  })

  test('checkbox, ⇧ aralık, header (kısmi → tümü → temiz), bulk bar sayaç, ⋯ menüsü yıkıcı en altta, × temizler', async ({
    page,
  }) => {
    await box(page, 0).click()
    await expect(row(page, 0)).toHaveClass(/is-selected/)
    await expect(bulk(page)).toContainText('1 selected')
    await box(page, 3).click({ modifiers: ['Shift'] })
    await expect(bulk(page)).toContainText('4 selected')
    const head = page.locator('.dt-head-select input')
    expect(await head.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true)
    await head.click()
    await expect(bulk(page)).toContainText('100 selected')
    expect(await head.evaluate((el: HTMLInputElement) => el.checked)).toBe(true)
    await bulk(page).getByRole('button', { name: 'More bulk actions' }).click()
    const items = page.getByRole('menuitem')
    await expect(items.last()).toContainText('Cancel orders…')
    await expect(items.last()).toHaveClass(/is-destructive/)
    await page.keyboard.press('Escape')
    await head.click()
    await expect(bulk(page)).toHaveCount(0)
    await expect(row(page, 0)).not.toHaveClass(/is-selected/)
  })

  test('satır gövdesine tık seçmez; X / ⇧↓ satır kısayolu yok (D38); Esc temizler', async ({ page }) => {
    await plainCell(page, 0).click()
    await expect(bulk(page)).toHaveCount(0)
    await page.keyboard.press('x')
    await page.keyboard.press('Shift+ArrowDown')
    await expect(bulk(page)).toHaveCount(0)
    await row(page, 0).locator('.dt-select-box').click()
    await expect(bulk(page)).toContainText('1 selected')
    await page.keyboard.press('Escape')
    await expect(bulk(page)).toHaveCount(0)
  })

  test('bulk aksiyon seçili satırlarla çağrılır; refresh seçimi korur, sayfa değişimi temizler (D19)', async ({
    page,
  }) => {
    const logs: string[] = []
    page.on('console', (m) => logs.push(m.text()))
    await box(page, 0).click()
    await box(page, 1).click()
    await bulk(page).getByRole('button', { name: 'Release' }).click()
    expect(logs).toContainEqual(expect.stringMatching(/^bulk release 2\b/)) // T1 'failed N' sayacını da yazar (D35)
    await page.keyboard.press('r')
    await expect(page.locator('.dt-footer-left')).toContainText('Updated just now')
    await expect(bulk(page)).toContainText('2 selected')
    await page.locator('.dt-footer-next').click()
    await expect(page.locator('.dt-footer-left')).toContainText('Rows 101–200')
    await expect(bulk(page)).toHaveCount(0)
  })

  test('satır menüsü: ⋯ → Open ↵ / Open in new tab / Copy; pasif aksiyon gerekçeli; sağ tık açar; Copy toast', async ({
    page,
  }) => {
    await row(page, 0).hover()
    await row(page, 0).locator('.dt-row-more').click()
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: /^Open/ }).first()).toHaveAttribute('href', /\/orders\/\d+/)
    await expect(menu.getByRole('menuitem', { name: 'Open in new tab' })).toHaveAttribute('target', '_blank')
    await expect(menu.getByRole('menuitem', { name: /Cancel order…/ })).toHaveClass(/is-destructive/)
    await menu.getByRole('menuitem', { name: /Copy Order no\./ }).click()
    await expect(page.locator('.dt-toast')).toContainText('Copied')
    // Sağ tık: düz hücrede satır menüsü; linkte tarayıcının menüsü (menü açılmaz).
    const running = page
      .locator('.dt-row', { has: page.locator('[data-col="status"]', { hasText: 'In progress' }) })
      .first()
    await running.locator('[data-col="customer"]').click({ button: 'right' })
    const item = page.getByRole('menuitem', { name: /Release/ })
    await expect(item).toContainText('Already running')
    await expect(item).toHaveAttribute('data-disabled', '')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
  })

  test('expand: chevron alt satırı açar, altındaki satır kayar; tekrar tık kapatır; arama değişince kapanır', async ({
    page,
  }) => {
    const top1 = (await row(page, 1).boundingBox())!.y
    await row(page, 0).locator('.dt-expand').click()
    await expect(row(page, 0).locator('.dt-expand')).toHaveAttribute('aria-expanded', 'true')
    const sub = page.locator('.dt-subrow').first()
    await expect(sub).toBeVisible()
    await expect(sub.locator('table th').first()).toHaveText('Op')
    const subH = (await sub.boundingBox())!.height
    expect((await row(page, 1).boundingBox())!.y).toBeGreaterThanOrEqual(top1 + subH - 1)
    await row(page, 0).locator('.dt-expand').click()
    await expect(page.locator('.dt-subrow')).toHaveCount(0)
    expect((await row(page, 1).boundingBox())!.y).toBe(top1)
    await row(page, 0).locator('.dt-expand').click()
    await expect(page.locator('.dt-subrow')).toHaveCount(1)
    await page.locator('.dt-search input').fill('vinç')
    await expect(page.locator('.dt-row [data-col="customer"]').first()).toContainText('Vinç')
    await expect(page.locator('.dt-subrow')).toHaveCount(0)
  })

  test('row-click: open → row-open (preventDefault ile navigasyon yok); expand → alt satır; none → hiçbir şey', async ({
    page,
  }) => {
    const logs: string[] = []
    page.on('console', (m) => logs.push(m.text()))
    await plainCell(page, 1).click()
    await expect(page.locator('.dt-subrow')).toHaveCount(0)
    expect(logs.filter((l) => l.startsWith('open '))).toHaveLength(0)
    await page.locator('.pg-title select').first().selectOption('open')
    await plainCell(page, 1).click()
    expect(logs.find((l) => /^open \/orders\/\d+/.test(l))).toBeTruthy()
    expect(page.url()).toContain('/t1')
    await page.locator('.pg-title select').first().selectOption('expand')
    await plainCell(page, 2).click()
    await expect(row(page, 2).locator('.dt-expand')).toHaveAttribute('aria-expanded', 'true')
  })

  test("selection-bar=toolbar: seçim varken toolbar'ın yerini alır", async ({ page }) => {
    await page.goto('/t1?bar=toolbar')
    await expect(row(page, 0)).toBeVisible()
    await box(page, 0).click()
    await expect(page.locator('.dt-bulk.is-toolbar')).toContainText('1 selected')
    await expect(page.locator('.dt-toolbar')).toHaveCount(0)
    await page.locator('.dt-bulk.is-toolbar').getByRole('button', { name: 'Clear selection' }).click()
    await expect(page.locator('.dt-toolbar')).toBeVisible()
  })
})
