<script setup lang="ts">
// Faz 0 iskeleti. Toplu düzenleme Faz 6'da (07).
import type { Density, TableId } from '../types'

withDefaults(defineProps<{ tableId: TableId; density?: Density }>(), { density: 'compact' })
</script>

<template>
  <div class="dt dt-sheet" role="grid" :aria-label="tableId" :data-density="density" />
</template>
