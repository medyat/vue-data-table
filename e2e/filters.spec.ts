// Faz 3a kabul kriterleri (gerçek tarayıcı, T2 = T1 sunucu modu): column picker, çip ve editörler, operatör menüsü,
// D2, eksik çip, taşma (+N more), kısayol F, header'dan filtre, No results, Clear all.
import { expect, test, type Page } from '@playwright/test'

const settings = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem('pg:settings', JSON.stringify({ theme: 'light', density: 'standard', locale: 'en' })),
  )
const footer = (page: Page) => page.locator('.dt-footer-left')
const chip = (page: Page, col: string) => page.locator(`.dt-chip[data-col="${col}"]`)
const filterBtn = (page: Page) => page.locator('.dt-toolbar .dt-filter-trigger')
/** Çip parçaları boşlukla, avatar baş harfleri hariç: "Status is any of Planned, On hold". */
const chipText = (page: Page, col: string) =>
  chip(page, col)
    .locator('.dt-chip-body')
    .evaluate((el) =>
      [...el.querySelectorAll(':scope > span')]
        .map((s) => {
          const c = s.cloneNode(true) as HTMLElement
          c.querySelector('.dt-chip-avatars')?.remove()
          return c.textContent?.trim() ?? ''
        })
        .join(' '),
    )
const pick = async (page: Page, name: string) => {
  await filterBtn(page).click()
  await page.getByRole('option', { name: new RegExp(`^${name}`) }).click()
}

test.describe('T2 · filtreler', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.goto('/t2')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  })

  test('picker bölümleri; seçenek çipi anında uygulanır; Only; tekil/çoğul etiket; sayaç', async ({ page }) => {
    await filterBtn(page).click()
    const picker = page.locator('.dt-picker')
    await expect(picker).toContainText('Suggested')
    await expect(picker.getByRole('option', { name: /^Status/ })).toContainText('Option')
    await expect(picker.getByRole('option', { name: /^Plant/ })).toBeVisible()
    await picker.getByRole('option', { name: /^Status/ }).click()
    expect(await chipText(page, 'status')).toBe('Status is Select…')
    const pop = page.locator('.dt-chip-pop')
    await pop.getByRole('checkbox', { name: 'Planned' }).check()
    expect(await chipText(page, 'status')).toBe('Status is Planned')
    await expect(page.locator('.dt-filter-trigger .dt-counter')).toHaveText('1')
    await pop.getByRole('checkbox', { name: 'On hold' }).check()
    expect(await chipText(page, 'status')).toBe('Status is any of Planned, On hold')
    await expect(pop).toContainText('2 selected')
    await expect(footer(page)).toContainText(/Rows 1–\d+/)
    await expect(page.locator('.dt-row [data-col="status"]').first()).toContainText(/Planned|On hold/)
    // Only: yalnızca o seçenek.
    const released = pop.locator('.dt-option', { hasText: 'Released' })
    await released.hover()
    await released.getByRole('button', { name: 'Only' }).click()
    expect(await chipText(page, 'status')).toBe('Status is Released')
    await page.keyboard.press('Escape')
    await expect(pop).toHaveCount(0)
    await expect(page.locator('.dt-head-cell[data-col="status"] .dt-head-filtered')).toBeVisible()
  })

  test('D2: aynı sütun için ikinci çip yok, Filtered bölümü mevcut çipi açar; değer seçilmeden kapanan çip kaldırılır', async ({
    page,
  }) => {
    await pick(page, 'Status')
    await page.locator('.dt-chip-pop').getByRole('checkbox', { name: 'Done' }).check()
    await page.keyboard.press('Escape')
    await filterBtn(page).click()
    const picker = page.locator('.dt-picker')
    await expect(picker).toContainText('Filtered')
    await expect(picker.getByRole('option', { name: /^Status/ })).toContainText('opens its chip')
    await picker.getByRole('option', { name: /^Status/ }).click()
    await expect(page.locator('.dt-chip')).toHaveCount(1)
    await expect(page.locator('.dt-chip-pop')).toBeVisible()
    await page.keyboard.press('Escape')
    // Eksik çip: Customer seç, değer girmeden kapat.
    await page.locator('.dt-filter-add').click()
    await page.getByRole('option', { name: /^Customer/ }).click()
    await expect(chip(page, 'customer')).toHaveClass(/is-incomplete/)
    await page.keyboard.press('Escape')
    await expect(chip(page, 'customer')).toHaveCount(0)
    await expect(page.locator('.dt-filter-trigger .dt-counter')).toHaveText('1')
  })

  test('operatör menüsü: metin, değer korunur; is empty değer parçasını gizler', async ({ page }) => {
    await pick(page, 'Product')
    const pop = page.locator('.dt-chip-pop')
    await pop.locator('.dt-editor-text input').fill('cylinder')
    await page.keyboard.press('Enter')
    await expect(pop).toHaveCount(0)
    expect(await chipText(page, 'product.name')).toBe('Product contains “cylinder”')
    await expect(page.locator('.dt-row [data-col="product.name"]').first()).toContainText(/cylinder/i)
    await chip(page, 'product.name').locator('.dt-chip-body').click()
    await pop.locator('.dt-op-btn').click()
    await page.getByRole('menuitem', { name: 'starts with' }).click()
    expect(await chipText(page, 'product.name')).toBe('Product starts with “cylinder”')
    await expect(page.locator('.dt-row [data-col="product.name"]').first()).toContainText(/^Cylinder/)
    await pop.locator('.dt-op-btn').click()
    await page.getByRole('menuitem', { name: 'is empty' }).click()
    expect(await chipText(page, 'product.name')).toBe('Product is empty')
    await expect(page.locator('.dt-state')).toContainText('No orders match this filter')
    await page.locator('.dt-state').getByRole('button', { name: 'Remove “Product”' }).click()
    await expect(page.locator('.dt-chip')).toHaveCount(0)
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  })

  test('tarih hazır aralığı, sayı aralığı + para birimi, kişi filtresi avatarları', async ({ page }) => {
    await pick(page, 'Due date')
    const pop = page.locator('.dt-chip-pop')
    await expect(pop).toContainText('Presets stay relative')
    await pop.getByRole('button', { name: 'Last 30 days' }).click()
    await expect(pop).toHaveCount(0)
    expect(await chipText(page, 'dueAt')).toBe('Due date is within Last 30 days')
    await page.locator('.dt-filter-add').click()
    await page.getByRole('option', { name: /^Value/ }).click()
    await expect(pop).toContainText('Bounds included')
    const [min, max] = await pop.locator('.dt-editor-number input').all()
    await min!.fill('100000')
    await max!.fill('250000')
    await page.keyboard.press('Enter')
    expect(await chipText(page, 'value')).toBe('Value is between 100K – 250K TRY')
    await page.locator('.dt-filter-add').click()
    await page.getByRole('option', { name: /^Owner/ }).click()
    await expect(pop.locator('.dt-option').first()).toContainText('Me')
    await expect(pop.locator('.dt-option').nth(1)).toContainText('Unassigned')
    await pop.getByRole('checkbox', { name: 'Ayşe K.' }).check()
    await pop.getByRole('checkbox', { name: 'Emre T.' }).check()
    await pop.getByRole('checkbox', { name: 'Deniz Ö.' }).check()
    expect(await chipText(page, 'owner')).toBe('Owner is any of 3 people')
    await expect(chip(page, 'owner').locator('.dt-chip-avatars .dt-avatar')).toHaveCount(3)
    await expect(page.locator('.dt-filter-trigger .dt-counter')).toHaveText('3')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Clear all' }).click()
    await expect(page.locator('.dt-filter-row')).toHaveCount(0)
  })

  test('taşma (D29): tek satır yatay kayar, sağda solma, yeni çip görünür alana kayar, Clear all sabit', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 760, height: 800 })
    const add = async (name: string, value: () => Promise<void>) => {
      if (await page.locator('.dt-filter-add').count()) await page.locator('.dt-filter-add').click()
      else await filterBtn(page).click()
      await page.getByRole('option', { name: new RegExp(`^${name}`) }).click()
      await value()
      await page.keyboard.press('Escape')
    }
    const pop = page.locator('.dt-chip-pop')
    await add('Status', () => pop.getByRole('checkbox', { name: 'Done' }).check())
    await add('Owner', () => pop.getByRole('checkbox', { name: 'Ayşe K.' }).check())
    await add('Due date', () => pop.getByRole('button', { name: 'This month' }).click())
    await add('Plant', () => pop.getByRole('checkbox', { name: 'Gebze' }).check())
    await add('Product', () =>
      pop
        .locator('.dt-editor-text input')
        .fill('cyl')
        .then(() => page.keyboard.press('Enter')),
    )
    const row = page.locator('.dt-chips')
    await expect(page.locator('.dt-chip')).toHaveCount(5)
    const box = await row.boundingBox()
    expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
    // Tek satır: tüm çipler aynı yükseklikte.
    const tops = await page.locator('.dt-chip').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top))
    expect(new Set(tops.map(Math.round)).size).toBe(1)
    // Son eklenen çip görünür alanda; sağ uçta solma yalnızca sola kaydırılmışken.
    const last = await chip(page, 'product.name').boundingBox()
    expect(last!.x + last!.width).toBeLessThanOrEqual(box!.x + box!.width + 1)
    await row.evaluate((el) => (el.scrollLeft = 0))
    await expect(page.locator('.dt-filter-row')).toHaveClass(/is-scrolled-end/)
    // Add filter kayan alanın dışında, sağda.
    const addBtn = await page.locator('.dt-filter-add').boundingBox()
    expect(addBtn!.x).toBeGreaterThanOrEqual(box!.x + box!.width)
    await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible()
  })

  test("F kısayolu picker'ı açar; header menüsü › Filter by this column… çipi açar", async ({ page }) => {
    await page.keyboard.press('f')
    await expect(page.locator('.dt-picker')).toBeVisible()
    await page.keyboard.press('Escape')
    const status = page.locator('.dt-head-cell[data-col="status"]')
    await status.hover()
    await status.locator('.dt-head-menu').click()
    await page.getByRole('menuitem', { name: 'Filter by this column…' }).click()
    await expect(chip(page, 'status')).toBeVisible()
    await expect(page.locator('.dt-chip-pop')).toBeVisible()
    await page.locator('.dt-chip-pop').getByRole('checkbox', { name: 'Draft' }).check()
    await page.keyboard.press('Escape')
    await status.locator('.dt-head-filtered').click()
    await expect(page.locator('.dt-chip-pop')).toBeVisible()
  })
})
