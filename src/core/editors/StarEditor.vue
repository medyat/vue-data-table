<script setup lang="ts">
// Puan editörü (03): 1–max yıldız; tıklanınca uygulanır ve popover kapanır.
import { PhStar } from '@phosphor-icons/vue'
import type { ColumnDef } from '../../types/columns'

const props = defineProps<{ column: ColumnDef; modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [value: number]; done: [] }>()
const max = (props.column as { max?: number }).max ?? 5
const pick = (n: number) => {
  emit('update:modelValue', n)
  emit('done')
}
</script>

<template>
  <div class="dt-editor-stars" role="radiogroup">
    <button
      v-for="n in max"
      :key="n"
      type="button"
      class="dt-star-btn"
      role="radio"
      :aria-checked="modelValue === n"
      :aria-label="String(n)"
      :class="{ 'is-on': typeof modelValue === 'number' && n <= modelValue }"
      @click="pick(n)"
    >
      <PhStar
        :size="18"
        :weight="typeof modelValue === 'number' && n <= modelValue ? 'fill' : 'regular'"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
