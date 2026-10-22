<script setup lang="ts">
// Sayı / para / yüzde hücre editörü (07 §5, T11-07): sağa yaslı; "2240", "2.240,00", "2,240.00" yerel ayara göre okunur,
// "%20"/"20%" → 20. Sabit para kodu ve "%" soluk sağda. Çözülemeyen metin ham kalır (hata, kayıttan önce).
import { computed, onMounted, ref } from 'vue'
import type { ColumnDef } from '../../types/columns'
import { inputText, parseInput } from '../parse'
import { focusEnd, useParseEnv } from './useParseEnv'

const props = defineProps<{ modelValue: unknown; row: object; column: ColumnDef }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
const env = useParseEnv()
const el = ref<HTMLInputElement | null>(null)
const text = ref(inputText(props.column, props.modelValue))
const suffix = computed(() => {
  const c = props.column
  return c.type === 'currency' && typeof c.currency === 'string' ? c.currency : c.type === 'percentage' ? '%' : ''
})
onMounted(() => focusEnd(el.value))
const onInput = () => {
  text.value = el.value!.value
  emit('update:modelValue', parseInput(props.column, text.value, env()))
}
</script>

<template>
  <span class="dt-cell-editor is-number">
    <input
      ref="el"
      class="dt-cell-input is-right"
      type="text"
      inputmode="decimal"
      :value="text"
      :aria-label="column.header"
      autocomplete="off"
      @input="onInput"
    />
    <span v-if="suffix" class="dt-ccy" aria-hidden="true">{{ suffix }}</span>
  </span>
</template>
