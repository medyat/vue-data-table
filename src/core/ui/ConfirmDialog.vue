<script setup lang="ts">
// Onay dialog'u (brief §5.7, handoff 02 §6, 08): `alertdialog`, 460 px, ilk odak güvenli buton (Cancel), yıkıcı buton kırmızı.
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import { useDataTableContext } from '../plugin'

defineProps<{ title: string; body?: string; confirmLabel: string; cancelLabel?: string; danger?: boolean }>()
const emit = defineEmits<{ confirm: [] }>()
const open = defineModel<boolean>('open', { default: false })
const { i18n } = useDataTableContext()
/** Önce onay, sonra kapanış: kapanış dinleyicisi (update:open) onaydan önce çalışıp bağlamı silmesin. */
const confirm = () => {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="dt-scrim" />
      <AlertDialogContent class="dt-dialog dt-dialog-confirm">
        <AlertDialogTitle class="dt-dialog-title">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="body" class="dt-dialog-body">{{ body }}</AlertDialogDescription>
        <div class="dt-dialog-actions">
          <AlertDialogCancel class="dt-btn">{{ cancelLabel ?? i18n.t('common.cancel') }}</AlertDialogCancel>
          <button type="button" class="dt-btn" :class="danger ? 'dt-btn-danger' : 'dt-btn-primary'" @click="confirm">
            {{ confirmLabel }}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
