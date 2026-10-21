<script setup lang="ts" generic="Row extends object">
// DataSheet (07, brief §8, handoff 06) — Faz 6a: ızgara, editörler, doğrulama, taslak deposu; toolbar'da Display + Save
// kontrolleri; formül çubuğu; status bar sayaçları; açılış ilerlemesi + skeleton; `maxRows` şeridi. Pano / doldurma /
// undo / Find (6b), satır partisi, sıralama, filtreler ve kayıt teslimi (6c), içe/dışa aktarma ve telefon düzeni (6d)
// sonraki fazlarda. Veri çekmez, kaydetmez (D18): yalnızca `@save` yayar; `rows` dizisine dokunmaz.
import { PhCheck, PhWarning } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, type Component } from 'vue'
import { useColumnLayout } from '../core/columns/useColumnLayout'
import { getFormat } from '../core/format'
import { useDelegatedTooltip } from '../core/grid/useDelegatedTooltip'
import { SAVE_KBD } from '../core/interaction/kbd'
import { useDataTableContext } from '../core/plugin'
import { usePreferences } from '../core/preferences/usePreferences'
import StateMessage from '../core/states/StateMessage.vue'
import DisplayPopover from '../core/toolbar/DisplayPopover.vue'
import ConfirmDialog from '../core/ui/ConfirmDialog.vue'
import { typeLabelKey } from '../core/cells/specs'
import type { ColumnDef, ColumnType } from '../types/columns'
import type { Density, Plural, TableId } from '../types/core'
import type { Progress, SheetChanges, SheetStatus } from '../types/sheet'
import DateCell from './editors/DateCell.vue'
import NumberCell from './editors/NumberCell.vue'
import OptionCell from './editors/OptionCell.vue'
import TextCell from './editors/TextCell.vue'
import { inputText, parseInput } from './parse'
import SheetGrid from './SheetGrid.vue'
import { useSheetEditing, type SheetApi } from './useSheetEditing'
import { useSheetStore } from './useSheetStore'
import { useSheetTable } from './useSheetTable'

const props = withDefaults(
  defineProps<{
    tableId: TableId
    columns: Array<ColumnDef<Row>>
    rows: Row[]
    rowKey?: string
    /** Verilmezse tercihten (Display › Density), o da yoksa compact (02 · Yoğunluk). */
    density?: Density
    entityName?: Plural
    /** Upsert anahtarı olan sütun (ör. "sku"). Yüklenmiş satırlarda salt okunur; `rowKey`'den ayrıdır. */
    keyColumn: string
    /** Uygulama satırları yüklerken; sayaç verilirse "Loading… 6,200 of 10,000". Düzenleme false olunca açılır. */
    loading?: Progress
    /** Aşılırsa ilk `maxRows` satır kullanılır ve şerit uyarır (07 §15). */
    maxRows?: number
    /** Bu genişliğin altında veya yalnızca dokunmatikte salt okunur (D14); karar açılışta. */
    readOnlyBelow?: number
  }>(),
  { rowKey: 'id', loading: false, maxRows: 10_000, readOnlyBelow: 768 },
)
const emit = defineEmits<{
  /** Save: doğrulama geçen değişmiş satırlar. Uygulama kaydeder (6c: `saving`, `applyResult`). */
  save: [changes: SheetChanges]
}>()
defineSlots<{ empty?: () => unknown }>()

const ctx = useDataTableContext()
const { i18n } = ctx
const fmt = getFormat(ctx.locale)
const entity = computed<Plural>(() => props.entityName ?? { one: props.tableId, other: props.tableId })

const pref = usePreferences(() => props.tableId, ctx.preferences, {
  density: props.density ?? 'compact',
  verticalLines: true,
  pageSize: 0,
  defaultViewId: null,
})
const density = computed<Density>(() => props.density ?? pref.prefs.density)

const overLimit = computed(() => props.rows.length > props.maxRows)
const rowsShown = computed(() => (overLimit.value ? props.rows.slice(0, props.maxRows) : props.rows))
const loadingNow = computed(() => props.loading !== false)
const progress = computed(() => (typeof props.loading === 'object' ? props.loading : null))
const percent = computed(() =>
  progress.value && progress.value.total > 0 ? Math.round((100 * progress.value.done) / progress.value.total) : null,
)

// Sütunlar (07 §3): anahtar 128 px sola sabit (mono), birincil ad sola sabit ve esnek; sıra sabit, genişlik oturumluk.
const sheetColumns = computed<Array<ColumnDef<Row>>>(() =>
  props.columns.map((d) =>
    d.id === props.keyColumn ? { ...d, pinned: 'left', width: 128 } : d.primary ? { ...d, pinned: 'left' } : d,
  ),
)
const defById = computed(() => new Map(sheetColumns.value.map((d) => [d.id as string, d])))
const layout = useColumnLayout<Row>({
  columns: sheetColumns,
  rows: rowsShown,
  rowKey: () => props.rowKey,
  flexLastStart: true,
})
const store = useSheetStore<Row>({
  rows: rowsShown,
  columns: sheetColumns,
  rowKey: () => props.rowKey,
  keyColumn: () => props.keyColumn,
  i18n,
})
const table = useSheetTable<Row>({
  rows: rowsShown,
  columnIds: () => layout.columns.value.map((c) => c.id),
  rowId: store.keyOf,
})

// Telefon / yalnızca dokunmatik: salt okunur, karar açılışta (D14; banner ve telefon düzeni 6d).
const readOnlyDevice =
  typeof matchMedia === 'function' &&
  (matchMedia(`(max-width: ${props.readOnlyBelow - 1}px)`).matches ||
    matchMedia('(hover: none) and (pointer: coarse)').matches)

// Editörler filtre değer girişleriyle aynı aileden (07 §5); `boolean` editör açmaz (Space). multiselect/tags/ajax/user/
// object/array için yalnızca özel editör (`ColumnDef.editor`).
const EDITORS: Partial<Record<ColumnType, Component>> = {
  string: TextCell,
  text: TextCell,
  uppercase: TextCell,
  lowercase: TextCell,
  email: TextCell,
  url: TextCell,
  phone: TextCell,
  id: TextCell,
  color: TextCell,
  int: NumberCell,
  float: NumberCell,
  percentage: NumberCell,
  currency: NumberCell,
  star: NumberCell,
  select: OptionCell,
  date: DateCell,
  datetime: DateCell,
}
const editorFor = (def: ColumnDef<Row>): Component | null => def.editor ?? EDITORS[def.type] ?? null
/** Sütunlar varsayılan salt okunur; anahtar sütun yüklenmiş satırlarda her zaman; yüklenirken ve telefonda hiçbiri. */
const canEdit = (row: Row, def: ColumnDef<Row>): boolean =>
  !loadingNow.value &&
  !readOnlyDevice &&
  def.id !== props.keyColumn &&
  (def.type === 'boolean' || !!editorFor(def)) &&
  (typeof def.editable === 'function' ? def.editable(row, { isNew: false }) : def.editable === true)

const parseEnv = () => ({ locale: ctx.locale, today: new Date(), todayWord: i18n.t('date.today') })
const edit = useSheetEditing<Row>({ store, canEdit, parse: (def, text) => parseInput(def, text, parseEnv()) })
const grid = useTemplateRef<InstanceType<typeof SheetGrid>>('grid')
const counts = store.counts

const toggle = (row: Row, def: ColumnDef<Row>) => store.set(row, def, !store.read(row, def))
const clearCells = () => {
  const b = table.bounds.value
  if (!b) return
  const cols = layout.columns.value
  for (let r = b.minRowIndex; r <= b.maxRowIndex; r++) {
    const row = rowsShown.value[r]
    if (!row) continue
    for (let c = b.minColumnIndex; c <= b.maxColumnIndex; c++) {
      const def = cols[c]?.def
      if (def && canEdit(row, def)) store.set(row, def, null)
    }
  }
}
const save = () => {
  edit.commit()
  if (!counts.value.changedCells) return
  emit('save', store.getChanges())
}
/** F8 / ⇧F8 ve status bar "go to": aktif satırdan sonraki/önceki hatalı satırın ilk hatalı hücresi (döngüsel). */
const goToError = (dir: 1 | -1) => {
  const rows = rowsShown.value
  const n = rows.length
  const a = table.active.value
  const from = a ? rows.findIndex((r) => store.keyOf(r) === a.rowId) : -1
  for (let s = 1; s <= n; s++) {
    const i = (((from + dir * s) % n) + n) % n
    const key = store.keyOf(rows[i]!)
    const issues = store.rowIssues(key)
    const col = issues && layout.columns.value.find((c) => issues.get(c.id)?.level === 'error')
    if (!col) continue
    table.focus(key, col.id)
    grid.value?.focusActive()
    return
  }
}
const sheet: SheetApi<Row> = { store, table, edit, canEdit, editorFor, toggle, clearCells, save, goToError }

// Izgara dışına tık onaylar (07 §5): formül çubuğu ve portallı editör katmanları (`dt-sheet-layer`) dışarı sayılmaz.
const onDocPointerdown = (e: PointerEvent) => {
  if (!edit.editing.value) return
  const t = e.target as Element | null
  if (t?.closest('.dt-cell.is-editing, .dt-formula, .dt-sheet-layer')) return
  edit.commit()
}
onMounted(() => document.addEventListener('pointerdown', onDocPointerdown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerdown, true))

// ⌘S odak sheet içindeyken (07 §2); ızgara kendi işlediyse (defaultPrevented) tekrar etmez.
const onRootKeydown = (e: KeyboardEvent) => {
  if (!e.defaultPrevented && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}

// Formül çubuğu (07 §2): ad kutusu, fx, değer (buraya yazmak hücreyi düzenler), ipucu.
const activeRow = computed(() => {
  const a = table.active.value
  return a ? (store.rowByKey(a.rowId) ?? null) : null
})
const activeDef = computed(() => {
  const a = table.active.value
  return a ? (defById.value.get(a.columnId) ?? null) : null
})
const rangeText = computed(() => {
  const b = table.bounds.value
  if (!b) return null
  const rows = b.maxRowIndex - b.minRowIndex + 1
  const cols = b.maxColumnIndex - b.minColumnIndex + 1
  return rows * cols > 1 ? i18n.t('sheet.cells', { rows, cols }) : null
})
const keyDef = computed(() => defById.value.get(props.keyColumn))
const nameKey = computed(() =>
  activeRow.value && keyDef.value ? inputText(keyDef.value, store.read(activeRow.value, keyDef.value)) : '',
)
const formulaText = computed(() => {
  const e = edit.editing.value
  if (e) return e.text ?? inputText(e.def, e.value)
  return activeRow.value && activeDef.value
    ? inputText(activeDef.value, store.read(activeRow.value, activeDef.value))
    : ''
})
const formulaEditable = computed(
  () =>
    !!activeRow.value &&
    !!activeDef.value &&
    activeDef.value.type !== 'boolean' &&
    canEdit(activeRow.value, activeDef.value),
)
const onFormulaInput = (e: Event) => {
  const text = (e.target as HTMLInputElement).value
  const row = activeRow.value
  const def = activeDef.value
  if (!row || !def || !formulaEditable.value) return
  if (!edit.editing.value && !edit.start(row, def, { inCell: false })) return
  edit.setValue(parseInput(def, text, parseEnv()), text, false)
}
const onFormulaKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (edit.commit()) table.move('down')
    grid.value?.focusActive()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    edit.cancel()
    grid.value?.focusActive()
  }
}
const hint = computed(() => {
  const d = activeDef.value
  if (!d) return ''
  const parts = [i18n.t(typeLabelKey(d.type))]
  if (d.type === 'currency' && typeof d.currency === 'string') parts.push(d.currency)
  if (d.required) parts.push(i18n.t('sheet.required').toLocaleLowerCase(ctx.locale))
  if (d.hint) parts.push(d.hint)
  return parts.join(' · ')
})
const valueAria = computed(() =>
  activeDef.value ? i18n.t('sheet.valueAria', { column: activeDef.value.header, key: nameKey.value }) : '',
)

const status = computed<SheetStatus>(() => ({
  phase: loadingNow.value ? 'loading' : 'ready',
  ...counts.value,
  newRows: 0,
}))
const changesText = computed(() =>
  counts.value.changedCells
    ? i18n.t('sheet.changes', { cells: fmt.int(counts.value.changedCells), rows: fmt.int(counts.value.changedRows) })
    : i18n.t('sheet.noChanges'),
)
const saveTip = `${i18n.t('sheet.save')} · ${SAVE_KBD}`

const discardOpen = ref(false)
const discard = () => {
  edit.cancel()
  store.reset()
  grid.value?.focusActive()
}

const displayProps = computed(() => ({
  density: density.value,
  verticalLines: pref.prefs.verticalLines,
  columns: layout.panel.value,
  counts: layout.counts.value,
  persistent: pref.persistent,
}))
const displayOn = {
  'update:density': (d: Density) => pref.set({ density: d }),
  'update:verticalLines': (on: boolean) => pref.set({ verticalLines: on }),
  'column-visible': (id: string, visible: boolean) => layout.setVisible(id, visible),
  'column-move': (id: string, delta: -1 | 1) => layout.move(id, delta),
  'columns-all': (visible: boolean) => {
    for (const c of layout.panel.value) if (!c.pinned && c.canHide) layout.setVisible(c.id, visible)
  },
  'columns-reset': () => layout.reset(),
  reset: () => pref.reset(),
}

const rootEl = ref<HTMLElement | null>(null)
const tooltip = useDelegatedTooltip(rootEl)

defineExpose({
  status,
  isDirty: () => counts.value.changedCells > 0,
  getChanges: store.getChanges,
  reset: discard,
  goToNextError: () => goToError(1),
})
</script>

<template>
  <div ref="rootEl" class="dt dt-sheet" :data-density="density" @keydown="onRootKeydown">
    <div class="dt-toolbar dt-sheet-toolbar" role="toolbar">
      <div v-if="loadingNow" class="dt-progress-strip">
        <strong>{{ i18n.t('sheet.loading', { entity }) }}</strong>
        <span v-if="progress" class="dt-progress-count">
          {{ i18n.t('sheet.loadingCount', { loaded: fmt.int(progress.done), total: fmt.int(progress.total) }) }}
        </span>
        <div
          class="dt-progress"
          :class="{ 'is-indeterminate': percent === null }"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="percent ?? undefined"
        >
          <div class="dt-progress-fill" :style="percent !== null ? { width: `${percent}%` } : undefined" />
        </div>
      </div>
      <DisplayPopover v-else v-bind="displayProps" v-on="displayOn" />
      <span class="dt-toolbar-spacer" />
      <span class="dt-sheet-changes" :class="{ 'is-empty': !counts.changedCells }">
        <span v-if="counts.changedCells" class="dt-sheet-dot" aria-hidden="true" />
        {{ changesText }}
      </span>
      <button type="button" class="dt-btn dt-btn-ghost" :disabled="!counts.changedCells" @click="discardOpen = true">
        {{ i18n.t('sheet.discard') }}
      </button>
      <button
        type="button"
        class="dt-btn dt-btn-primary has-icon dt-sheet-save"
        :disabled="!counts.changedCells"
        :data-dt-tip="saveTip"
        @click="save"
      >
        <PhCheck :size="16" aria-hidden="true" />
        {{ i18n.t('sheet.save') }}
      </button>
    </div>

    <div v-if="overLimit" class="dt-strip dt-sheet-strip" role="status">
      <PhWarning :size="16" aria-hidden="true" />
      <span>{{ i18n.t('sheet.firstN', { max: fmt.int(maxRows), entity }) }}</span>
    </div>

    <div class="dt-formula">
      <div class="dt-formula-name">
        <template v-if="rangeText">{{ rangeText }}</template>
        <template v-else-if="activeDef">
          <span class="dt-mono">{{ nameKey }}</span>
          <span class="dt-formula-col">· {{ activeDef.header }}</span>
        </template>
      </div>
      <span class="dt-formula-fx" aria-hidden="true">fx</span>
      <input
        class="dt-formula-value"
        type="text"
        :value="formulaText"
        :readonly="!formulaEditable"
        :aria-label="valueAria"
        autocomplete="off"
        @input="onFormulaInput"
        @keydown="onFormulaKeydown"
      />
      <span v-if="hint" class="dt-formula-hint">{{ hint }}</span>
    </div>

    <SheetGrid
      ref="grid"
      :sheet="sheet"
      :layout="layout"
      :rows="rowsShown"
      :density="density"
      :label="entity.other"
      :loading="loadingNow"
      :skeleton="loadingNow"
      :vertical-lines="pref.prefs.verticalLines"
      :key-column="keyColumn"
    >
      <template v-if="!loadingNow && rowsShown.length === 0" #state>
        <slot name="empty">
          <StateMessage kind="empty" :title="i18n.t('state.emptyTitle', { entity })" />
        </slot>
      </template>
    </SheetGrid>

    <div class="dt-status" role="status" :aria-label="i18n.t('sheet.statusAria')">
      <span class="dt-status-rows">
        {{ loadingNow ? i18n.t('common.loading') : i18n.t('sheet.rows', { count: fmt.int(rowsShown.length) }) }}
      </span>
      <template v-if="!loadingNow">
        <span v-if="counts.changedCells" class="dt-status-changes">
          <span class="dt-mark is-changed" aria-hidden="true" />
          {{ changesText }}
        </span>
        <span v-else class="dt-status-muted">{{ changesText }}</span>
        <button v-if="counts.errorRows" type="button" class="dt-status-errors" @click="goToError(1)">
          <span class="dt-mark is-error" aria-hidden="true" />
          {{ i18n.t('sheet.errorsGoTo', { count: counts.errorRows }) }}
        </button>
      </template>
    </div>

    <div v-show="tooltip.open.value" class="dt-tip" role="tooltip" :style="tooltip.style.value">
      {{ tooltip.text.value }}
    </div>
    <ConfirmDialog
      v-model:open="discardOpen"
      :title="i18n.t('sheet.discard.title', { cells: fmt.int(counts.changedCells), rows: fmt.int(counts.changedRows) })"
      :body="i18n.t('sheet.discard.body')"
      :confirm-label="i18n.t('sheet.leave.discard')"
      danger
      @confirm="discard"
    />
  </div>
</template>
