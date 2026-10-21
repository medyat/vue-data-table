<script setup lang="ts">
// Toolbar araması (04 §5, D3): çip üretmez; 250 ms debounce; Esc önce temizler, ikinci Esc odaktan çıkar; `/` dışarıdan odaklar.
import { PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useDataTableContext } from '../plugin'

const props = defineProps<{ modelValue: string; placeholder: string; collapsed?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { i18n } = useDataTableContext()

const input = ref<HTMLInputElement | null>(null)
const draft = ref(props.modelValue)
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.modelValue,
  (v) => (draft.value = v),
)
const commit = (value: string, immediate = false) => {
  draft.value = value
  clearTimeout(timer)
  if (immediate) emit('update:modelValue', value)
  else timer = setTimeout(() => emit('update:modelValue', value), 250)
}
onBeforeUnmount(() => clearTimeout(timer))

const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  e.preventDefault()
  if (draft.value) commit('', true)
  else input.value?.blur()
}
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <label class="dt-input dt-search has-icon" :class="{ 'is-collapsed': collapsed && !draft }">
    <span class="dt-input-icon"><PhMagnifyingGlass :size="16" aria-hidden="true" /></span>
    <input
      ref="input"
      type="search"
      :value="draft"
      :placeholder="placeholder"
      :aria-label="placeholder"
      autocomplete="off"
      @input="commit(($event.target as HTMLInputElement).value)"
      @keydown="onKeydown"
    />
    <span class="dt-input-end">
      <button
        v-if="draft"
        type="button"
        class="dt-input-clear"
        :aria-label="i18n.t('common.clear')"
        @click="commit('', true)"
      >
        <PhX :size="14" aria-hidden="true" />
      </button>
      <kbd v-else class="dt-kbd" aria-hidden="true">/</kbd>
    </span>
  </label>
</template>
