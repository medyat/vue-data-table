<script setup lang="ts">
// "Save with errors" dialog'u (07 §14, handoff 06 §10, T12-01): hatalı satırlar gönderilmez; Fix first (ilk odak)
// Errors görünümüne geçip ilk hataya gider, "Save N rows" kalanını teslim eder. `alertdialog`, 480 px.
import { PhWarningCircle } from '@phosphor-icons/vue'
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import { useDataTableContext } from '../core/plugin'

export interface ErrorRowItem {
  rowNo: number
  key: string
  message: string
}
defineProps<{
  /** Hatalı satırlar (gutter sırasıyla). */
  errors: ErrorRowItem[]
  /** Gönderilecek satır sayısı. */
  okRows: number
}>()
const emit = defineEmits<{ fix: []; save: [] }>()
const open = defineModel<boolean>('open', { default: false })
const { i18n } = useDataTableContext()
const save = () => {
  emit('save')
  open.value = false
}
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="dt-scrim" />
      <AlertDialogContent class="dt-dialog dt-dialog-errors">
        <AlertDialogTitle class="dt-dialog-title">
          {{ i18n.t('sheet.errDialog.title', { count: errors.length }) }}
        </AlertDialogTitle>
        <AlertDialogDescription class="dt-dialog-body">
          {{ i18n.t('sheet.errDialog.body', { count: okRows }) }}
        </AlertDialogDescription>
        <ul class="dt-error-list">
          <li v-for="e in errors.slice(0, 8)" :key="e.rowNo" class="dt-error-row">
            <PhWarningCircle :size="14" aria-hidden="true" />
            <span class="dt-error-no">{{ e.rowNo }}</span>
            <span class="dt-mono">{{ e.key }}</span>
            <span class="dt-error-msg">{{ e.message }}</span>
          </li>
        </ul>
        <div class="dt-dialog-actions">
          <AlertDialogCancel class="dt-btn" @click="emit('fix')">{{ i18n.t('sheet.errDialog.fix') }}</AlertDialogCancel>
          <button type="button" class="dt-btn dt-btn-primary" :disabled="!okRows" @click="save">
            {{ i18n.t('sheet.errDialog.save', { count: okRows }) }}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
