<script setup lang="ts">
// Filtre satırı (04 §4, D29): tek satır — çipler → Add filter; sağda Clear all sabit. Sığmayan çipler yatay kayar,
// sağ kenarda solma; düzenlenen / yeni eklenen çip görünür alana kaydırılır. Add filter kayan alanın dışında: çipler sığarken
// son çipin yanında, taşınca sağda. Sarma ve `+N more` yok (D2 çip sayısını sınırlar).
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ColumnDef } from '../../types/columns'
import type { RemoteLabels } from '../cells/remoteLabels'
import { useDataTableContext } from '../plugin'
import FilterChip from './FilterChip.vue'
import type { Chip, Summary } from './model'

const props = defineProps<{
  chips: Chip[]
  defs: ReadonlyMap<string, ColumnDef>
  editing: string | null
  rows: object[]
  labels: RemoteLabels
  summaryOf: (chip: Chip) => Summary
  currenciesOf: (def: ColumnDef) => string[]
}>()
const emit = defineEmits<{
  'update:chip': [chip: Chip]
  remove: [column: string]
  'update:editing': [column: string | null]
  'clear-all': []
}>()
const { i18n } = useDataTableContext()
const defOf = (column: string) => props.defs.get(column)!
/** Sütun id'sinde nokta olabilir: seçici yerine dataset karşılaştırması (jsdom'da CSS.escape yok). */
const chipEl = (column: string | undefined) =>
  column
    ? [...(row.value?.querySelectorAll<HTMLElement>('.dt-chip') ?? [])].find((el) => el.dataset.col === column)
    : undefined

const row = ref<HTMLElement | null>(null)
const scrolledEnd = ref(false)
const onScroll = () => {
  const el = row.value
  if (el) scrolledEnd.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}
let ro: ResizeObserver | undefined
onMounted(() => {
  onScroll()
  if (typeof ResizeObserver !== 'undefined' && row.value) {
    ro = new ResizeObserver(onScroll)
    ro.observe(row.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
watch(
  () => [props.chips.length, props.editing],
  () =>
    void nextTick(() => {
      onScroll()
      const target = props.editing ?? props.chips.at(-1)?.column
      chipEl(target)?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
    }),
)

/** × sonrası odak sonraki çipe, yoksa Add filter'a (04 §3). */
const remove = (column: string) => {
  const i = props.chips.findIndex((c) => c.column === column)
  const next = props.chips[i + 1]?.column
  emit('remove', column)
  void nextTick(() => {
    const el =
      chipEl(next)?.querySelector<HTMLElement>('.dt-chip-body') ??
      row.value?.parentElement?.querySelector<HTMLElement>('.dt-filter-add')
    el?.focus()
  })
}
</script>

<template>
  <div class="dt-filter-row" :class="{ 'is-scrolled-end': scrolledEnd }">
    <div ref="row" class="dt-chips" @scroll.passive="onScroll">
      <FilterChip
        v-for="c in chips"
        :key="c.column"
        :chip="c"
        :column="defOf(c.column)"
        :editing="editing === c.column"
        :summary="summaryOf(c)"
        :rows="rows"
        :labels="labels"
        :currencies="currenciesOf(defOf(c.column))"
        @update:chip="(chip) => emit('update:chip', chip)"
        @update:editing="(open) => emit('update:editing', open ? c.column : null)"
        @remove="remove(c.column)"
      />
    </div>
    <slot name="add" />
    <button type="button" class="dt-btn dt-btn-ghost dt-filter-clear" @click="emit('clear-all')">
      {{ i18n.t('filter.clearAll') }}
    </button>
  </div>
</template>
