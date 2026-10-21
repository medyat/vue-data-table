<script setup lang="ts">
defineProps<{ title: string; phase: number }>()
</script>

<template>
  <h1>{{ title }}</h1>
  <p>Bu senaryo Faz {{ phase }}'de gelir (docs/data-table/10-roadmap.md).</p>
</template>
