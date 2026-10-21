<script setup lang="ts">
// Filtre çipi (04 §3, handoff 02 §5): `[ikon] Alan · operatör · değer │ ×` — iki tıklama hedefi. Gövde değer popover'ını
// açar (üstte operatör menüsü, tipe göre editör, altta durum + Clear); `boolean`'da popover yok, tıklama Yes ↔ No.
import { PhCaretDown, PhCheck, PhX } from '@phosphor-icons/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { computed } from 'vue'
import type { ColumnDef } from '../../types/columns'
import type { FilterOp } from '../../types/query'
import type { RemoteLabels } from '../cells/remoteLabels'
import { avatar } from '../cells/renderCell'
import DateEditor from '../editors/DateEditor.vue'
import NumberEditor from '../editors/NumberEditor.vue'
import OptionsEditor from '../editors/OptionsEditor.vue'
import StarEditor from '../editors/StarEditor.vue'
import TextEditor from '../editors/TextEditor.vue'
import { useDataTableContext } from '../plugin'
import { changeOperator, isComplete, opLabel, operatorsOf, shapeOf, type Chip, type Summary } from './model'
import { TYPE_ICONS } from './typeIcons'

const props = defineProps<{
  chip: Chip
  column: ColumnDef
  editing: boolean
  summary: Summary
  rows: object[]
  labels: RemoteLabels
  currencies: string[]
}>()
const emit = defineEmits<{ 'update:chip': [chip: Chip]; remove: []; 'update:editing': [open: boolean] }>()
const { i18n } = useDataTableContext()

const type = computed(() => props.column.type)
const shape = computed(() => shapeOf(props.chip.op, type.value))
const complete = computed(() => isComplete(props.chip, type.value))
const isBoolean = computed(() => type.value === 'boolean')
const valueCount = computed(() => (Array.isArray(props.chip.value) ? props.chip.value.length : 1))
const opText = computed(() => opLabel(i18n, props.chip.op, type.value, valueCount.value))
const ops = computed(() => operatorsOf(props.column))
const people = computed(() => props.summary.people?.slice(0, 3) ?? [])
const tip = computed(() =>
  props.summary.full && props.summary.full !== props.summary.text ? props.summary.full : undefined,
)
const aria = computed(() =>
  complete.value
    ? i18n.t('filter.valueAria', { column: props.column.header, op: opText.value, value: props.summary.text })
    : i18n.t('filter.chooseValueAria', { column: props.column.header }),
)
/** Editör: liste şekli `id`'de metin (yapıştırılan liste), diğerlerinde seçenek listesi. */
const editor = computed(() => {
  const s = shape.value
  if (s === 'none' || s === 'boolean') return null
  if (s === 'list') return type.value === 'id' ? 'text' : 'options'
  if (s === 'text') return 'text'
  if (s === 'date' || s === 'dateRange') return 'date'
  if (type.value === 'star') return 'star'
  return 'number'
})
const status = computed(() => {
  if (editor.value === 'options' && valueCount.value && Array.isArray(props.chip.value) && props.chip.value.length)
    return i18n.t('option.selected', { count: props.chip.value.length })
  if (shape.value === 'range') return i18n.t('number.boundsIncluded')
  if (shape.value === 'dateRange') return i18n.t('date.presetsRelative')
  return ''
})

const update = (patch: Partial<Chip>) => emit('update:chip', { ...props.chip, ...patch })
const setValue = (value: unknown) =>
  update({
    value,
    currency: type.value === 'currency' ? (props.chip.currency ?? props.currencies[0]) : props.chip.currency,
  })
const setOp = (op: FilterOp) => emit('update:chip', changeOperator(props.chip, op, type.value))
const isMe = () => emit('update:chip', { ...props.chip, op: 'in', value: ['@me'] })
/** Kişi listesinde Unassigned: `is_empty` ile değişimli (boş değer `in` listesinde taşınamaz). */
const unassigned = () => (props.chip.op === 'is_empty' ? setOp('in') : setOp('is_empty'))
const clear = () => update({ value: undefined })
const close = () => emit('update:editing', false)
/** Picker / header menüsü kapanırken odak kendi tetikleyicisine döner; bu "dışarı odak" yeni açılan editörü kapatmasın. */
const onFocusOutside = (e: CustomEvent<{ originalEvent: FocusEvent }>) => {
  const t = e.detail.originalEvent.target
  if (t instanceof Element && t.closest('.dt-filter-trigger, .dt-head-menu, .dt-head-filtered')) e.preventDefault()
}
const toggleBool = () => update({ value: !(props.chip.value === true) })
</script>

<template>
  <span class="dt-chip" :class="{ 'is-editing': editing, 'is-incomplete': !complete }" :data-col="chip.column">
    <PopoverRoot v-if="!isBoolean" :open="editing" @update:open="(o) => emit('update:editing', o)">
      <PopoverTrigger as-child>
        <button type="button" class="dt-chip-body" :aria-label="aria">
          <component :is="TYPE_ICONS[type]" :size="14" class="dt-chip-icon" aria-hidden="true" />
          <span class="dt-chip-field">{{ column.header }}</span>
          <span class="dt-chip-op">{{ opText }}</span>
          <span
            v-if="shape !== 'none'"
            class="dt-chip-value"
            :class="{ 'is-placeholder': !complete }"
            :data-dt-tip="tip"
          >
            <template v-if="complete && people.length">
              <span class="dt-chip-avatars">
                <component
                  :is="() => avatar({ value: p.value, label: p.label })"
                  v-for="p in people"
                  :key="String(p.value)"
                />
              </span>
            </template>
            {{ complete ? summary.text : i18n.t('filter.selectValue') }}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          class="dt-pop dt-chip-pop"
          :class="`is-${editor ?? 'none'}`"
          align="start"
          :side-offset="4"
          @focus-outside="onFocusOutside"
        >
          <div class="dt-chip-pop-head">
            <span class="dt-chip-pop-field">{{ column.header }}</span>
            <DropdownMenuRoot>
              <DropdownMenuTrigger as-child>
                <button type="button" class="dt-op-btn">
                  {{ opText }}
                  <PhCaretDown :size="12" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent class="dt-menu dt-op-menu" align="start" :side-offset="6">
                  <DropdownMenuItem v-if="type === 'user'" class="dt-menu-item" @select="isMe">
                    {{ i18n.t('op.isMe') }}
                  </DropdownMenuItem>
                  <template v-for="op in ops" :key="op">
                    <DropdownMenuSeparator v-if="op === 'is_empty'" class="dt-menu-sep" />
                    <DropdownMenuItem
                      class="dt-menu-item"
                      :class="{ 'is-selected': op === chip.op }"
                      @select="setOp(op)"
                    >
                      {{ opLabel(i18n, op, type, valueCount) }}
                      <PhCheck v-if="op === chip.op" :size="14" class="dt-pop-end" aria-hidden="true" />
                    </DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenuRoot>
          </div>
          <div v-if="editor" class="dt-chip-pop-body">
            <OptionsEditor
              v-if="editor === 'options'"
              :column="column"
              :op="chip.op"
              :model-value="Array.isArray(chip.value) ? (chip.value as Array<string | number>) : []"
              :rows="rows"
              :labels="labels"
              @update:model-value="setValue"
              @unassigned="unassigned"
            />
            <TextEditor
              v-else-if="editor === 'text'"
              :column="column"
              :op="chip.op"
              :model-value="chip.value"
              @update:model-value="setValue"
              @done="close"
            />
            <NumberEditor
              v-else-if="editor === 'number'"
              :column="column"
              :op="chip.op"
              :model-value="chip.value"
              :currency="chip.currency"
              :currencies="currencies"
              @update:model-value="setValue"
              @update:currency="(c) => update({ currency: c })"
              @done="close"
            />
            <StarEditor
              v-else-if="editor === 'star'"
              :column="column"
              :model-value="chip.value"
              @update:model-value="setValue"
              @done="close"
            />
            <DateEditor v-else :op="chip.op" :model-value="chip.value" @update:model-value="setValue" @done="close" />
          </div>
          <div class="dt-pop-foot">
            <span>{{ status }}</span>
            <button type="button" class="dt-pop-action" :disabled="chip.value === undefined" @click="clear">
              {{ i18n.t('common.clear') }}
            </button>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
    <button v-else type="button" class="dt-chip-body" :aria-label="aria" @click="toggleBool">
      <component :is="TYPE_ICONS[type]" :size="14" class="dt-chip-icon" aria-hidden="true" />
      <span class="dt-chip-field">{{ column.header }}</span>
      <span class="dt-chip-op">{{ opText }}</span>
      <span class="dt-chip-value">{{ summary.text }}</span>
    </button>
    <button
      type="button"
      class="dt-chip-remove"
      :aria-label="i18n.t('filter.removeAria', { column: column.header })"
      @click="emit('remove')"
    >
      <PhX :size="12" aria-hidden="true" />
    </button>
  </span>
</template>
