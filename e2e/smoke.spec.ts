// Faz 0 kabul kriteri: playground'da tema, yoğunluk ve dil anahtarı.
import { expect, test } from '@playwright/test'

test('tema, yoğunluk ve dil anahtarları çalışır', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')

  await page.getByTestId('theme').selectOption('dark-class')
  await expect(html).toHaveClass(/\bdark\b/)
  await expect(html).toHaveCSS('color-scheme', /.*/) // sayfa ayakta
  await page.getByTestId('theme').selectOption('dark-attr')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(html).not.toHaveClass(/\bdark\b/)

  await page.getByTestId('density').selectOption('compact')
  await expect(page.getByTestId('stage')).toHaveAttribute('data-density', 'compact')

  await expect(page.getByTestId('locale-sample')).toHaveText('1,284.5')
  await expect(page.getByTestId('i18n-sample')).toHaveText('No orders match these 3 filters')
  await page.getByTestId('locale').selectOption('tr')
  await expect(page.getByTestId('locale-sample')).toHaveText('1.284,5')
  await expect(page.getByTestId('i18n-sample')).toHaveText('Bu 3 filtreye uyan order yok')
})
