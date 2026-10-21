<script setup lang="ts" generic="Row extends object">
// DataTable (05) — Faz 1: kart + ızgara. Toolbar, filtre satırı, footer ve durumlar Faz 2'de; seçim ve satır menüsü Faz 4'te.
import { computed } from 'vue'
import GridRoot from '../core/grid/GridRoot.vue'
import { useDataTableContext } from '../core/plugin'
import type { ColumnDef, Density, Plural, TableId } from '../types'

const props = withDefaults(
  defineProps<{
    tableId: TableId
    columns: Array<ColumnDef<Row>>
    rows: Row[]
    rowKey?: string
    density?: Density
    entityName?: Plural
    loading?: boolean
    /** Biliniyorsa toplam (aria-rowcount). */
    total?: number
  }>(),
  { rowKey: 'id', density: 'standard', loading: false },
)
const emit = defineEmits<{
  'row-click': [row: Row, event: MouseEvent]
  'row-open': [row: Row]
}>()

const { i18n } = useDataTableContext()
const ariaLabel = computed(() => props.entityName?.other ?? props.tableId)
</script>

<template>
  <div class="dt dt-list" :data-density="density">
    <GridRoot
      :columns="columns"
      :rows="rows"
      :row-key="rowKey"
      :density="density"
      :label="ariaLabel"
      :loading="loading"
      :row-count="total ?? -1"
      @row-click="(row, e) => emit('row-click', row as Row, e)"
      @row-enter="(row) => emit('row-open', row as Row)"
    />
    <span class="dt-sr-only" aria-live="polite">{{ loading ? '' : i18n.t('sr.loaded', { count: rows.length }) }}</span>
  </div>
</template>
