// Faz 7 kabul kriteri: axe-core taramasında kritik/ciddi ihlal yok (WCAG 2.1 A/AA); liste, görünümler ve sheet ekranları.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const settings = (page: Page, theme = 'light') =>
  page.addInitScript(
    ([t]) => localStorage.setItem('pg:settings', JSON.stringify({ theme: t, density: 'standard', locale: 'en' })),
    [theme],
  )
const scan = async (page: Page, label: string) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.nodes[0]?.target.join(' ')}`)
  expect(summary, label).toEqual([])
}

for (const theme of ['light', 'dark-class']) {
  test(`axe · T1 liste (${theme})`, async ({ page }) => {
    await settings(page, theme)
    await page.goto('/t1?size=100')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await scan(page, 'T1')
    await page.locator('.dt-row[data-index="1"] .dt-cell-select input').check()
    await page.waitForTimeout(400) // bulk bar kayma animasyonu (160 ms) bitsin; axe ara kareyi ölçmesin
    await scan(page, 'T1 seçim + bulk bar')
  })
}

test('axe · T1 filtre çipi açık ve görünüm menüsü', async ({ page }) => {
  await settings(page)
  await page.goto('/t1?size=100')
  await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  await page.locator('.dt-filter-trigger').first().click()
  await expect(page.locator('.dt-picker')).toBeVisible()
  await scan(page, 'sütun seçici')
})

test('axe · T11 sheet (düzenleme, hata balonu, dialog)', async ({ page }) => {
  await settings(page)
  await page.goto('/t11?delay=0&rows=50&fresh=1')
  const cell = (i: number, col: string) => page.locator(`.dt-row[data-index="${i}"] .dt-cell[data-col="${col}"]`)
  await expect(cell(0, 'name')).toBeVisible({ timeout: 15000 })
  await cell(0, 'name').click()
  await page.keyboard.press('Delete')
  await scan(page, 'T11 hata')
  await cell(1, 'category').click()
  await page.keyboard.press('F2')
  await expect(page.locator('.dt-cell-list')).toBeVisible()
  await scan(page, 'T11 combobox')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Meta+s')
  await expect(page.locator('.dt-dialog-errors')).toBeVisible()
  await scan(page, "T11 hata dialog'u")
})
