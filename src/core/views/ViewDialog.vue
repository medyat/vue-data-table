<script setup lang="ts">
// Save as new view (04 §7, handoff 03 §4.2, T3-04) ve Rename: Name (odaklı; Duplicate'ten "{ad} copy" seçili), özet,
// Make this my default view. Enter kaydeder; hata alanın altında.
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { ref, watch } from 'vue'
import { useDataTableContext } from '../plugin'
import type { NameError } from './model'

const props = defineProps<{
  mode: 'create' | 'rename'
  name: string
  /** Yalnızca create: Filters / Sort / Columns satırları. */
  summary: { filters: string; sort: string; columns: string } | null
  validate: (name: string) => NameError | null
}>()
const emit = defineEmits<{ save: [input: { name: string; makeDefault: boolean }] }>()
const open = defineModel<boolean>('open', { default: false })
const { i18n } = useDataTableContext()

const name = ref(props.name)
const makeDefault = ref(false)
const error = ref<NameError | null>(null)
const input = ref<HTMLInputElement | null>(null)
watch(open, (o) => {
  if (!o) return
  name.value = props.name
  makeDefault.value = false
  error.value = null
})
const focusName = (e: Event) => {
  e.preventDefault()
  input.value?.focus()
  input.value?.select()
}
const submit = () => {
  error.value = props.validate(name.value)
  if (error.value) return
  emit('save', { name: name.value.trim(), makeDefault: makeDefault.value })
  open.value = false
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="dt-scrim" />
      <DialogContent class="dt-dialog dt-view-dialog" @open-auto-focus="focusName">
        <form @submit.prevent="submit">
          <DialogTitle class="dt-dialog-title">
            {{ i18n.t(mode === 'rename' ? 'views.rename' : 'views.dialogTitle') }}
          </DialogTitle>
          <DialogDescription v-if="mode === 'create'" class="dt-dialog-body">
            {{ i18n.t('views.dialogBody') }}
          </DialogDescription>
          <label class="dt-field">
            <span class="dt-field-label">{{ i18n.t('views.name') }}</span>
            <span class="dt-input">
              <input ref="input" v-model="name" type="text" :aria-invalid="error ? 'true' : undefined" />
            </span>
            <span v-if="error" class="dt-field-error" role="alert">{{ i18n.t(`views.err.${error}`) }}</span>
          </label>
          <div v-if="summary" class="dt-view-summary">
            <span>{{ i18n.t('views.filters') }}</span>
            <span>{{ summary.filters }}</span>
            <span>{{ i18n.t('views.sort') }}</span>
            <span>{{ summary.sort }}</span>
            <span>{{ i18n.t('views.columns') }}</span>
            <span>{{ summary.columns }}</span>
          </div>
          <template v-if="mode === 'create'">
            <label class="dt-check-row">
              <input v-model="makeDefault" type="checkbox" class="dt-checkbox" />
              {{ i18n.t('views.makeDefault') }}
            </label>
          </template>
          <div class="dt-dialog-actions">
            <DialogClose as-child>
              <button type="button" class="dt-btn">{{ i18n.t('common.cancel') }}</button>
            </DialogClose>
            <button type="submit" class="dt-btn dt-btn-primary">
              {{ i18n.t(mode === 'rename' ? 'common.save' : 'views.save') }}
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
