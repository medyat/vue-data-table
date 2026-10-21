<script setup lang="ts">
// Faz 0 iskeleti. Belge satırları Faz 5'te (06).
import type { Density, TableId } from '../types'

withDefaults(defineProps<{ tableId: TableId; density?: Density }>(), { density: 'comfortable' })
</script>

<template>
  <div class="dt dt-document" role="table" :aria-label="tableId" :data-density="density" />
</template>
