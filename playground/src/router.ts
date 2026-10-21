import type { Component } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Placeholder from './pages/Placeholder.vue'
import T1List from './pages/T1List.vue'
import T7Actions from './pages/T7Actions.vue'
import T8Cells from './pages/T8Cells.vue'

const REAL: Record<string, Component> = { t1: T1List, t7: T7Actions, t8: T8Cells }

/** DESIGN-BRIEF görev paketleri; her biri bir rota. Sayfa, ilgili fazda gerçek senaryoyla değişir. */
export const PAGES = [
  { id: 't1', title: 'T1 · List screen', phase: 2 },
  { id: 't2', title: 'T2 · Filtering', phase: 3 },
  { id: 't3', title: 'T3 · Views', phase: 3 },
  { id: 't4', title: 'T4 · Column headers', phase: 2 },
  { id: 't5', title: 'T5 · Row selection', phase: 4 },
  { id: 't6', title: 'T6 · Row detail', phase: 4 },
  { id: 't7', title: 'T7 · Cell actions', phase: 1 },
  { id: 't8', title: 'T8 · Cell types', phase: 1 },
  { id: 't9', title: 'T9 · States', phase: 2 },
  { id: 't10', title: 'T10 · Document lines', phase: 5 },
  { id: 't11', title: 'T11 · DataSheet', phase: 6 },
  { id: 't12', title: 'T12 · Saving & import', phase: 6 },
  { id: 't13', title: 'T13 · Phone', phase: 7 },
] as const

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    ...PAGES.map((p) => ({
      path: `/${p.id}`,
      component: REAL[p.id] ?? Placeholder,
      props: REAL[p.id] ? undefined : { title: p.title, phase: p.phase },
    })),
  ],
})
