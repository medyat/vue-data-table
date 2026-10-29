// Faz 7c kabul kriterleri (gerçek tarayıcı, T13 · Phone, 390 × 844, dokunmatik): düzen (birincil sola sabit, 48 px satır ve seçim,
// sağ solma, 44 px hedefler), arama modu, Filters alt sayfası (taslak + Show results, çip tek düğme), Sort, görünüm ve ⋯ alt
// sayfaları, bulk bar telefon düzeni + More sayfası, footer; axe taraması (alt sayfa açıkken de).
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

const settings = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem('pg:settings', JSON.stringify({ theme: 'light', density: 'standard', locale: 'en' })),
  )
const sheet = (page: Page) => page.locator('.dt-bsheet')
const sheetRow = (page: Page, text: string | RegExp) =>
  sheet(page).locator('.dt-bsheet-row, .dt-bsheet-row-main').filter({ hasText: text }).first()
const footerRows = (page: Page) => page.locator('.dt-footer-rows')
const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!

test.describe('T13 · telefon', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.goto('/t13')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  })

  test('düzen: is-phone, birincil sola sabit, 48 px satır ve seçim, 44 px hedefler, kaydırınca gölge + solma, footer nav', async ({
    page,
  }) => {
    await expect(page.locator('.dt-list')).toHaveClass(/is-phone/)
    await expect(page.locator('.dt-head-cell[data-col="number"]')).toHaveClass(/is-pinned-start/)
    await expect(page.locator('.dt-head-cell.is-pinned-end:not(.dt-head-menu-col)')).toHaveCount(0)
    expect((await box(page.locator('.dt-row[data-index="0"]'))).height).toBe(49)
    expect((await box(page.locator('.dt-row[data-index="0"] .dt-cell-select'))).width).toBe(48)
    expect((await box(page.locator('.dt-filter-trigger'))).width).toBe(44)
    expect((await box(page.locator('.dt-more-trigger'))).height).toBe(44)
    const prev = page.locator('.dt-footer-prev')
    expect((await box(prev)).width).toBe(44)
    await expect(prev).toHaveAttribute('aria-label', 'Previous')
    await expect(page.locator('.dt-footer')).toHaveAttribute('role', 'navigation')
    await expect(page.locator('.dt-footer-size')).toHaveCount(0)
    // Sağ kenar solması (daha fazlası var) ve kaydırınca sabit kenar gölgesi.
    await expect(page.locator('.dt-grid')).toHaveClass(/is-scrolled-end/)
    await expect(page.locator('.dt-grid')).not.toHaveClass(/is-scrolled-start/)
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollLeft = 200))
    await expect(page.locator('.dt-grid')).toHaveClass(/is-scrolled-start/)
    await expect(page.locator('.dt-row[data-index="0"] .dt-cell.is-primary')).toHaveClass(/is-pin-edge/)
  })

  test('arama: ikon toolbar yerine input + Cancel açar; sonuç süzülür; Cancel temizleyip kapatır', async ({ page }) => {
    await page.locator('.dt-search-open').click()
    await expect(page.locator('.dt-view-trigger')).toHaveCount(0)
    const input = page.locator('.dt-search input')
    await expect(input).toBeFocused()
    await input.fill('HC-80')
    await expect(footerRows(page)).not.toContainText('1–100')
    await page.locator('.dt-search-cancel').click()
    await expect(page.locator('.dt-view-trigger')).toBeVisible()
    await expect(footerRows(page)).toContainText('1–100')
  })

  test('Filters alt sayfası: Suggested → editör → Done → Show results tek adımda; çip tek düğme; çipten editör; Clear all', async ({
    page,
  }) => {
    await page.locator('.dt-filter-trigger').click()
    await expect(sheet(page)).toBeVisible()
    await expect(sheet(page).locator('.dt-bsheet-title')).toHaveText('Filters')
    await sheetRow(page, 'Status').click()
    await expect(sheet(page).locator('.dt-bsheet-title')).toHaveText('Status')
    await sheet(page).locator('.dt-option').filter({ hasText: 'On hold' }).click()
    await expect(page.locator('.dt-chip')).toHaveCount(0) // henüz uygulanmadı (taslak)
    await sheet(page).locator('.dt-bsheet-primary').click() // Done
    await expect(sheetRow(page, 'Status')).toContainText('On hold')
    await sheet(page).locator('.dt-bsheet-primary').click() // Show results
    await expect(sheet(page)).toHaveCount(0)
    const chip = page.locator('.dt-chip')
    await expect(chip).toHaveCount(1)
    await expect(chip).toContainText('On hold')
    await expect(chip).toHaveClass(/is-phone/)
    await expect(chip.locator('.dt-chip-remove')).toHaveCount(0)
    await expect(chip.locator('.dt-chip-body')).toHaveAttribute('aria-label', /Open filters$/)
    await expect(page.locator('.dt-filter-trigger .dt-counter')).toHaveText('1')
    await chip.locator('.dt-chip-body').click()
    await expect(sheet(page).locator('.dt-bsheet-title')).toHaveText('Status')
    await sheet(page).locator('.dt-bsheet-back').click()
    await sheet(page).getByRole('button', { name: 'Clear all' }).click()
    await sheet(page).locator('.dt-bsheet-primary').click()
    await expect(chip).toHaveCount(0)
  })

  test('Sort bölümü: sütun + yön Show results ile uygulanır (header aria-sort)', async ({ page }) => {
    await page.locator('.dt-filter-trigger').click()
    await sheet(page).locator('.is-sort select').selectOption('value')
    await sheet(page).locator('.dt-bsheet-dir [aria-label="Sort descending"]').click()
    await sheet(page).locator('.dt-bsheet-primary').click()
    await expect(page.locator('.dt-head-cell[data-col="value"]')).toHaveAttribute('aria-sort', 'descending')
  })

  test('görünüm alt sayfası seçer; ⋯ alt sayfası: Display › Density (satır 48 kalır), Export › CSV', async ({
    page,
  }) => {
    await page.locator('.dt-view-trigger').click()
    await expect(sheet(page)).toBeVisible()
    await sheet(page)
      .getByRole('option', { name: /Late orders/ })
      .click()
    await expect(sheet(page)).toHaveCount(0)
    await expect(page.locator('.dt-chip')).toHaveCount(2)
    await page.locator('.dt-more-trigger').click()
    await expect(sheet(page)).toContainText('Display')
    await sheetRow(page, 'Density').click()
    await sheetRow(page, 'Compact').click()
    await expect(sheetRow(page, 'Density')).toContainText('Compact')
    expect((await box(page.locator('.dt-row[data-index="0"]'))).height).toBe(49)
    // Export (D46): dinleyici yok, dosyayı paket yazar; etiket sayfadaki satır sayısı.
    await sheetRow(page, /Export \d+ rows/).click()
    const download = page.waitForEvent('download')
    await sheetRow(page, 'CSV').click()
    await expect(sheet(page)).toHaveCount(0)
    expect((await download).suggestedFilename()).toBe('orders.csv')
  })

  test('bulk bar: yanlardan 10 px, 2 aksiyon + More; More sayfası sayaç + yıkıcı en altta; × temizler', async ({
    page,
  }) => {
    await page.locator('.dt-row[data-index="0"] .dt-cell-select input').click()
    await page.locator('.dt-row[data-index="2"] .dt-cell-select input').click()
    const bulk = page.locator('.dt-bulk')
    await expect(bulk).toHaveClass(/is-phone/)
    await expect(bulk).toContainText('2 selected')
    const b = await box(bulk)
    expect(b.x).toBe(10)
    expect(b.width).toBe(370)
    await expect(bulk.locator('.dt-bulk-btn:not(.dt-bulk-more):not(.dt-bulk-icon)')).toHaveCount(2)
    await bulk.locator('.dt-bulk-more').click()
    await expect(sheet(page).locator('.dt-bsheet-label')).toHaveText('2 selected')
    await expect(sheet(page).locator('.dt-bsheet-row').last()).toHaveClass(/is-destructive/)
    await page.keyboard.press('Escape')
    await expect(sheet(page)).toHaveCount(0)
    await bulk.locator('.dt-bulk-icon').click()
    await expect(bulk).toHaveCount(0)
  })

  test('axe: liste ve açık Filters alt sayfası (kritik/ciddi ihlal yok)', async ({ page }) => {
    const scan = async () => {
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      return r.violations
        .filter((v) => v.impact === 'critical' || v.impact === 'serious')
        .map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)
    }
    expect(await scan()).toEqual([])
    await page.locator('.dt-filter-trigger').click()
    await expect(sheet(page)).toBeVisible()
    expect(await scan()).toEqual([])
  })
})
