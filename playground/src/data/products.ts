// Bulk edit products örneği (T11): sütun tanımları (D21); veri sahte API'den (/api/products). Anahtar sütun SKU.
// Düzenlenecek sütunlar `editable` ile açılır; doğrulama (`required`, `validate`, `warn`) ve formül çubuğu ipucu (`hint`) burada.
import type { ColumnDef, OptionDef } from '@swors/data-table'
import type { Product } from '../../server/mock-api.ts'

export type { Product }

export const categoryOptions: OptionDef[] = [
  { value: 'hydraulics', label: 'Hydraulics', tone: 'blue' },
  { value: 'pumps', label: 'Pumps', tone: 'teal' },
  { value: 'valves', label: 'Valves', tone: 'violet' },
  { value: 'seals', label: 'Seals', tone: 'green' },
  { value: 'power_units', label: 'Power units', tone: 'amber' },
  { value: 'hoses', label: 'Hoses & fittings', tone: 'pink' },
]
const UNITS = ['pcs', 'sets', 'm']
const money = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (v: unknown): v is number => typeof v === 'number'

export const productColumns: Array<ColumnDef<Product>> = [
  { id: 'sku', header: 'SKU', type: 'id', href: (r) => `/products/${r.id}` },
  { id: 'name', header: 'Product name', type: 'string', primary: true, editable: true, required: true },
  {
    id: 'category',
    header: 'Category',
    type: 'select',
    options: categoryOptions,
    width: 148,
    editable: true,
    required: true,
  },
  {
    id: 'unit',
    header: 'Unit',
    type: 'string',
    width: 64,
    editable: true,
    validate: (v) => (typeof v === 'string' && !UNITS.includes(v) ? `Use ${UNITS.join(', ')}` : null),
  },
  {
    id: 'listPrice',
    header: 'List price',
    type: 'currency',
    currency: 'TRY',
    width: 116,
    editable: true,
    required: true,
    hint: '≥ 0',
    validate: (v) => (num(v) && v < 0 ? "List price can't be negative" : null),
    warn: (v, { original }) =>
      num(v) && num(original) && original > 0 && Math.abs(v - original) / original > 0.4
        ? 'Price changed by more than 40%'
        : null,
  },
  {
    id: 'cost',
    header: 'Cost',
    type: 'currency',
    currency: 'TRY',
    width: 116,
    editable: true,
    validate: (v, { row }) =>
      num(v) && num(row.listPrice) && v > row.listPrice
        ? `Cost can't be higher than list price (${money.format(row.listPrice)})`
        : null,
  },
  {
    id: 'vat',
    header: 'VAT',
    type: 'percentage',
    width: 72,
    editable: true,
    required: true,
    hint: '0–100',
    validate: (v) => (num(v) && (v < 0 || v > 100) ? 'VAT must be between 0 and 100' : null),
  },
  {
    id: 'minStock',
    header: 'Min stock',
    type: 'int',
    width: 92,
    editable: true,
    validate: (v) => (num(v) && (v < 0 || !Number.isInteger(v)) ? 'Whole number, 0 or more' : null),
  },
  { id: 'leadTime', header: 'Lead time', type: 'int', unit: 'd', width: 100, editable: true },
  { id: 'active', header: 'Active', type: 'boolean', width: 84, editable: true },
  { id: 'validFrom', header: 'Price valid from', type: 'date', width: 132, editable: true },
]
