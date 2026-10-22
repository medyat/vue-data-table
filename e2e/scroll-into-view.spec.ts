// Klavyeyle gezerken aktif satır/hücre görünür alanda kalır (08 §2): sticky header'ın altına ve kabın alt kenarının
// (ya da yatay kaydırma çubuğunun) altına girmez. Sanal listede sabit header akış içinde olduğundan TanStack
// `scrollMargin` / `scrollPaddingStart` ayarlanmazsa aktif satır tam bir header yüksekliği kadar alta kayar.
import { expect, test, type Page } from '@playwright/test'

const settings = (page: Page, density: 'standard' | 'compact') =>
  page.addInitScript(
    (d) => localStorage.setItem('pg:settings', JSON.stringify({ theme: 'light', density: d, locale: 'en' })),
    density,
  )
/** Odaklı elemanın, kaydırma kabının görünür kısmının ve sticky header'ın dikey sınırları. */
const bounds = (page: Page, grid: string) =>
  page.evaluate((g) => {
    const root = document.querySelector(g)!
    const scroll = root.querySelector('.dt-scroll') as HTMLElement
    const head = root.querySelector('.dt-head') as HTMLElement
    const a = document.activeElement as HTMLElement
    const r = a.getBoundingClientRect()
    const s = scroll.getBoundingClientRect()
    return {
      top: r.top,
      bottom: r.bottom,
      headBottom: head.getBoundingClientRect().bottom,
      // clientHeight yatay kaydırma çubuğunu dışarıda bırakır.
      visibleBottom: s.top + scroll.clientHeight,
      tag: a.className,
    }
  }, grid)
const press = async (page: Page, key: string, n: number) => {
  for (let i = 0; i < n; i++) await page.keyboard.press(key)
}

test("DataSheet: ↓ ile inerken hücre alt kenarın, ↑ ile çıkarken header'ın altına girmez", async ({ page }) => {
  await settings(page, 'compact')
  await page.goto('/t11?delay=0&rows=200&fresh=1')
  const cell = page.locator('.dt-row[data-index="0"] .dt-cell[data-col="name"]')
  await expect(cell).toBeVisible({ timeout: 15000 })
  await cell.click()
  await press(page, 'ArrowDown', 40)
  let b = await bounds(page, '.dt-sheet-grid')
  expect(b.tag).toContain('is-active')
  expect(b.bottom).toBeLessThanOrEqual(b.visibleBottom + 0.5)
  expect(b.top).toBeGreaterThanOrEqual(b.headBottom - 0.5)
  await press(page, 'ArrowUp', 25)
  b = await bounds(page, '.dt-sheet-grid')
  expect(b.top).toBeGreaterThanOrEqual(b.headBottom - 0.5)
  expect(b.bottom).toBeLessThanOrEqual(b.visibleBottom + 0.5)
})

test("DataTable: ↓ ile inerken satır alt kenarın, ↑ ile çıkarken header'ın altına girmez", async ({ page }) => {
  await settings(page, 'standard')
  await page.goto('/t1')
  const first = page.locator('.dt-row[data-index="0"]')
  await expect(first).toBeVisible()
  await first.locator('[data-col="customer"]').click()
  await press(page, 'ArrowDown', 40)
  let b = await bounds(page, '.dt-list .dt-grid')
  expect(b.tag).toContain('dt-row')
  expect(b.bottom).toBeLessThanOrEqual(b.visibleBottom + 0.5)
  expect(b.top).toBeGreaterThanOrEqual(b.headBottom - 0.5)
  await press(page, 'ArrowUp', 25)
  b = await bounds(page, '.dt-list .dt-grid')
  expect(b.top).toBeGreaterThanOrEqual(b.headBottom - 0.5)
  expect(b.bottom).toBeLessThanOrEqual(b.visibleBottom + 0.5)
})

test('DataSheet: ⇧+ok ile seçimi genişletirken hareket eden uç görünür alana gelir; odak aktif hücrede kalır', async ({
  page,
}) => {
  await settings(page, 'compact')
  await page.goto('/t11?delay=0&rows=200&fresh=1')
  const cell = (i: number, col: string) => page.locator(`.dt-row[data-index="${i}"] .dt-cell[data-col="${col}"]`)
  await expect(cell(0, 'name')).toBeVisible({ timeout: 15000 })
  await cell(0, 'name').click()
  await press(page, 'Shift+ArrowDown', 40)
  await expect(cell(40, 'name')).toHaveClass(/is-selected/)
  let b = await bounds(page, '.dt-sheet-grid')
  expect(b.tag).toContain('is-active') // odak anchor'da
  const end = await cell(40, 'name').boundingBox()
  expect(end!.y + end!.height).toBeLessThanOrEqual(b.visibleBottom + 0.5)
  await press(page, 'Shift+ArrowUp', 30)
  await expect(cell(10, 'name')).toHaveClass(/is-selected/)
  await expect(cell(11, 'name')).not.toHaveClass(/is-selected/)
  b = await bounds(page, '.dt-sheet-grid')
  const top = await cell(10, 'name').boundingBox()
  expect(top!.y).toBeGreaterThanOrEqual(b.headBottom - 0.5)
  // Yatayda: sağa genişlerken uç sütun kabın sağ kenarını aşmaz.
  await press(page, 'Shift+ArrowRight', 8)
  const edge = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.dt-row[data-index="10"] .dt-cell.is-selected')]
    const last = cells.at(-1)!.getBoundingClientRect()
    const s = document.querySelector('.dt-sheet-grid .dt-scroll')!.getBoundingClientRect()
    return { right: last.right, scrollRight: s.right }
  })
  expect(edge.right).toBeLessThanOrEqual(edge.scrollRight + 0.5)
})
