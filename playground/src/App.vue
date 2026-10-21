<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { PAGES } from './router'
import { setLocale, settings } from './settings'
</script>

<template>
  <header class="pg-bar">
    <RouterLink to="/" class="pg-brand">@swors/data-table</RouterLink>
    <nav class="pg-nav">
      <RouterLink v-for="p in PAGES" :key="p.id" :to="`/${p.id}`">{{ p.id.toUpperCase() }}</RouterLink>
    </nav>
    <label>
      Tema
      <select v-model="settings.theme" data-testid="theme">
        <option value="light">light</option>
        <option value="dark-class">dark (.dark)</option>
        <option value="dark-attr">dark (data-theme)</option>
      </select>
    </label>
    <label>
      Yoğunluk
      <select v-model="settings.density" data-testid="density">
        <option>comfortable</option>
        <option>standard</option>
        <option>compact</option>
      </select>
    </label>
    <label>
      Dil
      <select
        :value="settings.locale"
        data-testid="locale"
        @change="setLocale(($event.target as HTMLSelectElement).value)"
      >
        <option value="en">en</option>
        <option value="tr">tr</option>
      </select>
    </label>
  </header>
  <main class="pg-stage" data-testid="stage" :data-density="settings.density">
    <RouterView />
  </main>
</template>

<style>
/* Playground kabuğu; paket token'larını kullanır ki tema anahtarı burada da görünsün. */
body {
  margin: 0;
  background: var(--dt-canvas);
  color: var(--dt-text);
  font-family: var(--dt-font);
  font-size: 13px;
}
.pg-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid var(--dt-line);
  background: var(--dt-surface);
}
.pg-brand {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}
.pg-nav {
  display: flex;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
}
.pg-nav a {
  color: var(--dt-text-2);
  text-decoration: none;
  padding: 4px 6px;
  border-radius: var(--dt-radius-item);
}
.pg-nav a.router-link-active {
  background: var(--dt-surface-3);
  color: var(--dt-text);
}
.pg-bar label {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--dt-text-2);
}
.pg-stage {
  height: calc(100dvh - 44px);
  padding: 20px 24px 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
</style>
