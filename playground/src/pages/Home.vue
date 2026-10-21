<script setup lang="ts">
import { useDataTableContext } from '@swors/data-table'
import { RouterLink } from 'vue-router'
import { PAGES } from '../router'

const { locale, i18n } = useDataTableContext()
const sample = new Intl.NumberFormat(locale).format(1284.5)
</script>

<template>
  <h1>Playground</h1>
  <p>
    Locale
    <code>{{ locale }}</code>
    ·
    <span data-testid="locale-sample">{{ sample }}</span>
    ·
    <span data-testid="i18n-sample">
      {{ i18n.t('state.noResults', { count: 3, entity: { one: 'order', other: 'orders' } }) }}
    </span>
  </p>
  <ul>
    <li v-for="p in PAGES" :key="p.id">
      <RouterLink :to="`/${p.id}`">{{ p.title }}</RouterLink>
      · Faz {{ p.phase }}
    </li>
  </ul>
</template>
