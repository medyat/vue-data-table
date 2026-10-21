<script setup lang="ts">
// Metin editörü (04 §3): 250 ms sonra ve Enter'da uygular; Enter popover'ı kapatır. `id` sütununda `in`/`not_in` için
// yapıştırılan liste (satır sonu / virgül / noktalı virgül) değer dizisine ayrılır (03); uppercase/lowercase çevirir.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ColumnDef } from '../../types/columns'
import type { FilterOp } from '../../types/query'

const props = defineProps<{ column: ColumnDef; op: FilterOp; modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | Array<string | number>]; done: [] }>()

const asText = (v: unknown) => (Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '')
const draft = ref(asText(props.modelValue))
watch(
  () => props.modelValue,
  (v) => {
    if (asText(v) !== draft.value) draft.value = asText(v)
  },
)
const input = ref<HTMLInputElement | null>(null)
onMounted(() => input.value?.focus())

const isList = () => props.op === 'in' || props.op === 'not_in'
const normalize = (s: string) =>
  props.column.type === 'uppercase'
    ? s.toLocaleUpperCase()
    : props.column.type === 'lowercase'
      ? s.toLocaleLowerCase()
      : s
const commit = () => {
  const s = normalize(draft.value).trim()
  if (isList()) {
    const parts = s
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    emit('update:modelValue', parts)
  } else emit('update:modelValue', s)
}
let timer: ReturnType<typeof setTimeout> | undefined
const onInput = (e: Event) => {
  draft.value = normalize((e.target as HTMLInputElement).value)
  clearTimeout(timer)
  timer = setTimeout(commit, 250)
}
const onEnter = () => {
  clearTimeout(timer)
  commit()
  emit('done')
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <label class="dt-input dt-editor-text">
    <input
      ref="input"
      :value="draft"
      type="text"
      autocomplete="off"
      @input="onInput"
      @keydown.enter.prevent="onEnter"
    />
  </label>
</template>
