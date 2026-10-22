<script setup lang="ts">
// T13 · Phone (Faz 7c): T1 liste ekranı 390 × 844 telefon çerçevesinde; uygulama başlığı 52 px (handoff 04 §1).
// Gerçek telefon genişliğinde çerçeve ekranı doldurur. Aynı sunucu senaryoları (?delay vb.) geçerlidir.
import T1List from './T1List.vue'
</script>

<template>
  <div class="pg-phone"><T1List /></div>
</template>

<style>
.pg-phone {
  display: flex;
  flex-direction: column;
  width: min(390px, 100%);
  height: min(844px, 100%);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--dt-line);
  border-radius: var(--dt-radius-card);
  background: var(--dt-surface);
}
.pg-phone .pg-page {
  flex: 1;
  min-height: 0;
}
.pg-phone .pg-title {
  flex: none;
  height: 52px;
  margin: 0;
  padding: 0 16px;
}
.pg-phone .pg-title h1 {
  font-size: 17px;
}
.pg-phone .pg-title label,
.pg-phone .pg-crumb,
.pg-phone .pg-crumb-sep {
  display: none;
}
@media (max-width: 639px) {
  .pg-phone {
    border: 0;
    border-radius: 0;
  }
}
</style>
