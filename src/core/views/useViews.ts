// Görünümler (04 §7, D4, D5, D30): `views` prop'u (system) + adapter (personal) birleşimi, açılış seçimi, düzenlenmiş
// durum (bellekte, oturum boyu, görünüm başına), kaydet / kopyala / yeniden adlandır / sil. Paket veri çekmez (D18);
// adapter'ı uygulama verir, yoksa kaydetme yoktur.
import { computed, reactive, ref, shallowRef } from 'vue'
import type { TableId } from '../../types/core'
import type { View, ViewPatch, ViewState, ViewsAdapter } from '../../types/views'
import { getFormat } from '../format'
import { byName, defaultView, sameState } from './model'

export interface ViewsOptions {
  tableId: () => TableId
  system: () => View[]
  adapter: ViewsAdapter | null
  locale: () => string
  defaultViewId: () => string | null
  setDefaultViewId: (id: string | null) => void
  /** Tercihler yüklendi; kullanıcı varsayılanı ancak o zaman bilinir. */
  prefsReady: Promise<void>
  /** Tablonun etkin durumu (filtre + sıralama + sütun düzeni). */
  current: () => ViewState
  /** Tek adımda uygular; eksik alanlar tablonun varsayılanı (tek talep). */
  apply: (patch: ViewPatch) => void
  onChange: (view: View) => void
}

export function useViews(o: ViewsOptions) {
  const saved = ref<View[]>([])
  const all = computed(() => [...o.system(), ...saved.value])
  const sections = computed(() => {
    const collator = getFormat(o.locale()).collator()
    return {
      system: o.system(),
      personal: byName(
        saved.value.filter((v) => v.kind === 'personal'),
        collator,
      ),
    }
  })
  const activeId = ref<string | null>(null)
  const active = computed(() => all.value.find((v) => v.id === activeId.value) ?? null)
  /** Uygulandıktan sonraki etkin durum: "edited" bununla karşılaştırılır. */
  const baseline = shallowRef<ViewState | null>(null)
  /** Kaydedilmemiş çalışma kopyaları (görünüm başına); sayfa yenilenince gider. */
  const drafts = reactive(new Map<string, ViewState>())
  const edited = computed(() => !!active.value && !!baseline.value && !sameState(o.current(), baseline.value))
  let touched = false

  const activate = (id: string, keepDraft = true) => {
    const view = all.value.find((v) => v.id === id)
    if (!view) return
    const prev = active.value
    if (prev) {
      if (keepDraft && edited.value) drafts.set(prev.id, o.current())
      else drafts.delete(prev.id)
    }
    activeId.value = id
    o.apply(view.state)
    baseline.value = o.current()
    const draft = drafts.get(id)
    if (draft) o.apply(draft)
    o.onChange(view)
  }

  const initial = defaultView(all.value, o.defaultViewId())
  if (initial) activate(initial.id)
  const listed = o.adapter
    ? o.adapter
        .list(o.tableId())
        .then((vs) => {
          saved.value = vs
        })
        .catch(() => {})
    : Promise.resolve()
  // Kullanıcı varsayılanı kişisel bir görünüm olabilir: liste ve tercih gelince, dokunulmadıysa ona geçilir.
  void Promise.all([listed, o.prefsReady]).then(() => {
    if (touched || edited.value) return
    const v = defaultView(all.value, o.defaultViewId())
    if (v && v.id !== activeId.value) activate(v.id)
  })

  const replace = (next: View) => (saved.value = saved.value.map((v) => (v.id === next.id ? next : v)))
  const writable = (v: View | null) => !!v && !!o.adapter && v.kind !== 'system'

  return {
    all,
    sections,
    active,
    edited,
    hasViews: computed(() => all.value.length > 0),
    hasDraft: (id: string) => drafts.has(id),
    writable,
    select: (id: string) => {
      touched = true
      activate(id)
    },
    saveChanges: async () => {
      const v = active.value
      if (!writable(v) || !o.adapter) return
      replace(await o.adapter.update(o.tableId(), v!.id, { state: o.current() }))
      baseline.value = o.current()
      drafts.delete(v!.id)
    },
    discard: () => {
      const v = active.value
      if (!v) return
      o.apply(v.state)
      baseline.value = o.current()
      drafts.delete(v.id)
    },
    /** Save as new view / New view / Duplicate; kayıt sonrası yeni görünüm aktif. `fromCurrent`: mevcut düzenleme yeni görünüme taşındı. */
    create: async (input: { name: string; state: ViewState; makeDefault: boolean; fromCurrent: boolean }) => {
      if (!o.adapter) return
      const v = await o.adapter.create(o.tableId(), { name: input.name, state: input.state })
      saved.value = [...saved.value, v]
      if (input.makeDefault) o.setDefaultViewId(v.id)
      touched = true
      activate(v.id, !input.fromCurrent)
    },
    rename: async (id: string, name: string) => {
      if (o.adapter) replace(await o.adapter.update(o.tableId(), id, { name }))
    },
    /** Onay sonrası hemen `remove`; aktif silinirse varsayılana, varsayılan silinirse system default'a (04 §7). */
    remove: async (id: string) => {
      if (!o.adapter) return
      await o.adapter.remove(o.tableId(), id)
      saved.value = saved.value.filter((v) => v.id !== id)
      drafts.delete(id)
      if (o.defaultViewId() === id) o.setDefaultViewId(null)
      if (activeId.value === id) {
        activeId.value = null
        baseline.value = null
        const d = defaultView(all.value, o.defaultViewId())
        if (d) activate(d.id)
        else o.apply({})
      }
    },
  }
}
