<script setup lang="ts">
// Telefon Filters alt sayfası (04 §9, handoff 04 §6.1–6.2, T13-04/05): uygulanmış filtreler · Suggested · Add filter · Sort ·
// Show results. Değişiklikler taslakta birikir ve Show results'la tek seferde uygulanır (masaüstündeki anında uygulamadan
// farklı). Değer editörü ve sütun seçici aynı sayfanın alt seviyeleridir (geri okuyla döner).
import {
  PhArrowDown,
  PhArrowUp,
  PhCaretDown,
  PhCaretLeft,
  PhCaretRight,
  PhMagnifyingGlass,
  PhPlus,
  PhX,
} from '@phosphor-icons/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed, defineAsyncComponent, ref } from 'vue'
import type { ColumnDef } from '../../types/columns'
import type { FilterOp, SortRule } from '../../types/query'
import type { RemoteLabels } from '../cells/remoteLabels'
import { TYPE_SPECS } from '../cells/specs'
const DateEditor = defineAsyncComponent(() => import('../editors/DateEditor.vue'))
import NumberEditor from '../editors/NumberEditor.vue'
import OptionsEditor from '../editors/OptionsEditor.vue'
import StarEditor from '../editors/StarEditor.vue'
import TextEditor from '../editors/TextEditor.vue'
import { useDataTableContext } from '../plugin'
import Layer from '../ui/Layer.vue'
import {
  changeOperator,
  defaultOperator,
  editorOf,
  isComplete,
  opLabel,
  operatorsOf,
  type Chip,
  type Summary,
} from './model'
import { TYPE_ICONS } from './typeIcons'

const props = defineProps<{
  columns: ColumnDef[]
  chips: Chip[]
  sort: SortRule[]
  rows: object[]
  labels: RemoteLabels
  summaryOf: (chip: Chip) => Summary
  currenciesOf: (def: ColumnDef) => string[]
}>()
const emit = defineEmits<{ apply: [chips: Chip[], sort: SortRule[]] }>()
const { i18n } = useDataTableContext()

const open = ref(false)
const draft = ref<Chip[]>([])
// shortcut: telefonda tek sıralama kuralı; çoklu sıralama masaüstü Display › Sort'ta (ikincil kurallar Show results'ta düşer).
const draftSort = ref<SortRule | null>(null)
const level = ref<'main' | 'editor' | 'picker'>('main')
const editingCol = ref<string | null>(null)
const q = ref('')

const defOf = (id: string) => props.columns.find((c) => c.id === id)
const headerOf = (id: string) => defOf(id)?.header ?? id
const filterable = computed(() => props.columns.filter((c) => c.filterable ?? TYPE_SPECS[c.type].filterable))
const sortable = computed(() => props.columns.filter((c) => c.sortable ?? TYPE_SPECS[c.type].sortable))
const drafted = (id: string) => draft.value.some((c) => c.column === id)
const suggested = computed(() => filterable.value.filter((c) => c.suggested && !drafted(c.id as string)))
const pickable = computed(() =>
  filterable.value.filter(
    (c) => !drafted(c.id as string) && (!q.value || c.header.toLocaleLowerCase().includes(q.value.toLocaleLowerCase())),
  ),
)

/** Açılış: taslak = uygulanan çipler + ilk sıralama kuralı. `column` verilirse doğrudan o sütunun editörü (çip, header hunisi). */
const show = (column?: string) => {
  draft.value = props.chips.map((c) => ({ ...c }))
  draftSort.value = props.sort[0] ?? null
  level.value = 'main'
  editingCol.value = null
  q.value = ''
  open.value = true
  if (column) edit(column)
}
defineExpose({ show })

/** Var olan taslak çipi açar, yoksa varsayılan operatörle oluşturur. boolean'ın editörü yok: dokunuş Yes ↔ No. */
const edit = (column: string) => {
  const def = defOf(column)
  if (!def) return
  const existing = draft.value.find((c) => c.column === column)
  if (def.type === 'boolean') {
    draft.value = existing
      ? draft.value.map((c) => (c === existing ? { ...c, value: !(c.value === true) } : c))
      : [...draft.value, { column, op: defaultOperator(def), value: true }]
    return
  }
  if (!existing) draft.value = [...draft.value, { column, op: defaultOperator(def) }]
  editingCol.value = column
  level.value = 'editor'
}
const editing = computed(() => draft.value.find((c) => c.column === editingCol.value) ?? null)
const editingDef = computed(() => (editingCol.value ? defOf(editingCol.value) : undefined))
const editor = computed(() =>
  editing.value && editingDef.value ? editorOf(editing.value.op, editingDef.value.type) : null,
)
const ops = computed(() => (editingDef.value ? operatorsOf(editingDef.value) : []))
const valueCount = computed(() => (Array.isArray(editing.value?.value) ? editing.value.value.length : 1))
const update = (patch: Partial<Chip>) =>
  (draft.value = draft.value.map((c) => (c.column === editingCol.value ? { ...c, ...patch } : c)))
const setValue = (value: unknown) => {
  const def = editingDef.value!
  update({
    value,
    currency:
      def.type === 'currency' ? (editing.value?.currency ?? props.currenciesOf(def)[0]) : editing.value?.currency,
  })
}
const setOp = (op: FilterOp) =>
  (draft.value = draft.value.map((c) =>
    c.column === editingCol.value ? changeOperator(c, op, editingDef.value!.type) : c,
  ))
/** Kişi listesinde Unassigned: `is_empty` ile değişimli (FilterChip ile aynı). */
const unassigned = () => setOp(editing.value?.op === 'is_empty' ? 'in' : 'is_empty')
const remove = (column: string) => (draft.value = draft.value.filter((c) => c.column !== column))
/** Geri / Done: değer seçilmemiş çip taslaktan düşer (04 §1). */
const back = () => {
  const c = editing.value
  if (c && editingDef.value && !isComplete(c, editingDef.value.type)) remove(c.column)
  editingCol.value = null
  level.value = 'main'
}
const setSortColumn = (column: string) =>
  (draftSort.value = column ? { column, dir: draftSort.value?.dir ?? 'asc' } : null)
const setSortDir = (dir: unknown) => {
  if ((dir === 'asc' || dir === 'desc') && draftSort.value) draftSort.value = { ...draftSort.value, dir }
}
const apply = () => {
  emit(
    'apply',
    draft.value.filter((c) => isComplete(c, defOf(c.column)!.type)),
    draftSort.value ? [draftSort.value] : [],
  )
  open.value = false
}
const title = computed(() =>
  level.value === 'main'
    ? i18n.t('mobile.filters')
    : level.value === 'picker'
      ? i18n.t('filter.addFilter')
      : (editingDef.value?.header ?? ''),
)
</script>

<template>
  <Layer v-model:open="open" sheet content-class="dt-filters-sheet" :title="title">
    <template v-if="level !== 'main'" #head-start>
      <button type="button" class="dt-bsheet-back" :aria-label="i18n.t('mobile.backToFilters')" @click="back">
        <PhCaretLeft :size="20" aria-hidden="true" />
      </button>
    </template>
    <template #head-end>
      <button v-if="level === 'main'" type="button" class="dt-bsheet-action" @click="draft = []">
        {{ i18n.t('filter.clearAll') }}
      </button>
      <button
        v-else-if="level === 'editor'"
        type="button"
        class="dt-bsheet-action"
        :disabled="editing?.value === undefined"
        @click="update({ value: undefined })"
      >
        {{ i18n.t('common.clear') }}
      </button>
    </template>

    <template v-if="level === 'main'">
      <div v-for="c in draft" :key="c.column" class="dt-bsheet-row is-split">
        <button type="button" class="dt-bsheet-row-main" @click="edit(c.column)">
          <span class="dt-bsheet-field">{{ headerOf(c.column) }}</span>
          <span class="dt-bsheet-value is-strong">{{ summaryOf(c).text }}</span>
        </button>
        <button
          type="button"
          class="dt-bsheet-x"
          :aria-label="i18n.t('filter.removeAria', { column: headerOf(c.column) })"
          @click="remove(c.column)"
        >
          <PhX :size="16" aria-hidden="true" />
        </button>
      </div>
      <template v-if="suggested.length">
        <div class="dt-bsheet-label">{{ i18n.t('picker.suggested') }}</div>
        <button v-for="c in suggested" :key="c.id" type="button" class="dt-bsheet-row" @click="edit(c.id as string)">
          <span class="dt-bsheet-field">{{ c.header }}</span>
          <span class="dt-bsheet-value">{{ i18n.t('common.any') }}</span>
          <PhCaretRight :size="16" aria-hidden="true" />
        </button>
      </template>
      <button type="button" class="dt-bsheet-row is-accent" @click="level = 'picker'">
        <PhPlus :size="18" aria-hidden="true" />
        {{ i18n.t('filter.addFilter') }}
      </button>
      <div class="dt-bsheet-sep" />
      <div class="dt-bsheet-label">{{ i18n.t('mobile.sort') }}</div>
      <div class="dt-bsheet-row is-sort">
        <label class="dt-select dt-bsheet-select">
          <select
            :value="draftSort?.column ?? ''"
            :aria-label="i18n.t('mobile.sort')"
            @change="setSortColumn(($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ i18n.t('common.empty') }}</option>
            <option v-for="c in sortable" :key="c.id" :value="c.id">{{ c.header }}</option>
          </select>
          <PhCaretDown :size="14" aria-hidden="true" />
        </label>
        <ToggleGroupRoot
          class="dt-seg dt-bsheet-dir"
          type="single"
          :model-value="draftSort?.dir ?? ''"
          :disabled="!draftSort"
          @update:model-value="setSortDir"
        >
          <ToggleGroupItem class="dt-seg-item" value="asc" :aria-label="i18n.t('header.sortAsc')">
            <PhArrowUp :size="16" aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem class="dt-seg-item" value="desc" :aria-label="i18n.t('header.sortDesc')">
            <PhArrowDown :size="16" aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroupRoot>
      </div>
    </template>

    <template v-else-if="level === 'picker'">
      <label class="dt-input has-icon dt-bsheet-search">
        <span class="dt-input-icon"><PhMagnifyingGlass :size="16" aria-hidden="true" /></span>
        <input v-model="q" type="search" :placeholder="i18n.t('picker.search')" :aria-label="i18n.t('picker.search')" />
      </label>
      <button v-for="c in pickable" :key="c.id" type="button" class="dt-bsheet-row" @click="edit(c.id as string)">
        <component :is="TYPE_ICONS[c.type]" :size="16" class="dt-bsheet-icon" aria-hidden="true" />
        {{ c.header }}
      </button>
      <div v-if="!pickable.length" class="dt-options-empty">{{ i18n.t('picker.noMatch') }}</div>
    </template>

    <div v-else-if="editing && editingDef" class="dt-bsheet-editor">
      <label class="dt-select dt-bsheet-select">
        <select
          :value="editing.op"
          :aria-label="i18n.t('mobile.operator')"
          @change="setOp(($event.target as HTMLSelectElement).value as FilterOp)"
        >
          <option v-for="op in ops" :key="op" :value="op">{{ opLabel(i18n, op, editingDef.type, valueCount) }}</option>
        </select>
        <PhCaretDown :size="14" aria-hidden="true" />
      </label>
      <OptionsEditor
        v-if="editor === 'options'"
        :column="editingDef"
        :op="editing.op"
        :model-value="Array.isArray(editing.value) ? (editing.value as Array<string | number>) : []"
        :rows="rows"
        :labels="labels"
        @update:model-value="setValue"
        @unassigned="unassigned"
      />
      <TextEditor
        v-else-if="editor === 'text'"
        :column="editingDef"
        :op="editing.op"
        :model-value="editing.value"
        @update:model-value="setValue"
        @done="back"
      />
      <NumberEditor
        v-else-if="editor === 'number'"
        :column="editingDef"
        :op="editing.op"
        :model-value="editing.value"
        :currency="editing.currency"
        :currencies="currenciesOf(editingDef)"
        @update:model-value="setValue"
        @update:currency="(c) => update({ currency: c })"
        @done="back"
      />
      <StarEditor
        v-else-if="editor === 'star'"
        :column="editingDef"
        :model-value="editing.value"
        @update:model-value="setValue"
        @done="back"
      />
      <DateEditor
        v-else-if="editor === 'date'"
        :op="editing.op"
        :model-value="editing.value"
        @update:model-value="setValue"
        @done="back"
      />
    </div>

    <template #foot>
      <button v-if="level === 'editor'" type="button" class="dt-bsheet-primary" @click="back">
        {{ i18n.t('common.done') }}
      </button>
      <button v-else type="button" class="dt-bsheet-primary" @click="apply">
        {{ i18n.t('mobile.showResults') }}
      </button>
    </template>
  </Layer>
</template>
