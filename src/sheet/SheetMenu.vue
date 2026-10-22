<script setup lang="ts">
// Hücre menüsü (07 §9, T11-03, 236 px): sağ tıklanan noktada (reka ContextMenu; kök ızgara tetikleyici). Cut · Copy ·
// Paste · Fill down · Clear · ─ · Insert row above / below · Remove from list (⌘−, nötr, D12) · ─ · Open {entity}
// (yalnızca sunucuda var olan satırlar, yeni sekmede). Kısayollar mono.
import { ContextMenuContent, ContextMenuItem, ContextMenuPortal, ContextMenuSeparator } from 'reka-ui'
import { FILL_KBD, REMOVE_KBD, mac } from '../core/interaction/kbd'
import { useDataTableContext } from '../core/plugin'
import type { Plural } from '../types/core'
import type { SheetApi } from './useSheetEditing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any
defineProps<{
  sheet: SheetApi<AnyRow>
  entity: Plural
  href?: string
  /** Kaydederken ve salt okunurken yazan öğeler pasif. */
  readOnly: boolean
}>()
const { i18n } = useDataTableContext()
const K = { cut: mac ? '⌘X' : 'Ctrl+X', copy: mac ? '⌘C' : 'Ctrl+C', paste: mac ? '⌘V' : 'Ctrl+V', clear: 'Del' }
</script>

<template>
  <ContextMenuPortal>
    <ContextMenuContent class="dt-menu dt-sheet-menu">
      <ContextMenuItem class="dt-menu-item" :disabled="readOnly" @select="sheet.copyToClipboard(true)">
        {{ i18n.t('sheet.menu.cut') }}
        <kbd class="dt-kbd">{{ K.cut }}</kbd>
      </ContextMenuItem>
      <ContextMenuItem class="dt-menu-item" @select="sheet.copyToClipboard(false)">
        {{ i18n.t('sheet.menu.copy') }}
        <kbd class="dt-kbd">{{ K.copy }}</kbd>
      </ContextMenuItem>
      <ContextMenuItem class="dt-menu-item" :disabled="readOnly" @select="sheet.pasteFromClipboard()">
        {{ i18n.t('sheet.menu.paste') }}
        <kbd class="dt-kbd">{{ K.paste }}</kbd>
      </ContextMenuItem>
      <ContextMenuItem class="dt-menu-item" :disabled="readOnly" @select="sheet.fillDown()">
        {{ i18n.t('sheet.menu.fillDown') }}
        <kbd class="dt-kbd">{{ FILL_KBD }}</kbd>
      </ContextMenuItem>
      <ContextMenuItem class="dt-menu-item" :disabled="readOnly" @select="sheet.clearCells()">
        {{ i18n.t('sheet.menu.clear') }}
        <kbd class="dt-kbd">{{ K.clear }}</kbd>
      </ContextMenuItem>
      <ContextMenuSeparator class="dt-menu-sep" />
      <ContextMenuItem class="dt-menu-item" :disabled="readOnly" @select="sheet.insertRow('above')">
        {{ i18n.t('sheet.menu.insertAbove') }}
      </ContextMenuItem>
      <ContextMenuItem class="dt-menu-item" :disabled="readOnly" @select="sheet.insertRow('below')">
        {{ i18n.t('sheet.menu.insertBelow') }}
      </ContextMenuItem>
      <ContextMenuItem class="dt-menu-item" :disabled="readOnly" @select="sheet.removeSelectedRows()">
        {{ i18n.t('sheet.menu.remove') }}
        <kbd class="dt-kbd">{{ REMOVE_KBD }}</kbd>
      </ContextMenuItem>
      <template v-if="href">
        <ContextMenuSeparator class="dt-menu-sep" />
        <ContextMenuItem as-child class="dt-menu-item">
          <a :href="href" target="_blank" rel="noopener">{{ i18n.t('sheet.menu.open', { entity }) }}</a>
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenuPortal>
</template>
