// Faz 6a kabul kriterleri (gerçek tarayıcı, T11): 10.000 satır + sanal DOM, açılış ilerlemesi, düzenleme kuralları
// (yazma / F2 / Enter / Tab / Esc, blur onaylamaz, başka hücreye tık ve dışarı tık onaylar), portallı editörler
// (combobox listesi ve tarih popover'ı: ↓/Enter/Esc önce widget'ta, odak portala gidince düzenleme sürer), sayı ve
// tarih girişleri, "Was …", aktif satır kaydırmada DOM'da, hücre düzenleme → DOM < 16 ms.
import { expect, test, type Page } from '@playwright/test'

const settings = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem('pg:settings', JSON.stringify({ theme: 'light', density: 'compact', locale: 'en' })),
  )
const cell = (page: Page, i: number, col: string) =>
  page.locator(`.dt-row[data-index="${i}"] .dt-cell[data-col="${col}"]`)
/** Olaydan DOM güncellemesine süre (MutationObserver): boyama bütçesi 16 ms (01 · Performans). */
const domLatency = (page: Page, selector: string, key: string) =>
  page.evaluate(
    ([sel, k]) =>
      new Promise<number>((res) => {
        const body = document.querySelector('.dt-body')!
        const t0 = performance.now()
        const mo = new MutationObserver(() => {
          mo.disconnect()
          res(performance.now() - t0)
        })
        mo.observe(body, { subtree: true, childList: true, attributes: true })
        document.querySelector(sel)!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
      }),
    [selector, key] as const,
  )

test.describe('T11 · DataSheet', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.setViewportSize({ width: 1440, height: 960 })
  })

  test("açılış: ilerleme şeridi + skeleton; 10.000 satır sanal; aktif satır kaydırmada DOM'da", async ({ page }) => {
    await page.goto('/t11?delay=250')
    await expect(page.locator('.dt-progress')).toBeVisible()
    await expect(page.locator('.dt-row-skeleton').first()).toBeVisible()
    await expect(page.locator('.dt-status')).toContainText('Loading…')
    await expect(cell(page, 0, 'name')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.dt-progress')).toHaveCount(0)
    await expect(page.locator('.dt-status')).toContainText('10,000 rows')
    await expect(page.locator('[role="grid"]')).toHaveAttribute('aria-rowcount', '10000')
    const rendered = await page.locator('.dt-row').count()
    expect(rendered).toBeLessThan(80)
    await cell(page, 6, 'listPrice').click()
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollTop = el.scrollHeight))
    await expect(cell(page, 6, 'listPrice')).toHaveCount(1)
    await expect(cell(page, 6, 'listPrice')).toBeFocused()
    await expect(page.locator('.dt-row[data-index="7"]')).toHaveCount(0)
    await expect(page.locator('.dt-row[data-index="9999"]')).toHaveCount(1)
  })

  test('düzenleme: yazma değiştirir, Enter aşağı, Tab sağa, F2 korur, Esc iptal; dışarı ve başka hücreye tık onaylar; blur onaylamaz', async ({
    page,
  }) => {
    await page.goto('/t11?delay=0')
    await expect(cell(page, 0, 'name')).toBeVisible({ timeout: 15000 })
    await cell(page, 2, 'listPrice').click()
    await page.keyboard.type('2.240,00')
    await expect(page.locator('.dt-cell-input')).toHaveValue('2.240,00')
    const ms = await domLatency(page, '.dt-cell-input', 'Enter')
    expect(ms).toBeLessThan(16)
    await expect(cell(page, 2, 'listPrice')).toHaveClass(/is-changed/)
    await expect(cell(page, 2, 'listPrice')).toContainText('2,240.00')
    await expect(cell(page, 3, 'listPrice')).toBeFocused()
    // "Was …" yalnızca hatasız/uyarısız değişmiş hücrede (öncelik Error > Warning > Changed): boolean Space
    await cell(page, 1, 'active').click()
    await page.keyboard.press('Space')
    await cell(page, 0, 'active').hover()
    await cell(page, 1, 'active').hover()
    await expect(page.locator('.dt-tip')).toContainText('Was Yes')
    await cell(page, 4, 'cost').click()
    await page.keyboard.type('999999')
    await page.keyboard.press('Tab')
    await expect(cell(page, 4, 'cost')).toHaveClass(/is-error/)
    await expect(cell(page, 4, 'vat')).toBeFocused()
    await cell(page, 4, 'cost').hover()
    await expect(cell(page, 4, 'cost').locator('.dt-cell-tip')).toBeVisible()
    await cell(page, 7, 'name').dblclick()
    await expect(page.locator('.dt-cell-input')).toHaveValue('Proportional valve PV 1')
    await page.keyboard.type('X')
    await page.keyboard.press('Escape')
    await expect(cell(page, 7, 'name')).not.toHaveClass(/is-changed/)
    await expect(cell(page, 7, 'name')).toBeFocused()
    await cell(page, 8, 'name').click()
    await page.keyboard.type('Q')
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await expect(cell(page, 8, 'name')).toHaveClass(/is-editing/)
    await page.locator('.dt-status').click()
    await expect(cell(page, 8, 'name')).toHaveClass(/is-changed/)
    await cell(page, 5, 'leadTime').click()
    await page.keyboard.type('11')
    await cell(page, 6, 'leadTime').click()
    await expect(cell(page, 5, 'leadTime')).toHaveClass(/is-changed/)
    await expect(cell(page, 6, 'leadTime')).toBeFocused()
    // formül çubuğu
    await cell(page, 9, 'minStock').click()
    await page.locator('.dt-formula-value').fill('77')
    await expect(cell(page, 9, 'minStock')).toHaveClass(/is-editing/)
    await page.keyboard.press('Enter')
    await expect(cell(page, 9, 'minStock')).toContainText('77')
    await expect(cell(page, 10, 'minStock')).toBeFocused()
    await expect(page.locator('.dt-status')).toContainText('error — go to')
    await page.locator('.dt-sheet-save').click()
    await expect(page.getByTestId('last-save')).toContainText('rows')
  })

  test("portallı editörler: combobox listesi ↓/Enter/Esc önce widget'ta; listede olmayan metin Tab ile hata; tarih popover'ı", async ({
    page,
  }) => {
    await page.goto('/t11?delay=0')
    await expect(cell(page, 0, 'name')).toBeVisible({ timeout: 15000 })
    await cell(page, 7, 'category').click()
    await page.keyboard.press('F2')
    const list = page.locator('.dt-cell-list')
    await expect(list).toBeVisible()
    const lb = (await list.boundingBox())!
    const cb = (await cell(page, 7, 'category').boundingBox())!
    expect(Math.abs(lb.x + lb.width - (cb.x + cb.width))).toBeLessThan(2) // hücrenin altında, sağa hizalı
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(list).toHaveCount(0)
    await expect(cell(page, 7, 'category')).toHaveClass(/is-editing/) // ilk Enter listeyi yönetti
    await page.keyboard.press('Enter')
    await expect(cell(page, 7, 'category')).toHaveClass(/is-changed/)
    await cell(page, 9, 'category').click()
    await page.keyboard.type('Pump')
    await expect(list).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(list).toHaveCount(0)
    await expect(cell(page, 9, 'category')).toHaveClass(/is-editing/) // ilk Esc listeyi kapattı
    await page.keyboard.press('Tab')
    await expect(cell(page, 9, 'category')).toHaveClass(/is-error/)
    await cell(page, 9, 'category').hover()
    await expect(cell(page, 9, 'category').locator('.dt-cell-tip')).toContainText("“Pump” isn't an option")
    // tarih: "+7d" yazılır; Alt↓ takvimi açar, odak portala gider, düzenleme sürer; Esc popover'ı kapatır, ikinci Esc iptal
    await cell(page, 11, 'validFrom').click()
    await page.keyboard.type('+7d')
    await page.keyboard.press('Enter')
    await expect(cell(page, 11, 'validFrom')).toHaveClass(/is-changed/)
    await cell(page, 12, 'validFrom').click()
    await page.keyboard.press('F2')
    await page.keyboard.press('Alt+ArrowDown')
    const pop = page.locator('.dt-cell-date')
    await expect(pop).toBeVisible()
    await pop.locator('.dt-cal-day').first().click()
    await expect(pop).toHaveCount(0)
    await expect(cell(page, 12, 'validFrom')).toHaveClass(/is-editing/)
    await page.keyboard.press('Alt+ArrowDown')
    await expect(pop).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(pop).toHaveCount(0)
    await expect(cell(page, 12, 'validFrom')).toHaveClass(/is-editing/)
    await page.keyboard.press('Escape')
    await expect(cell(page, 12, 'validFrom')).not.toHaveClass(/is-editing/)
    await expect(cell(page, 12, 'validFrom')).toBeFocused()
  })
})
