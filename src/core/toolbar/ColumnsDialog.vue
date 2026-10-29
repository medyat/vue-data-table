<script setup lang="ts">
// Manage columns dialog'u (05 §5, D45): solda konumsal sabitleme (ilk / son 0–2 sütun), sağda bul · liste (tutamaç · göster/gizle).
// Taslak üzerinde çalışır: Save tek seferde uygular, kapatmak ya da Cancel hiçbir şeyi değiştirmez. Sıralama @dnd-kit ile
// sürükle-bırak; klavye ve ekran okuyucu duyuruları kütüphanenin Accessibility eklentisinden, metinler i18n'den (D22 revize).
import { Accessibility, type Draggable } from '@dnd-kit/dom'
import {
  DragDropProvider,
  type DragDropProviderProps,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/vue'
import { isSortable } from '@dnd-kit/vue/sortable'
import { PhLock, PhMagnifyingGlass } from '@phosphor-icons/vue'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupRoot,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import type { ColumnDef } from '../../types/columns'
import { useDataTableContext } from '../plugin'
import ColumnsDialogRow from './ColumnsDialogRow.vue'

export interface PanelColumn {
  id: string
  def: ColumnDef
  visible: boolean
  pinned: 'start' | 'end' | null
  canHide: boolean
  /** Her zaman sola sabit (birincil, sheet anahtarı): listede kilitli, taşınmaz, gizlenmez. */
  fixed: boolean
}
export interface ColumnsDraft {
  order: string[]
  visible: string[]
  start: number
  end: number
}

const props = defineProps<{
  columns: PanelColumn[]
  /** Telefonda sabitleme uygulanmaz (05 §11); sol bölüm gizlenir. */
  phone?: boolean
}>()
const emit = defineEmits<{
  save: [draft: ColumnsDraft]
  /** Açan popover/sayfa kapandığı için odağı nereye döndüreceğine çağıran karar verir. */
  closeAutoFocus: [e: Event]
}>()
const open = defineModel<boolean>('open', { default: false })
const { i18n } = useDataTableContext()

const PIN_COUNTS = [0, 1, 2] as const
const rows = ref<PanelColumn[]>([])
const start = ref(0)
const end = ref(0)
const find = ref('')
const pinCount = (side: 'start' | 'end') =>
  Math.min(2, props.columns.filter((c) => c.pinned === side && c.visible && !c.fixed).length)
watch(
  open,
  (o) => {
    if (!o) return
    rows.value = props.columns.map((c) => ({ ...c }))
    start.value = pinCount('start')
    end.value = pinCount('end')
    find.value = ''
  },
  { immediate: true },
)

const fixedRows = computed(() => rows.value.filter((c) => c.fixed))
const matches = (c: PanelColumn) =>
  !find.value || c.def.header.toLocaleLowerCase().includes(find.value.toLocaleLowerCase())
const listed = computed(() => rows.value.filter((c) => !c.fixed && matches(c)))
/** Kaydedilince sabitlenecek sütunlar: listede raptiye ile gösterilir. */
const willPin = computed(() => {
  if (props.phone) return new Set<string>()
  const free = rows.value.filter((c) => c.visible && !c.fixed).map((c) => c.id)
  const left = free.slice(0, start.value)
  return new Set([...left, ...(end.value ? free.slice(left.length).slice(-end.value) : [])])
})
const hideable = computed(() => rows.value.filter((c) => c.canHide && !c.fixed))
const allShown = computed(() => hideable.value.every((c) => c.visible))

/** Bırakınca taslak sırası güncellenir (arama yokken listed = sabit olmayan tüm satırlar). */
const onDragEnd = ({ operation: { source }, canceled }: DragEndEvent) => {
  if (canceled || !isSortable(source) || source.initialIndex === source.index) return
  const list = [...listed.value]
  const [moved] = list.splice(source.initialIndex, 1)
  list.splice(source.index, 0, moved!)
  rows.value = [...fixedRows.value, ...list]
}
const nameOf = (id: unknown) => rows.value.find((c) => c.id === id)?.def.header ?? String(id)
const at = ({ source }: { source: Draggable | null }) =>
  source && isSortable(source)
    ? { column: nameOf(source.id), position: source.index + 1, total: listed.value.length }
    : undefined
const plugins: DragDropProviderProps['plugins'] = (defaults) => [
  ...defaults.filter((p) => p !== Accessibility),
  Accessibility.configure({
    screenReaderInstructions: { draggable: i18n.t('columns.dragInstructions') },
    announcements: {
      dragstart: ({ operation }: DragStartEvent) => (at(operation) ? i18n.t('columns.dragStart', at(operation)) : undefined),
      // Kütüphanenin varsayılanı gibi: hedef kaynağın kendisiyse (yer değişmedi) duyurma.
      dragover: ({ operation }: DragOverEvent) =>
        at(operation) && operation.target?.id !== operation.source?.id
          ? i18n.t('columns.dragOver', at(operation))
          : undefined,
      dragend: ({ operation, canceled }: DragEndEvent) =>
        at(operation) ? i18n.t(canceled ? 'columns.dragCancel' : 'columns.dragEnd', at(operation)) : undefined,
    },
  }),
]
const toggleAll = () => {
  const v = !allShown.value
  for (const c of hideable.value) c.visible = v
}
const save = () => {
  emit('save', {
    order: rows.value.map((c) => c.id),
    visible: rows.value.filter((c) => c.visible).map((c) => c.id),
    start: props.phone ? pinCount('start') : start.value,
    end: props.phone ? pinCount('end') : end.value,
  })
  open.value = false
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="dt-scrim" />
      <DialogContent class="dt-dialog dt-cols-dialog" :class="{ 'is-phone': phone }" :aria-describedby="undefined"
        @close-auto-focus="(e: Event) => emit('closeAutoFocus', e)"
      >
        <DialogTitle class="dt-sr-only">{{ i18n.t('display.columns') }}</DialogTitle>
        <div class="dt-cols-body">
          <div v-if="!phone" class="dt-cols-pins">
            <section v-for="side in ['start', 'end'] as const" :key="side" class="dt-cols-section">
              <h3 :id="`dt-cols-${side}`" class="dt-cols-title">{{ i18n.t(`columns.pin.${side}.title`) }}</h3>
              <p class="dt-cols-desc">{{ i18n.t(`columns.pin.${side}.desc`) }}</p>
              <RadioGroupRoot
                class="dt-radio-group"
                :aria-labelledby="`dt-cols-${side}`"
                :model-value="side === 'start' ? start : end"
                @update:model-value="(v) => (side === 'start' ? (start = Number(v)) : (end = Number(v)))"
              >
                <label v-for="n in PIN_COUNTS" :key="n" class="dt-radio-row">
                  <RadioGroupItem class="dt-radio" :value="n">
                    <RadioGroupIndicator class="dt-radio-dot" />
                  </RadioGroupItem>
                  {{ i18n.t(`columns.pin.${side}.${n}`) }}
                </label>
              </RadioGroupRoot>
            </section>
          </div>
          <section class="dt-cols-section dt-cols-main">
            <h3 class="dt-cols-title">
              {{ i18n.t('columns.title') }}
              <span class="dt-pop-value">
                {{ i18n.t('columns.shownOf', { shown: rows.filter((c) => c.visible).length, total: rows.length }) }}
              </span>
            </h3>
            <p class="dt-cols-desc">{{ i18n.t('columns.desc') }}</p>
            <label class="dt-input has-icon dt-cols-find">
              <span class="dt-input-icon"><PhMagnifyingGlass :size="14" aria-hidden="true" /></span>
              <input
                v-model="find"
                type="search"
                :placeholder="i18n.t('columns.find')"
                :aria-label="i18n.t('columns.find')"
              />
            </label>
            <ul class="dt-cols-list">
              <template v-if="!find">
                <li v-for="c in fixedRows" :key="c.id" class="dt-col-row is-fixed">
                  <span class="dt-col-name">
                    <span>{{ c.def.header }}</span>
                    <span v-if="c.def.description" class="dt-col-desc">{{ c.def.description }}</span>
                  </span>
                  <PhLock :size="14" class="dt-col-lock" :aria-label="i18n.t('columns.alwaysShown')" />
                </li>
              </template>
              <DragDropProvider :plugins="plugins" @drag-end="onDragEnd">
                <ColumnsDialogRow
                  v-for="(c, i) in listed"
                  :key="c.id"
                  :column="c"
                  :index="i"
                  :disabled="!!find"
                  :pinned="willPin.has(c.id)"
                  @update:visible="(v) => (c.visible = v)"
                />
              </DragDropProvider>
            </ul>
          </section>
        </div>
        <div class="dt-cols-foot">
          <button type="button" class="dt-btn" @click="toggleAll">
            {{ i18n.t(allShown ? 'columns.hideAll' : 'columns.showAll') }}
          </button>
          <span class="dt-pop-end" />
          <DialogClose as-child>
            <button type="button" class="dt-btn">{{ i18n.t('common.cancel') }}</button>
          </DialogClose>
          <button type="button" class="dt-btn dt-btn-primary" @click="save">{{ i18n.t('common.save') }}</button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
