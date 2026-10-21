<script setup lang="ts">
// Faz 0 iskeleti: giriş noktası, tipler ve build'i ayağa kaldırır. Izgara Faz 1'de (05).
import type { Density, TableId } from '../types'

withDefaults(defineProps<{ tableId: TableId; density?: Density }>(), { density: 'standard' })
</script>

<template>
  <div class="dt dt-list" role="grid" :aria-label="tableId" :data-density="density" />
</template>
