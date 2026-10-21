// Kişisel tercihler (05 §9, 04 §8, D5): yoğunluk, dikey çizgiler, sayfa boyutu, varsayılan görünüm — görünüme değil, tableId
// başına tercihe yazılır.
// Adapter yoksa oturumluk; adapter varsa `get` (senkron ya da Promise) uygulanır, her değişiklik `set` ile gider.
import { reactive, toValue, type MaybeRefOrGetter } from 'vue'
import type { Density, TableId } from '../../types/core'
import type { Preferences, PreferencesAdapter } from '../../types/views'

export interface PreferenceDefaults {
  density: Density
  verticalLines: boolean
  pageSize: number
  defaultViewId: string | null
}

export function usePreferences(
  tableId: MaybeRefOrGetter<TableId>,
  adapter: PreferencesAdapter | null,
  defaults: PreferenceDefaults,
) {
  const prefs = reactive<PreferenceDefaults>({ ...defaults })
  const id = () => toValue(tableId)

  const apply = (p: Partial<Preferences> | undefined) => {
    if (!p) return
    if (p.density) prefs.density = p.density
    if (typeof p.verticalLines === 'boolean') prefs.verticalLines = p.verticalLines
    if (typeof p.pageSize === 'number') prefs.pageSize = p.pageSize
    if ('defaultViewId' in p) prefs.defaultViewId = p.defaultViewId ?? null
  }
  let ready: Promise<void> = Promise.resolve()
  if (adapter) {
    const got = adapter.get(id())
    if (got instanceof Promise) ready = got.then(apply).catch(() => {})
    else apply(got)
  }

  const set = (patch: Partial<PreferenceDefaults>) => {
    Object.assign(prefs, patch)
    if (adapter) void Promise.resolve(adapter.set(id(), patch)).catch(() => {})
  }

  return {
    prefs,
    set,
    /** Display › Reset: ekran ayarları; varsayılan görünüm seçimi kalır (görünüm menüsünden yönetilir). */
    reset: () => set({ density: defaults.density, verticalLines: defaults.verticalLines, pageSize: defaults.pageSize }),
    /** Adapter'ın `get`'i çözülünce (senkron adapter'da hemen). */
    ready,
    /** Arayüz "Saved for you only" notunu yalnızca kalıcı depoda gösterir. */
    persistent: adapter !== null,
  }
}
