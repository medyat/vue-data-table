<script setup lang="ts">
// More ⋯ menüsü (05 §3): yalnızca uygulamanın dinlediği olaylar ve verilen ayarlar; Refresh `R`, Auto-refresh switch.
// Telefonda yerini ⋯ alt sayfası (PhoneMoreSheet) alır.
import { PhDotsThree } from '@phosphor-icons/vue'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from 'reka-ui'
import { useDataTableContext } from '../plugin'

const props = defineProps<{
  refresh: boolean
  /** Export menü etiketi ("Export 100 rows" / "Export 3 selected rows"); false → yok. */
  export: string | false
  import: boolean
  print: boolean
  /** `autoRefresh` prop'u verilmişse switch görünür. */
  autoRefresh: boolean
  autoRefreshOn: boolean
}>()
const emit = defineEmits<{
  refresh: []
  export: [format: 'csv' | 'xlsx']
  import: []
  print: []
  'update:autoRefreshOn': [on: boolean]
}>()
const { i18n } = useDataTableContext()
const hasActions = () => props.export || props.import || props.print
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="dt-btn dt-btn-icon"
        :aria-label="i18n.t('toolbar.more')"
        :data-dt-tip="i18n.t('toolbar.more')"
      >
        <PhDotsThree :size="16" weight="bold" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="dt-menu dt-more-menu" align="end" :side-offset="4">
        <DropdownMenuSub v-if="$props.export">
          <DropdownMenuSubTrigger class="dt-menu-item">{{ $props.export }}</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent class="dt-menu" :side-offset="4">
              <DropdownMenuItem class="dt-menu-item" @select="emit('export', 'csv')">
                {{ i18n.t('toolbar.csv') }}
              </DropdownMenuItem>
              <DropdownMenuItem class="dt-menu-item" @select="emit('export', 'xlsx')">
                {{ i18n.t('toolbar.xlsx') }}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem v-if="$props.import" class="dt-menu-item" @select="emit('import')">
          {{ i18n.t('toolbar.import') }}
        </DropdownMenuItem>
        <DropdownMenuItem v-if="print" class="dt-menu-item" @select="emit('print')">
          {{ i18n.t('toolbar.print') }}
        </DropdownMenuItem>
        <DropdownMenuSeparator v-if="hasActions() && (refresh || autoRefresh)" class="dt-menu-sep" />
        <DropdownMenuItem v-if="refresh" class="dt-menu-item" @select="emit('refresh')">
          {{ i18n.t('toolbar.refresh') }}
          <kbd class="dt-kbd">R</kbd>
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem
          v-if="autoRefresh"
          class="dt-menu-item"
          :model-value="autoRefreshOn"
          @update:model-value="(v) => emit('update:autoRefreshOn', v === true)"
        >
          {{ i18n.t('toolbar.autoRefresh') }}
          <span class="dt-switch dt-pop-end" :data-state="autoRefreshOn ? 'checked' : 'unchecked'" aria-hidden="true">
            <span class="dt-switch-thumb" />
          </span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
