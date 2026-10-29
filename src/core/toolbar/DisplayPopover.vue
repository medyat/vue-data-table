<script setup lang="ts">
// Display popover'ı (05 §3, §5; T3-06, T4-04/05): Density · Vertical grid lines · Columns › · Saved for you only + Reset.
// Telefonda yerini ⋯ alt sayfası (PhoneMoreSheet) alır. Columns › dialog'u açar (D45). Sort › yok: sıralama header'dan.
import { PhCaretRight, PhSlidersHorizontal } from '@phosphor-icons/vue'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  SwitchRoot,
  SwitchThumb,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui'
import { defineAsyncComponent, ref } from 'vue'
import type { Density } from '../../types/core'
import { useDataTableContext } from '../plugin'
import type { ColumnsDraft, PanelColumn } from './ColumnsDialog.vue'

// Dialog ve @dnd-kit yalnızca Columns ilk açılışta yüklenir; sonra bağlı kalır (odak dönüşü).
const ColumnsDialog = defineAsyncComponent(() => import('./ColumnsDialog.vue'))
const columnsUsed = ref(false)

defineProps<{
  density: Density
  verticalLines: boolean
  columns: PanelColumn[]
  counts: { shown: number; total: number }
  /** Tercih deposu varsa "Saved for you only". */
  persistent: boolean
  iconOnly?: boolean
}>()
const emit = defineEmits<{
  'update:density': [density: Density]
  'update:verticalLines': [on: boolean]
  'columns-save': [draft: ColumnsDraft]
  reset: []
}>()
const open = defineModel<boolean>('open', { default: false })

const { i18n } = useDataTableContext()
const DENSITIES: Density[] = ['comfortable', 'standard', 'compact']
const columnsOpen = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const openColumns = () => {
  open.value = false
  columnsUsed.value = true
  columnsOpen.value = true
}
/** Popover kapandığı için odak Display düğmesine döner. */
const focusTrigger = (e: Event) => {
  e.preventDefault()
  trigger.value?.focus()
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        ref="trigger"
        type="button"
        class="dt-btn has-icon"
        :class="{ 'dt-btn-icon': iconOnly }"
        :aria-label="i18n.t('toolbar.display')"
        :data-dt-tip="iconOnly ? i18n.t('toolbar.display') : undefined"
      >
        <PhSlidersHorizontal :size="16" aria-hidden="true" />
        <span v-if="!iconOnly">{{ i18n.t('toolbar.display') }}</span>
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="dt-pop dt-display" align="end" :side-offset="4">
          <div class="dt-pop-label">{{ i18n.t('display.density') }}</div>
          <ToggleGroupRoot
            class="dt-seg dt-seg-sm dt-display-density"
            type="single"
            :model-value="density"
            @update:model-value="(v) => v && emit('update:density', v as Density)"
          >
            <ToggleGroupItem v-for="d in DENSITIES" :key="d" class="dt-seg-item" :value="d">
              {{ i18n.t(`display.${d}`) }}
            </ToggleGroupItem>
          </ToggleGroupRoot>
          <label class="dt-pop-item">
            {{ i18n.t('display.verticalLines') }}
            <SwitchRoot
              class="dt-switch dt-pop-end"
              :model-value="verticalLines"
              @update:model-value="(v) => emit('update:verticalLines', v)"
            >
              <SwitchThumb class="dt-switch-thumb" />
            </SwitchRoot>
          </label>
          <div class="dt-pop-sep" />
          <button type="button" class="dt-pop-item" @click="openColumns">
            {{ i18n.t('display.columns') }}
            <span class="dt-pop-value">{{ i18n.t('columns.shownOf', counts) }}</span>
            <PhCaretRight :size="14" aria-hidden="true" />
          </button>
          <div class="dt-pop-foot">
            <span>{{ persistent ? i18n.t('display.savedForYou') : '' }}</span>
            <button type="button" class="dt-pop-action" @click="emit('reset')">{{ i18n.t('common.reset') }}</button>
          </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
  <ColumnsDialog
    v-if="columnsUsed"
    v-model:open="columnsOpen"
    :columns="columns"
    @save="(d) => emit('columns-save', d)"
    @close-auto-focus="focusTrigger"
  />
</template>
