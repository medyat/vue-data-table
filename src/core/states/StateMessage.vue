<script setup lang="ts">
// Durum mesajı bloğu (handoff 02-ortak §9, T9): gövdenin ortasında, en fazla 440 px; ikon kutusu 40, başlık 15/600, satırlar 13.
import { PhFile, PhFunnel, PhMagnifyingGlass, PhPackage, PhWarningCircle } from '@phosphor-icons/vue'

const props = defineProps<{
  kind: 'empty' | 'noResults' | 'noResultsSearch' | 'error' | 'noRowsOnPage'
  title: string
  lines?: string[]
}>()
const ICONS = {
  empty: PhPackage,
  noResults: PhFunnel,
  noResultsSearch: PhMagnifyingGlass,
  error: PhWarningCircle,
  noRowsOnPage: PhFile,
}
const icon = ICONS[props.kind]
</script>

<template>
  <div class="dt-state" :class="`is-${kind}`" :role="kind === 'error' ? 'alert' : 'status'">
    <span class="dt-state-icon" aria-hidden="true"><component :is="icon" :size="20" /></span>
    <strong class="dt-state-title">{{ title }}</strong>
    <p v-for="line in lines ?? []" :key="line" class="dt-state-line">{{ line }}</p>
    <div v-if="$slots.default" class="dt-state-actions"><slot /></div>
    <slot name="after" />
  </div>
</template>
