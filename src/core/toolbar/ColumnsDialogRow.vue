<script setup lang="ts">
// Columns dialog'unda sıralanabilir satır (D22, D45): tutamaçtan fare/dokunmatik sürükleme ve klavye (Space al · ↑↓ · Space bırak · Esc).
// useSortable DragDropProvider'ın alt bileşeninde çağrılmak zorunda; bu yüzden satır ayrı bileşen.
import { PhDotsSixVertical, PhPushPin } from '@phosphor-icons/vue'
import { useSortable } from '@dnd-kit/vue/sortable'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { ref } from 'vue'
import { useDataTableContext } from '../plugin'
import type { PanelColumn } from './ColumnsDialog.vue'

const props = defineProps<{
  column: PanelColumn
  index: number
  /** Arama süzerken sıralama kapalı: süzülmüş listede taşımak gizli satırların yerini belirsizleştirir. */
  disabled: boolean
  /** Kaydedilince sabitlenecek. */
  pinned: boolean
}>()
const emit = defineEmits<{ 'update:visible': [visible: boolean] }>()
const { i18n } = useDataTableContext()

const element = ref<HTMLElement | null>(null)
const handle = ref<HTMLElement | null>(null)
const { isDragSource } = useSortable({
  id: () => props.column.id,
  index: () => props.index,
  disabled: () => props.disabled,
  element,
  handle,
})
</script>

<template>
  <li
    ref="element"
    class="dt-col-row"
    :class="{ 'is-hidden': !column.visible, 'is-dragging': isDragSource }"
    :data-col="column.id"
  >
    <button
      ref="handle"
      type="button"
      class="dt-icon-btn-xs dt-col-handle"
      :disabled="disabled"
      :aria-label="i18n.t('columns.reorder', { column: column.def.header })"
    >
      <PhDotsSixVertical :size="16" weight="bold" aria-hidden="true" />
    </button>
    <span class="dt-col-name">
      <span>
        {{ column.def.header }}
        <PhPushPin v-if="pinned" :size="12" class="dt-col-pin" :aria-label="i18n.t('columns.pinned')" />
      </span>
      <span v-if="column.def.description" class="dt-col-desc">{{ column.def.description }}</span>
    </span>
    <SwitchRoot
      class="dt-switch dt-col-switch"
      :model-value="column.visible"
      :disabled="!column.canHide"
      :aria-label="column.def.header"
      @update:model-value="(v) => emit('update:visible', v)"
    >
      <SwitchThumb class="dt-switch-thumb" />
    </SwitchRoot>
  </li>
</template>
