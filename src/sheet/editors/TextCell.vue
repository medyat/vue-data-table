<script setup lang="ts">
// Metin hücre editörü (07 §5, T11-07): hücrenin yerinde input; `text` tipinde daha yüksek kutu (⇧↵ yeni satır). Değer
// her tuşta çözümlenir ve yayılır; Enter/Tab/Esc'i sheet yönetir (editör sözleşmesi: props { modelValue, row, column }).
import { onMounted, ref } from 'vue'
import type { ColumnDef } from '../../types/columns'
import { inputText, parseInput } from '../parse'
import { focusEnd, useParseEnv } from './useParseEnv'

const props = defineProps<{ modelValue: unknown; row: object; column: ColumnDef }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
const env = useParseEnv()
const el = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const text = ref(inputText(props.column, props.modelValue))
onMounted(() => focusEnd(el.value))
const onInput = () => {
  text.value = el.value!.value
  emit('update:modelValue', parseInput(props.column, text.value, env()))
}
</script>

<template>
  <textarea
    v-if="column.type === 'text'"
    ref="el"
    class="dt-cell-input is-multiline"
    :value="text"
    :aria-label="column.header"
    rows="3"
    @input="onInput"
  />
  <input
    v-else
    ref="el"
    class="dt-cell-input"
    type="text"
    :value="text"
    :aria-label="column.header"
    autocomplete="off"
    @input="onInput"
  />
</template>
