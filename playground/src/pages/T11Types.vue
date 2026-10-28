<script setup lang="ts">
// T11 · Sheet column types: 23 tipin her biri için bir düzenlenebilir sütun (07 §5). Veri yerel; Save sunucu yerine
// değişiklikleri olduğu gibi kabul eder. Her sütunun `hint`'i formül çubuğunda nasıl düzenleneceğini söyler.
// Yerleşik editörü olmayan tipler (ajax, user, object, array) `editable: true` olsa da salt okunur kalır; özel `editor` ister.
// multiselect: yalnızca arama kutusu; liste açık kalır, seçim tik ile aç/kapa.
import type { ColumnDef } from '@swors/data-table'
import { DataSheet, type DataSheetHandle, type SheetChanges } from '@swors/data-table/sheet'
import { shallowRef, useTemplateRef } from 'vue'
import { owners, statusOptions } from '../data/orders'
import { categoryOptions } from '../data/products'

interface Sample {
  id: string
  code: string
  [key: string]: unknown
}

const remote = {
  search: async () => ({ items: [], hasMore: false }),
  resolve: async (ids: Array<string | number>) =>
    ids.map((id) => ({ value: id, label: id === 'c1' ? 'Kuzey Otomotiv' : 'Ege Hidrolik' })),
}

const columns: Array<ColumnDef<Sample>> = [
  { id: 'code', header: 'id (key)', type: 'id', hint: 'Key column: editable only on new rows' },
  // sayı
  { id: 'int', header: 'int', type: 'int', editable: true, hint: 'Whole number, e.g. 2240' },
  {
    id: 'float',
    header: 'float',
    type: 'float',
    decimalPlaces: 2,
    editable: true,
    hint: 'Decimal separator follows the locale',
  },
  { id: 'pct', header: 'percentage', type: 'percentage', editable: true, hint: '0–100, without %' },
  { id: 'star', header: 'star', type: 'star', max: 5, editable: true, hint: '1–5' },
  { id: 'cur', header: 'currency', type: 'currency', currency: 'TRY', editable: true, hint: '2,240.00 or 2.240,00' },
  // metin
  { id: 'string', header: 'string', type: 'string', editable: true, required: true },
  { id: 'text', header: 'text', type: 'text', editable: true, hint: '⇧Enter for a new line' },
  { id: 'upper', header: 'uppercase', type: 'uppercase', editable: true, hint: 'Saved in upper case' },
  { id: 'lower', header: 'lowercase', type: 'lowercase', editable: true, hint: 'Saved in lower case' },
  { id: 'phone', header: 'phone', type: 'phone', editable: true },
  { id: 'color', header: 'color', type: 'color', editable: true, hint: '#RRGGBB' },
  {
    id: 'email',
    header: 'email',
    type: 'email',
    width: 220,
    editable: true,
    validate: (v) => (typeof v === 'string' && !v.includes('@') ? 'Not an email address' : null),
  },
  { id: 'url', header: 'url', type: 'url', editable: true },
  { id: 'ref', header: 'id', type: 'id', editable: true },
  // seçim
  { id: 'bool', header: 'boolean', type: 'boolean', editable: true, hint: 'Space or double click: Yes ↔ No' },
  { id: 'select', header: 'select', type: 'select', options: statusOptions, editable: true },
  {
    id: 'multi',
    header: 'multiselect',
    type: 'multiselect',
    options: categoryOptions,
    editable: true,
    hint: 'Click or Enter toggles an option · Esc saves',
  },
  { id: 'ajax', header: 'ajax', type: 'ajax', remote, editable: true },
  { id: 'user', header: 'user', type: 'user', options: owners, editable: true },
  // tarih
  { id: 'date', header: 'date', type: 'date', editable: true, hint: '24.10, 24.10.2026, +7d or today' },
  { id: 'dt', header: 'datetime', type: 'datetime', editable: true },
  // yapısal
  { id: 'obj', header: 'object', type: 'object', editable: true },
  { id: 'arr', header: 'array', type: 'array', itemType: 'int', editable: true },
]

const rows = shallowRef<Sample[]>([
  {
    id: '1',
    code: 'S-001',
    int: 12400,
    float: 1284.5,
    pct: 68,
    star: 4,
    cur: 412800,
    string: 'Hydraulic cylinder HC-80',
    text: 'Zinc-plated rods on this batch.',
    upper: 'GEBZE-2',
    lower: 'hydraulics',
    phone: '+905324121807',
    color: '#1F4E8C',
    email: 'satinalma@kuzeyotomotiv.com.tr',
    url: 'https://kuzeyotomotiv.com.tr',
    ref: 'HC-080-S',
    bool: true,
    select: 'in_progress',
    multi: ['pumps', 'valves'],
    ajax: 'c1',
    user: 'u1',
    date: '2026-10-24',
    dt: '2026-10-17T09:42:00',
    obj: { material: 'Steel', kg: 12.4 },
    arr: [40, 63, 80],
  },
  { id: '2', code: 'S-002', string: 'Mounting bracket CB-80', bool: false, select: 'on_hold', ajax: 'c2', user: 'u4' },
  { id: '3', code: 'S-003', string: 'Seal kit SK-12' },
])

const sheet = useTemplateRef<DataSheetHandle>('sheet')
const lastSave = shallowRef<SheetChanges | null>(null)
/** Sunucu yerine: her satırı olduğu gibi kabul eder. */
function onSave(changes: SheetChanges) {
  lastSave.value = changes
  sheet.value!.applyResult(
    changes.rows.map((r) => ({ clientId: r.clientId, status: r.op === 'create' ? 'created' : 'updated' })),
  )
}
</script>

<template>
  <div class="pg-page">
    <div class="pg-title">
      <h1>Sheet · column types</h1>
      <label>
        Last save
        <code data-testid="last-save">{{ lastSave ? JSON.stringify(lastSave.rows.map((r) => r.values)) : '—' }}</code>
      </label>
    </div>
    <DataSheet
      ref="sheet"
      table-id="t11-types"
      key-column="code"
      :columns="columns"
      :rows="rows"
      :entity-name="{ one: 'sample', other: 'samples' }"
      @save="onSave"
    />
  </div>
</template>
