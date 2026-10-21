import { inject, type App, type InjectionKey, type Plugin } from 'vue'
import type { DataTableOptions } from '../types/plugin'
import type { PreferencesAdapter, ViewsAdapter } from '../types/views'
import { createI18n, type I18n } from './i18n'

export interface DataTableContext {
  locale: string
  i18n: I18n
  /** null → yalnızca `views` prop'undaki görünümler, kaydetme yok (01 · plugin). */
  viewsAdapter: ViewsAdapter | null
  /** null → tercihler oturumluk; arayüz "kaydedildi" demez. */
  preferences: PreferencesAdapter | null
}

export const DATA_TABLE_KEY: InjectionKey<DataTableContext> = Symbol('swors:data-table')

export function createContext(options: DataTableOptions = {}): DataTableContext {
  const i18n = createI18n({ locale: options.locale, messages: options.messages })
  return {
    locale: i18n.locale,
    i18n,
    viewsAdapter: options.viewsAdapter ?? null,
    preferences: options.preferences ?? null,
  }
}

/** app.use(createDataTable({ locale: 'tr', viewsAdapter, preferences })) */
export function createDataTable(options: DataTableOptions = {}): Plugin {
  return {
    install(app: App) {
      app.provide(DATA_TABLE_KEY, createContext(options))
    },
  }
}

let fallback: DataTableContext | undefined

/** Bileşen içinden bağlam. Plugin kurulmamışsa varsayılanlar: navigator.language, paket metinleri, adapter yok. */
export function useDataTableContext(): DataTableContext {
  return inject(DATA_TABLE_KEY, null) ?? (fallback ??= createContext())
}
