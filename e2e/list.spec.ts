// Faz 2 kabul kriterleri (gerçek tarayıcı): sıralama, sayfalama, sorgu değişimi, durumlar (T9), sütun menüsü, Display,
// tercih kalıcılığı, kısayollar, toolbar daralması.
import { expect, test, type Page } from '@playwright/test'

const settings = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem('pg:settings', JSON.stringify({ theme: 'light', density: 'standard', locale: 'en' })),
  )
const footer = (page: Page) => page.locator('.dt-footer-left')
const firstRowNo = (page: Page) => page.locator('.dt-row[data-index="0"] [data-col="number"]')

test.describe('T1 · sunucu modu', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.goto('/t1')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  })

  test('sıralama döngüsü, aria-sort yalnızca birincil sütunda, ⇧ ikincil rozetleri', async ({ page }) => {
    const due = page.locator('.dt-head-cell[data-col="dueAt"]')
    const value = page.locator('.dt-head-cell[data-col="value"]')
    await due.locator('.dt-head-label').click()
    await expect(due).toHaveAttribute('aria-sort', 'ascending')
    const first = await firstRowNo(page).textContent()
    await due.locator('.dt-head-label').click()
    await expect(due).toHaveAttribute('aria-sort', 'descending')
    await expect(firstRowNo(page)).not.toHaveText(first!)
    await value.locator('.dt-head-label').click({ modifiers: ['Shift'] })
    await expect(due.locator('.dt-head-sort-index')).toHaveText('1')
    await expect(value.locator('.dt-head-sort-index')).toHaveText('2')
    await due.locator('.dt-head-label').click()
    await expect(due).not.toHaveAttribute('aria-sort', /.+/)
  })

  test('sayfalama: Next, Alt←, sayfa boyutu → 1. sayfa, gövde başa kayar', async ({ page }) => {
    await expect(footer(page)).toContainText('Rows 1–100')
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollTop = 1500))
    await page.locator('.dt-footer-next').click()
    await expect(footer(page)).toContainText('Rows 101–200')
    expect(await page.locator('.dt-scroll').evaluate((el) => el.scrollTop)).toBe(0)
    await expect(page.locator('.dt-row[data-index="0"]')).toHaveAttribute('aria-rowindex', '102')
    await page.keyboard.press('Alt+ArrowLeft')
    await expect(footer(page)).toContainText('Rows 1–100')
    await page.locator('.dt-footer-next').click()
    await page.locator('.dt-select select').selectOption('50')
    await expect(footer(page)).toContainText('Rows 1–50')
    await page.locator('.dt-footer-count').click()
    await expect(footer(page)).toContainText(/of 1,284 · counted \d/)
  })

  test('kaydırma hapı satır konumunu gösterir ve 900 ms sonra kaybolur', async ({ page }) => {
    await page.locator('.dt-scroll').evaluate((el) => (el.scrollTop = 800))
    await expect(page.locator('.dt-scroll-pill')).toHaveClass(/is-visible/)
    await expect(page.locator('.dt-scroll-pill')).toHaveText(/Rows \d+–\d+/)
    await expect(page.locator('.dt-scroll-pill')).not.toHaveClass(/is-visible/, { timeout: 2000 })
  })

  test('sütun menüsü: Pin right, Move left, Hide; Display › Columns ile geri gelir', async ({ page }) => {
    const status = page.locator('.dt-head-cell[data-col="status"]')
    await status.hover()
    await status.locator('.dt-head-menu').click()
    await page.getByRole('menuitem', { name: 'Pin right' }).click()
    await expect(status).toHaveClass(/is-pinned-end/)
    await status.locator('.dt-head-menu').click()
    await page.getByRole('menuitem', { name: 'Unpin' }).click()
    await expect(status).not.toHaveClass(/is-pinned-end/)
    await status.locator('.dt-head-menu').click()
    await page.getByRole('menuitem', { name: 'Move left' }).click()
    const ids = await page
      .locator('[role="columnheader"][data-col]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-col')))
    expect(ids.indexOf('status')).toBeLessThan(ids.indexOf('customer'))
    await status.locator('.dt-head-menu').click()
    await page.getByRole('menuitem', { name: 'Hide column' }).click()
    await expect(page.locator('[role="columnheader"][data-col]')).toHaveCount(7)
    await page.getByRole('button', { name: 'Display' }).click()
    await page.getByRole('button', { name: /^Columns/ }).click()
    await expect(page.locator('.dt-display')).toContainText('7 of 10 shown')
    await page.locator('.dt-col-row.is-hidden', { hasText: 'Status' }).locator('button').click()
    await expect(page.locator('[role="columnheader"][data-col]')).toHaveCount(8)
  })

  test('Display: yoğunluk ve dikey çizgiler tercihte kalır (localStorage)', async ({ page }) => {
    await page.getByRole('button', { name: 'Display' }).click()
    await page.getByRole('button', { name: 'Compact' }).click()
    await expect(page.locator('.dt')).toHaveAttribute('data-density', 'compact')
    await page.getByRole('switch').click()
    await expect(page.locator('.dt-grid')).toHaveClass(/has-vlines/)
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await expect(page.locator('.dt')).toHaveAttribute('data-density', 'compact')
    await expect(page.locator('.dt-grid')).toHaveClass(/has-vlines/)
  })

  test("'/' aramaya odaklar; arama sorguyu değiştirir, Esc temizler", async ({ page }) => {
    await page.keyboard.press('/')
    await expect(page.locator('.dt-search input')).toBeFocused()
    await page.keyboard.type('WO-26-158')
    await expect(footer(page)).toContainText('Rows 1–4') // tek sayfa: Count total ve "end of results" yok
    await expect(footer(page)).not.toContainText('Count total')
    await page.keyboard.press('Escape')
    await expect(page.locator('.dt-search input')).toHaveValue('')
    await expect(footer(page)).toContainText('Rows 1–100')
  })

  test('toolbar daralması: 800 px → ikonlar; 500 px → Display ⋯ içinde, birincil ikon', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 })
    await expect(page.locator('.dt-toolbar')).toHaveClass(/is-narrow/)
    await expect(page.getByRole('button', { name: 'Display' })).not.toContainText('Display')
    await page.getByRole('button', { name: 'Search orders…' }).click()
    await expect(page.locator('.dt-search input')).toBeFocused()
    await page.setViewportSize({ width: 500, height: 700 })
    await expect(page.locator('.dt-toolbar')).toHaveClass(/is-phone/)
    await expect(page.getByRole('button', { name: 'New order' })).not.toContainText('New order')
    await page.getByRole('button', { name: 'More actions' }).click()
    await page.getByRole('menuitem', { name: 'Display' }).click()
    await expect(page.locator('.dt-display')).toBeVisible()
  })

  test('Auto-refresh açıkken footer Live', async ({ page }) => {
    await page.getByRole('button', { name: 'More actions' }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Auto-refresh' }).click()
    await expect(footer(page)).toContainText('Live')
  })
})

test.describe('T1 · gecikmeli sunucu', () => {
  test('sorgu değişimi: eski satırlar inert, sayfalama kilitli; sonra yeni satırlar', async ({ page }) => {
    await settings(page)
    await page.goto('/t1?delay=1500')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await page.locator('.dt-search input').fill('vinç')
    await expect(page.locator('.dt-body[inert]')).toHaveCount(1)
    await expect(page.locator('.dt-footer-next')).toBeDisabled()
    await expect(page.locator('.dt-row-skeleton').first()).toBeVisible()
    await expect(page.locator('.dt-body[inert]')).toHaveCount(0, { timeout: 5000 })
    await expect(firstRowNo(page)).toBeVisible()
    await expect(page.locator('.dt-row [data-col="customer"]').first()).toContainText('Vinç')
  })
  test('yenileme: satırlar kalır, çubuk görünür, footer Updating…; R kısayolu', async ({ page }) => {
    await settings(page)
    await page.goto('/t1?delay=700')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await page.keyboard.press('r')
    await expect(page.locator('.dt-refresh-bar')).toBeVisible()
    await expect(footer(page)).toContainText('Updating…')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await expect(page.locator('.dt-refresh-bar')).toHaveCount(0, { timeout: 3000 })
    await expect(footer(page)).toContainText('Updated just now')
  })
})

test.describe('T9 · durumlar', () => {
  test.beforeEach(({ page }) => settings(page))
  test('Error: başlık, mesaj, Try again, Copy error ID', async ({ page }) => {
    await page.goto('/t9?s=error')
    const state = page.locator('.dt-state.is-error')
    await expect(state).toContainText("Couldn't load production orders")
    await expect(state).toContainText("The server didn't answer in time.")
    await expect(state.locator('.dt-state-code')).toHaveText('504 · req 8f3a1c2e')
    await expect(state.getByRole('button', { name: 'Try again' })).toBeEnabled()
    await expect(footer(page)).toContainText('0 rows')
  })
  test('Stale: yenileme hatası amber şerit, satırlar kalır; Retry', async ({ page }) => {
    await page.goto('/t9?s=stale')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await page.keyboard.press('r')
    await expect(page.locator('.dt-strip')).toContainText("Couldn't refresh. Showing data from")
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await expect(page.locator('.dt-footer-updated')).toHaveClass(/is-stale/)
    await page.locator('.dt-strip-action').click()
    await expect(page.locator('.dt-strip')).toBeVisible()
  })
  test('Empty: #empty slot ve footer No rows', async ({ page }) => {
    await page.goto('/t9?s=empty')
    await expect(page.locator('.dt-state')).toContainText('No production orders yet')
    await expect(page.getByRole('button', { name: 'Create order' })).toBeVisible()
    await expect(footer(page)).toContainText('No rows')
  })
  test('No rows on this page → Go to previous page', async ({ page }) => {
    await page.goto('/t9?s=pageEmpty')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await page.locator('.dt-footer-next').click()
    await expect(page.locator('.dt-state')).toContainText('No rows on this page')
    await expect(page.locator('.dt-footer-prev')).toBeEnabled()
    await page.getByRole('button', { name: 'Go to previous page' }).click()
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await expect(footer(page)).toContainText('Rows 1–50')
  })
  test('First load skeleton anında; 10 s sonra Still loading…', async ({ page }) => {
    await page.clock.install()
    await page.goto('/t9?s=loading')
    await expect(page.locator('.dt-row-skeleton')).toHaveCount(12)
    await expect(footer(page)).toContainText('Loading…')
    await page.clock.fastForward(10_500)
    await expect(page.locator('.dt-notice')).toContainText('Still loading…')
  })
})
