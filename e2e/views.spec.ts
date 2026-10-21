// Faz 3b kabul kriterleri (gerçek tarayıcı): görünüm menüsü, system default, Edited + kaydetme bölümü, Save as new view
// dialog'u, Default etiketi, satır ⋯ menüsü (Rename / Delete), ⌘S ve V kısayolları, hazır kişisel görünümler (T3).
import { expect, test, type Page } from '@playwright/test'

const settings = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem('pg:settings', JSON.stringify({ theme: 'light', density: 'standard', locale: 'en' })),
  )
const trigger = (page: Page) => page.locator('.dt-view-trigger')
const menu = (page: Page) => page.locator('.dt-views')
const row = (page: Page, name: string) => menu(page).locator('.dt-view-row', { hasText: name })

test.describe('T1 · görünümler (localStorage adapter)', () => {
  test.beforeEach(async ({ page }) => {
    await settings(page)
    await page.goto('/t1')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
  })

  test('system default; menü bölümleri; On hold seçimi filtre çipi + tek sorgu; V kısayolu', async ({ page }) => {
    await expect(trigger(page)).toHaveText('All orders')
    await page.keyboard.press('v')
    await expect(menu(page)).toBeVisible()
    await expect(menu(page).locator('input')).toBeFocused()
    await expect(menu(page)).toContainText('System views')
    await expect(menu(page)).toContainText('Built in')
    await expect(menu(page)).not.toContainText('My views')
    await row(page, 'On hold').locator('.dt-view-item').click()
    await expect(trigger(page)).toHaveText('On hold')
    await expect(page.locator('.dt-chip[data-col="status"]')).toContainText('On hold')
    await expect(page.locator('.dt-row [data-col="status"]').first()).toContainText('On hold')
    await expect(page.locator('.dt-head-cell[data-col="dueAt"]')).toHaveAttribute('aria-sort', 'ascending')
  })

  test('düzenle → Edited; Save as my view… dialog → My views + Default; Rename; Delete onayı; ⌘S kişisel görünümü kaydeder', async ({
    page,
  }) => {
    await page.locator('.dt-head-cell[data-col="value"] .dt-head-label').click()
    await expect(trigger(page)).toContainText('Edited')
    await trigger(page).click()
    await expect(menu(page)).toContainText('“All orders” edited')
    await expect(menu(page)).not.toContainText('Save changes')
    await menu(page)
      .getByRole('button', { name: /Save as my view/ })
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Save as new view')
    await expect(dialog).toContainText('Only you can see it')
    await expect(dialog.getByLabel('Name')).toBeFocused()
    await dialog.getByRole('button', { name: 'Save view' }).click()
    await expect(dialog).toContainText('Enter a name.')
    await dialog.getByLabel('Name').fill('High value first')
    await dialog.getByLabel('Make this my default view').check()
    await dialog.getByRole('button', { name: 'Save view' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(trigger(page)).toHaveText('High value first')
    await trigger(page).click()
    await expect(menu(page)).toContainText('My views')
    await expect(row(page, 'High value first')).toContainText('Default')
    await page.keyboard.press('Escape')
    // Yenilemede tercih (varsayılan görünüm) ve kayıt kalır.
    await page.reload()
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await expect(trigger(page)).toHaveText('High value first')
    await expect(page.locator('.dt-head-cell[data-col="value"]')).toHaveAttribute('aria-sort', 'ascending')
    // ⌘S: kişisel görünüm → doğrudan kaydeder.
    await page.locator('.dt-head-cell[data-col="value"] .dt-head-label').click()
    await expect(trigger(page)).toContainText('Edited')
    await page.keyboard.press('ControlOrMeta+s')
    await expect(trigger(page)).not.toContainText('Edited')
    // Rename.
    await trigger(page).click()
    await row(page, 'High value first').hover()
    await row(page, 'High value first').locator('.dt-view-more').click()
    await page.getByRole('menuitem', { name: 'Rename' }).click()
    await expect(page.getByRole('dialog')).toContainText('Rename')
    await page.getByRole('dialog').getByLabel('Name').fill('Big orders')
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
    await expect(trigger(page)).toHaveText('Big orders')
    // Delete: onay, aktif silinince system default'a.
    await trigger(page).click()
    await row(page, 'Big orders').hover()
    await row(page, 'Big orders').locator('.dt-view-more').click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    const alert = page.getByRole('alertdialog')
    await expect(alert).toContainText('Delete “Big orders”?')
    await expect(alert.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await alert.getByRole('button', { name: 'Delete' }).click()
    await expect(trigger(page)).toHaveText('All orders')
    await trigger(page).click()
    await expect(menu(page)).not.toContainText('My views')
  })
})

test.describe('T3 · hazır kişisel görünümler', () => {
  test('kullanıcı varsayılanı kişisel görünüm; Default etiketi; Duplicate "{ad} copy"; system satırında yalnızca Duplicate ve Set as default', async ({
    page,
  }) => {
    await settings(page)
    await page.goto('/t3')
    await expect(page.locator('.dt-row[data-index="0"]')).toBeVisible()
    await expect(trigger(page)).toHaveText('Gebze · this week')
    await expect(page.locator('.dt-chip')).toHaveCount(2)
    await trigger(page).click()
    await expect(menu(page)).toContainText('My views')
    await expect(menu(page)).not.toContainText('Shared')
    await expect(row(page, 'Gebze · this week')).toContainText('Default')
    await row(page, 'Late orders').hover()
    await row(page, 'Late orders').locator('.dt-view-more').click()
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toHaveCount(0)
    await expect(page.getByRole('menu')).toContainText('System views offer only')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await trigger(page).click()
    await row(page, 'Rush orders').hover()
    await row(page, 'Rush orders').locator('.dt-view-more').click()
    await page.getByRole('menuitem', { name: 'Duplicate' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Name')).toHaveValue('Rush orders copy')
    await expect(dialog).toContainText('Value ↓')
    await dialog.getByRole('button', { name: 'Save view' }).click()
    await expect(trigger(page)).toHaveText('Rush orders copy')
    await expect(page.locator('.dt-head-cell[data-col="value"]')).toHaveAttribute('aria-sort', 'descending')
  })
})
