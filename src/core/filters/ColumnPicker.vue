<script setup lang="ts">
// Column picker (04 §2, handoff 03 §3.2, T2-01): arama (odaklı) + Filtered (“opens its chip”, D2) · Suggested (≤ 4) · All columns.
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxRoot,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import type { ColumnDef } from '../../types/columns'
import { TYPE_SPECS, typeLabelKey } from '../cells/specs'
import { useDataTableContext } from '../plugin'
import type { Chip } from './model'
import { TYPE_ICONS } from './typeIcons'

const props = defineProps<{ columns: ColumnDef[]; chips: Chip[] }>()
const emit = defineEmits<{ pick: [columnId: string] }>()
const open = defineModel<boolean>('open', { default: false })
const { i18n } = useDataTableContext()
const q = ref('')
watch(open, (o) => {
  if (!o) q.value = ''
})

const filterable = computed(() => props.columns.filter((c) => c.filterable ?? TYPE_SPECS[c.type].filterable))
const match = (c: ColumnDef) => !q.value || c.header.toLocaleLowerCase().includes(q.value.toLocaleLowerCase())
const filtered = computed(() =>
  props.chips
    .map((ch) => filterable.value.find((c) => c.id === ch.column))
    .filter((c): c is ColumnDef => !!c && match(c)),
)
const chipped = computed(() => new Set(props.chips.map((c) => c.column)))
const suggested = computed(() =>
  filterable.value.filter((c) => c.suggested && !chipped.value.has(c.id as string) && match(c)).slice(0, 4),
)
const rest = computed(() => {
  const taken = new Set([...chipped.value, ...suggested.value.map((c) => c.id as string)])
  return filterable.value.filter((c) => !taken.has(c.id as string) && match(c))
})
const empty = computed(() => !filtered.value.length && !suggested.value.length && !rest.value.length)
// Seçimle kapanınca odak tetikleyiciye dönmez: açılan çip editörü alır (08 §2 · Popover). Esc'te döner.
let picked = false
const pick = (id: unknown) => {
  if (typeof id !== 'string') return
  picked = true
  open.value = false
  emit('pick', id)
}
const onCloseAutoFocus = (e: Event) => {
  if (picked) e.preventDefault()
  picked = false
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child><slot name="trigger" /></PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="dt-pop dt-picker" align="start" :side-offset="4" @close-auto-focus="onCloseAutoFocus">
        <ListboxRoot
          :model-value="undefined"
          selection-behavior="replace"
          highlight-on-hover
          @update:model-value="pick"
        >
          <label class="dt-input has-icon dt-picker-search">
            <span class="dt-input-icon"><PhMagnifyingGlass :size="14" aria-hidden="true" /></span>
            <ListboxFilter
              v-model="q"
              auto-focus
              :placeholder="i18n.t('picker.search')"
              :aria-label="i18n.t('picker.search')"
            />
          </label>
          <ListboxContent class="dt-picker-list" :aria-label="i18n.t('display.columns')">
            <ListboxGroup v-if="filtered.length">
              <ListboxGroupLabel class="dt-pop-label">{{ i18n.t('picker.filtered') }}</ListboxGroupLabel>
              <ListboxItem v-for="c in filtered" :key="c.id" :value="c.id" class="dt-picker-item">
                <component :is="TYPE_ICONS[c.type]" :size="14" aria-hidden="true" />
                <span class="dt-picker-name">{{ c.header }}</span>
                <span class="dt-picker-hint">{{ i18n.t('picker.filteredHint') }}</span>
              </ListboxItem>
            </ListboxGroup>
            <ListboxGroup v-if="suggested.length">
              <ListboxGroupLabel class="dt-pop-label">{{ i18n.t('picker.suggested') }}</ListboxGroupLabel>
              <ListboxItem v-for="c in suggested" :key="c.id" :value="c.id" class="dt-picker-item">
                <component :is="TYPE_ICONS[c.type]" :size="14" aria-hidden="true" />
                <span class="dt-picker-name">{{ c.header }}</span>
                <span class="dt-picker-hint">{{ i18n.t(typeLabelKey(c.type)) }}</span>
              </ListboxItem>
            </ListboxGroup>
            <ListboxGroup v-if="rest.length">
              <ListboxGroupLabel class="dt-pop-label">{{ i18n.t('picker.allColumns') }}</ListboxGroupLabel>
              <ListboxItem v-for="c in rest" :key="c.id" :value="c.id" class="dt-picker-item">
                <component :is="TYPE_ICONS[c.type]" :size="14" aria-hidden="true" />
                <span class="dt-picker-name">{{ c.header }}</span>
                <span class="dt-picker-hint">{{ i18n.t(typeLabelKey(c.type)) }}</span>
              </ListboxItem>
            </ListboxGroup>
            <div v-if="empty" class="dt-options-empty">{{ i18n.t('picker.noMatch') }}</div>
          </ListboxContent>
        </ListboxRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
