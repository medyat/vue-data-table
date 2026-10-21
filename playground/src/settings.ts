// Playground'un kendi ayarları: tema, yoğunluk, dil. localStorage'da kalır; dil değişince sayfa yenilenir (plugin locale'i kurulumda alır).
import { reactive, watchEffect } from 'vue'
import type { Density } from '@swors/data-table'

export type Theme = 'light' | 'dark-class' | 'dark-attr'

const KEY = 'pg:settings'
const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<{
  theme: Theme
  density: Density
  locale: string
}>

export const settings = reactive({
  theme: saved.theme ?? ('light' as Theme),
  density: saved.density ?? ('standard' as Density),
  locale: saved.locale ?? 'en',
})

watchEffect(() => {
  localStorage.setItem(KEY, JSON.stringify(settings))
  const html = document.documentElement
  // Paket iki mekanizmayı da destekler (01 · Tema): .dark sınıfı ve data-theme="dark".
  html.classList.toggle('dark', settings.theme === 'dark-class')
  if (settings.theme === 'dark-attr') html.setAttribute('data-theme', 'dark')
  else html.removeAttribute('data-theme')
})

export function setLocale(locale: string) {
  settings.locale = locale
  location.reload()
}
