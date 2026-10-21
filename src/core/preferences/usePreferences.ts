// Kişisel tercihler (05 §9, 04 D5): yoğunluk, dikey çizgiler, sayfa boyutu — görünüme değil, tableId başına tercihe yazılır.
// Adapter yoksa oturumluk; adapter varsa `get` (senkron ya da Promise) uygulanır, her değişiklik `set` ile gider.
import { reactive, toValue, type MaybeRefOrGetter } from 'vue'
import type { Density, TableId } from '../../types/core'
import type { Preferences, PreferencesAdapter } from '../../types/views'

export interface PreferenceDefaults {
  density: Density
  verticalLines: boolean
  pageSize: number
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
  }
  if (adapter) {
    const got = adapter.get(id())
    if (got instanceof Promise) void got.then(apply).catch(() => {})
    else apply(got)
  }

  const set = (patch: Partial<PreferenceDefaults>) => {
    Object.assign(prefs, patch)
    if (adapter) void Promise.resolve(adapter.set(id(), patch)).catch(() => {})
  }

  return {
    prefs,
    set,
    reset: () => set({ ...defaults }),
    /** Arayüz "Saved for you only" notunu yalnızca kalıcı depoda gösterir. */
    persistent: adapter !== null,
  }
}
