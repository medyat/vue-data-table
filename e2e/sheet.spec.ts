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
    // hatalı satır varken Save önce dialog açar (6c); "Save N rows" kalanını teslim eder
    await page.locator('.dt-sheet-save').click()
    await page.locator('.dt-dialog-errors .dt-btn-primary').click()
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

/** Sentetik pano olayı: aktif hücreye ClipboardEvent + DataTransfer (gerçek panoya izin gerekmez). */
const pasteText = (page: Page, text: string) =>
  page.evaluate((t) => {
    const dt = new DataTransfer()
    dt.setData('text/plain', t)
    const t0 = performance.now()
    document.activeElement!.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    )
    return performance.now() - t0
  }, text)
const copyData = (page: Page) =>
  page.evaluate(() => {
    const dt = new DataTransfer()
    const e = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })
    document.activeElement!.dispatchEvent(e)
    return { prevented: e.defaultPrevented, text: dt.getData('text/plain'), html: dt.getData('text/html') }
  })

test.describe('T11 · DataSheet · pano, doldurma, geri al, Find (Faz 6b)', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.goto('/t11?delay=0')
    await expect(cell(page, 0, 'name')).toBeVisible({ timeout: 15000 })
  })

  test('kopyala TSV + HTML (taslak, görüntülenen biçim); seçim özeti; yapıştırma yerel ayar çıkarımı, toast, Review, Undo/Redo', async ({
    page,
  }) => {
    await cell(page, 0, 'listPrice').click()
    await page.keyboard.type('5')
    await page.keyboard.press('Enter')
    await cell(page, 0, 'listPrice').click()
    await page.keyboard.press('Shift+ArrowDown')
    await page.keyboard.press('Shift+ArrowRight')
    const c = await copyData(page)
    expect(c.prevented).toBe(true)
    expect(c.text.split('\n')[0]).toMatch(/^5\.00\t/) // taslak değer, para kodu yok
    expect(c.html).toContain('<table>')
    await expect(page.locator('.dt-status-summary')).toContainText('Count')
    await expect(page.locator('.dt-status-summary')).toContainText('Sum')
    await cell(page, 5, 'minStock').click()
    await pasteText(page, '1.250\t7\n12,5\t8\n3\t9')
    await expect(cell(page, 5, 'minStock')).toContainText('1,250') // 12,5 → virgül ondalık → 1.250 = 1250
    await expect(cell(page, 6, 'minStock')).toHaveClass(/is-error/) // 12.5 tam sayı değil
    await expect(cell(page, 7, 'leadTime')).toContainText('9')
    await expect(cell(page, 7, 'leadTime')).toHaveClass(/is-selected/)
    const toast = page.locator('.dt-toast')
    await expect(toast).toContainText('Pasted 3 rows × 2 columns')
    await expect(toast).toContainText('1 cell has an error')
    await page.locator('.dt-toast-link').click()
    await expect(cell(page, 6, 'minStock')).toBeFocused()
    await page.locator('.dt-toast-undo').click()
    await expect(cell(page, 5, 'minStock')).not.toHaveClass(/is-changed/)
    await page.locator('.dt-sheet-undo').nth(1).click()
    await expect(cell(page, 5, 'minStock')).toHaveClass(/is-changed/)
    await cell(page, 20, 'name').click()
    await page.keyboard.press('Meta+z')
    await expect(cell(page, 5, 'minStock')).not.toHaveClass(/is-changed/)
    await expect(cell(page, 5, 'minStock')).toBeFocused() // undo seçimi adıma taşır
    // "Pump" → hata + Use Pumps
    await cell(page, 10, 'category').click()
    await pasteText(page, 'Pump')
    await expect(cell(page, 10, 'category')).toHaveClass(/is-error/)
    await cell(page, 10, 'category').hover()
    await page.locator('.dt-cell-tip-btn').click()
    await expect(cell(page, 10, 'category')).toContainText('Pumps')
    await expect(cell(page, 10, 'category')).not.toHaveClass(/is-error/)
  })

  test('fill handle: seri devam eder, etiket; ⌘D kopyalar; sona taşan yapıştırma sınırda reddedilir, yeni satır olur', async ({
    page,
  }) => {
    await cell(page, 12, 'minStock').click()
    await page.keyboard.type('1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('2')
    await page.keyboard.press('Enter')
    await cell(page, 12, 'minStock').click()
    await page.keyboard.press('Shift+ArrowDown')
    const handle = page.locator('.dt-fill-handle')
    const hb = (await handle.boundingBox())!
    const target = (await cell(page, 16, 'minStock').boundingBox())!
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x + 20, target.y + 10, { steps: 5 })
    await expect(page.locator('.dt-fill-label')).toHaveText('Fill 3 cells with 3')
    await expect(cell(page, 16, 'minStock')).toHaveClass(/is-fill-end/)
    await page.mouse.up()
    await expect(cell(page, 14, 'minStock')).toContainText('3')
    await expect(cell(page, 16, 'minStock')).toContainText('5')
    await expect(cell(page, 16, 'minStock')).toHaveClass(/is-selected/)
    await cell(page, 18, 'leadTime').click()
    await page.keyboard.press('Shift+ArrowDown')
    await page.keyboard.press('Shift+ArrowDown')
    const v = await cell(page, 18, 'leadTime').innerText()
    await page.keyboard.press('Meta+d')
    await expect(cell(page, 20, 'leadTime')).toContainText(v)
    // sınır: 10.000 satırda taşma reddedilir
    await page.keyboard.press('Control+End')
    await expect(cell(page, 9999, 'sku')).toBeVisible()
    await cell(page, 9999, 'sku').click()
    await pasteText(page, 'NEW-1\tA\tPumps\nNEW-2\tB\tSeals')
    await expect(page.locator('.dt-toast')).toContainText('This paste would make 10,001 rows. The limit is 10,000.')
    await expect(page.locator('.dt-status')).toContainText('10,000 rows')
    // 50 satırlık tabloda yeni satır
    await page.goto('/t11?delay=0&rows=50')
    await expect(cell(page, 0, 'name')).toBeVisible({ timeout: 15000 })
    await cell(page, 0, 'name').click()
    await page.keyboard.press('Control+End')
    await page.keyboard.press('Home')
    await pasteText(page, 'NEW-1\tA\tPumps\nNEW-2\tB\tSeals')
    await expect(page.locator('.dt-status')).toContainText('51 rows')
    await expect(page.locator('.dt-status')).toContainText('1 new row')
    await expect(cell(page, 50, 'sku')).toContainText('NEW-2')
    await expect(cell(page, 50, 'sku')).toHaveClass(/is-new/)
    await expect(cell(page, 49, 'sku')).not.toHaveClass(/is-changed/) // yüklenmiş satırın anahtarı atlanır
    await expect(cell(page, 49, 'name')).toContainText('A')
    await page.keyboard.press('Meta+z')
    await expect(page.locator('.dt-status')).toContainText('50 rows')
    await page.keyboard.press('Meta+Shift+z')
    await expect(page.locator('.dt-status')).toContainText('51 rows')
  })

  test('Find in grid: ⌘F, sayaç, vurgulama, Enter sonraki; 1.000 × 10 yapıştırma < 300 ms', async ({ page }) => {
    await cell(page, 0, 'name').click()
    await page.keyboard.press('Meta+f')
    await expect(page.locator('.dt-search input')).toBeFocused()
    await page.keyboard.type('Gear pump GP 3')
    await expect(page.locator('.dt-find-count')).toContainText('1 of')
    await expect(cell(page, 17, 'name')).toHaveClass(/is-match/)
    await expect(cell(page, 17, 'name')).toHaveClass(/is-active/)
    await page.keyboard.press('Enter')
    await expect(page.locator('.dt-find-count')).toContainText('2 of')
    await page.keyboard.press('Escape') // metni temizler → vurgular kalkar
    await expect(page.locator('.dt-cell.is-match')).toHaveCount(0)
    await page.keyboard.press('Escape') // ızgaraya döner
    await expect(page.locator('.dt-cell.is-active')).toBeFocused()
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollTop = 100 * 33))
    await cell(page, 100, 'name').click()
    const big = Array.from({ length: 1000 }, (_, i) =>
      [`Name ${i}`, 'Valves', 'pcs', `${1000 + i}`, `${500 + i}`, '20', `${i}`, '7', 'Yes', '2026-01-01'].join('\t'),
    ).join('\n')
    const ms = await pasteText(page, big)
    expect(ms).toBeLessThan(300)
    await expect(page.locator('.dt-toast')).toContainText('Pasted 1,000 rows × 10 columns')
    await expect(page.locator('.dt-sheet-changes')).toContainText('changes in 1,000 rows')
  })
})

test.describe('T11 · DataSheet · satır partisi, sıralama, kayıt (Faz 6c)', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.setViewportSize({ width: 1440, height: 960 })
  })

  test("sıralama; Add row + lookupKeys (New/Update, base); tekil anahtar; ⌘− + Undo; görünümler; hücre menüsü; hata dialog'u; saving; applyResult; Partly saved + Copy errors", async ({
    page,
  }) => {
    await page.goto('/t11?delay=0&rows=30&saveDelay=400&fresh=1')
    await expect(cell(page, 0, 'name')).toBeVisible({ timeout: 15000 })

    // sort by list price (header click), desc on second click, off on third; gutter numbers stable
    await page.locator('.dt-head-cell[data-col="listPrice"] .dt-head-label').click()
    await expect(page.locator('.dt-head-cell[data-col="listPrice"]')).toHaveAttribute('aria-sort', 'ascending')
    const firstNo = await page.locator('.dt-row[data-index="0"] [role="rowheader"]').innerText()
    expect(firstNo).not.toBe('1')
    await page.locator('.dt-head-cell[data-col="listPrice"] .dt-head-label').click()
    await expect(page.locator('.dt-head-cell[data-col="listPrice"]')).toHaveAttribute('aria-sort', 'descending')
    await page.locator('.dt-head-cell[data-col="listPrice"] .dt-head-label').click()
    await expect(page.locator('.dt-row[data-index="0"] [role="rowheader"]')).toHaveText('1')

    // Add row: focus key cell editing; type known SKU → Update + base fill; type new → New
    await page.locator('.dt-sheet-add').click()
    await expect(cell(page, 30, 'sku')).toHaveClass(/is-editing/)
    await expect(page.locator('.dt-row[data-index="30"] [role="rowheader"]')).toHaveText('31')
    await page.keyboard.type('HC-0100-S') // sunucuda var, listede yok (rows=30)
    await page.keyboard.press('Enter')
    await expect(cell(page, 30, 'sku')).toContainText('Update', { timeout: 5000 })
    await expect(cell(page, 30, 'sku')).not.toHaveClass(/is-error/)
    await expect(cell(page, 30, 'name')).toContainText('Hydraulic cylinder HC 100') // base fill (Q2)
    await expect(cell(page, 30, 'name')).not.toHaveClass(/is-changed/)
    await page.locator('.dt-sheet-add').click()
    await page.keyboard.type('NEW-100')
    await page.keyboard.press('Enter')
    await expect(cell(page, 31, 'sku')).toContainText('New', { timeout: 5000 })
    await expect(page.locator('.dt-sheet-changes')).toContainText('2 new')
    // duplicate key: another new row with NEW-100 → both error
    await page.locator('.dt-sheet-add').click()
    await page.keyboard.type('NEW-100')
    await page.keyboard.press('Enter')
    await expect(cell(page, 32, 'sku')).toHaveClass(/is-error/)
    await expect(cell(page, 31, 'sku')).toHaveClass(/is-error/)
    await cell(page, 32, 'sku').hover()
    await expect(cell(page, 32, 'sku').locator('.dt-cell-tip')).toContainText('NEW-100 is already in row 32')
    // remove duplicate row via ⌘−, toast + undo
    await cell(page, 32, 'name').click()
    await page.keyboard.press('Meta+-')
    await expect(page.locator('.dt-toast')).toContainText("Row 33 removed from this list. The product isn't deleted.")
    await expect(page.locator('.dt-status')).toContainText('32 rows')
    await expect(cell(page, 31, 'sku')).not.toHaveClass(/is-error/)
    await page.locator('.dt-toast-undo').click()
    await expect(page.locator('.dt-status')).toContainText('33 rows')
    await expect(cell(page, 31, 'sku')).toHaveClass(/is-error/)
    await expect(cell(page, 32, 'name')).toBeFocused()
    await page.keyboard.press('Meta+-')
    await expect(page.locator('.dt-status')).toContainText('32 rows')

    // segmented: Changed shows 2 rows; Errors shows 0
    await page.locator('.dt-sheet-views .dt-seg-item[value="changed"]').click()
    await expect(page.locator('.dt-row')).toHaveCount(2)
    await page.locator('.dt-sheet-views .dt-seg-item[value="all"]').click()
    await expect(page.locator('.dt-row')).toHaveCount(32)

    // context menu on a loaded row: Open product link present; Insert row below
    await cell(page, 2, 'name').click({ button: 'right' })
    const menu = page.locator('.dt-sheet-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Open product')
    await menu.getByText('Insert row below').click()
    await expect(cell(page, 3, 'sku')).toHaveClass(/is-editing/)
    await expect(page.locator('.dt-row[data-index="3"] [role="rowheader"]')).toHaveText('34')
    await page.keyboard.press('Escape')
    await cell(page, 3, 'name').click()
    await page.keyboard.press('Meta+-')
    await expect(page.locator('.dt-status')).toContainText('32 rows')

    // fill new row: name + listPrice; save with errors dialog (new row NEW-100 has required name/listPrice empty)
    await cell(page, 0, 'minStock').click()
    await page.keyboard.type('5')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    await expect(cell(page, 0, 'minStock')).toHaveClass(/is-changed/)
    await page.keyboard.press('Meta+s')
    const dialog = page.locator('.dt-dialog-errors')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('1 row has errors')
    await expect(dialog).toContainText('The other 1 changed rows will be saved.')
    await expect(dialog).toContainText('NEW-100')
    await dialog.getByText('Fix first').click()
    await expect(page.locator('.dt-sheet-views .dt-seg-item[value="errors"]')).toHaveAttribute('data-state', 'on')
    await expect(page.locator('.dt-cell.is-active')).toHaveClass(/is-error/)
    // fix: name + price on the new row
    const errRow = page.locator('.dt-row.is-active-row')
    await errRow.locator('[data-col="name"]').click()
    await page.keyboard.type('Brand new')
    await page.keyboard.press('Tab')
    await page.keyboard.type('Pumps')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.type('123')
    await page.keyboard.press('Enter')
    await page.locator('.dt-sheet-views .dt-seg-item[value="all"]').click()
    await expect(page.locator('.dt-sheet-views .dt-seg-item[value="errors"] .dt-seg-count')).toHaveText('0')
    // save OK path: saving strip then saved summary
    await page.locator('.dt-sheet-save').click()
    await expect(page.locator('.dt-progress-strip')).toContainText('Saving…')
    await expect(page.locator('.dt-sheet-save')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('.dt-status-saved')).toContainText('rows saved', { timeout: 10000 })
    await expect(page.locator('.dt-sheet-changes')).toContainText('No changes')
    await expect(page.locator('.dt-status')).not.toContainText('new row')
    await expect(cell(page, 30, 'sku')).not.toContainText('Update')
    await expect(cell(page, 31, 'sku')).not.toContainText('New')
    // server error path: cost > 100000 (istemci kuralı için liste fiyatı daha yüksek) → partly saved banner + copy errors
    await cell(page, 4, 'listPrice').click()
    await page.keyboard.type('300000')
    await page.keyboard.press('Tab')
    await page.keyboard.type('200000')
    await page.keyboard.press('Enter')
    await cell(page, 5, 'cost').click()
    await page.keyboard.type('1')
    await page.keyboard.press('Enter')
    await page.locator('.dt-sheet-save').click()
    await expect(page.locator('.dt-sheet-partly')).toContainText("1 rows couldn't be saved.", { timeout: 10000 })
    await expect(page.locator('.dt-sheet-partly')).toContainText('1 rows were saved.')
    await expect(page.locator('.dt-sheet-views .dt-seg-item[value="errors"]')).toHaveAttribute('data-state', 'on')
    await expect(page.locator('.dt-cell.is-active')).toHaveClass(/is-error/)
    await page.locator('.dt-cell.is-active').hover()
    await expect(page.locator('.dt-cell.is-active .dt-cell-tip')).toContainText('server limit')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.locator('.dt-partly-copy').click()
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => 'denied'))
    expect(clip).toContain('Row\tSKU\tColumn\tMessage')
    expect(clip).toContain('Cost exceeds the server limit')
    // editing the cell clears the server error → banner closes
    await page.locator('.dt-cell.is-active').click()
    await page.keyboard.type('50')
    await page.keyboard.press('Enter')
    await expect(page.locator('.dt-sheet-partly')).toHaveCount(0)
    await expect(page.locator('.dt-sheet-views .dt-seg-item[value="errors"] .dt-seg-count')).toHaveText('0')
  })
})
