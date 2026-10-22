// Sahte Laravel API'si (Vite dev middleware). Playground ve Playwright aynı deterministik veriye karşı koşar.
// GET /api/orders?page=1&size=100&sort=dueAt&dir=asc&q=&filters=[…]&delay=ms&fail=1 → { items, hasMore } (simplePaginate gibi)
// `filters` JSON FilterCondition[]: sahte sunucu paketin `matches` eşlemesiyle uygular (hazır tarih aralıkları sunucuda çözülür, 04).
// GET /api/orders/count?q=                                              → { total }
// GET /api/products?page=1&size=2000&delay=ms                            → { items, total } (T11 · DataSheet, 10.000 ürün)
// POST /api/products/bulk-upsert { key, rows }                           → { results } (07 §16: ≤ 500 satır, satır başına sonuç,
//      snake_case; cost > 100000 → field_errors.cost; sku "ERR-…" → row_error; bir satırın hatası diğerlerini düşürmez)
// POST /api/products/lookup-keys { keys }                                 → { [key]: product | null }
import type { Plugin } from 'vite'
import { matches } from '../../src/core/filters/model'
import type { FilterCondition } from '../../src/types/query'

export interface Order {
  id: number
  number: string
  product: { name: string; sku: string }
  customer: string
  status: 'draft' | 'planned' | 'released' | 'in_progress' | 'on_hold' | 'done'
  produced: number
  owner: { id: string; name: string } | null
  dueAt: string
  createdAt: string
  value: number
  currency: 'TRY'
  plant: 'Gebze' | 'Dilovası'
}

/** mulberry32: aynı tohum → aynı veri. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PRODUCTS = [
  'Gear pump GP-25',
  'Hydraulic cylinder HC-63',
  'Valve manifold block VM-4',
  'Pressure relief valve PR-16',
  'Hydraulic power unit HPU-5.5',
  'Directional valve DV-10',
  'Hydraulic cylinder HC-80',
  'Telescopic cylinder TC-3',
  'Cylinder mounting bracket CB-80',
  'Hose assembly kit HK-12',
  'Piston rod 40 × 600',
  'Seal kit SK-80',
  'Tipper cylinder TP-120',
]
const CUSTOMERS = [
  'Ege Tarım Makine',
  'Marmara Vinç',
  'Delta Forklift',
  'Kuzey Otomotiv',
  'Atlas Kaldırma',
  'Toros Makina',
  'Anka Damper',
  'Yıldız Pres',
  'Sakarya Römork',
  'Karadeniz Tersane',
]
const OWNERS = [
  { id: 'u1', name: 'Ayşe K.' },
  { id: 'u2', name: 'Emre T.' },
  { id: 'u3', name: 'Selin A.' },
  { id: 'u4', name: 'Burak Y.' },
  { id: 'u5', name: 'Deniz Ö.' },
  { id: 'u6', name: 'Murat S.' },
]
const STATUSES: Order['status'][] = [
  'draft',
  'planned',
  'released',
  'in_progress',
  'in_progress',
  'on_hold',
  'done',
  'done',
]
const TODAY = Date.UTC(2026, 9, 21)

export function makeOrders(count = 1284): Order[] {
  const r = rng(26)
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!
  return Array.from({ length: count }, (_, i) => {
    const status = pick(STATUSES)
    const produced =
      status === 'done' ? 100 : status === 'in_progress' || status === 'on_hold' ? Math.round(r() * 90) + 5 : 0
    const product = pick(PRODUCTS)
    return {
      id: i + 1,
      number: `WO-26-${String(300 + i).padStart(4, '0')}`,
      product: { name: product, sku: product.split(' ').at(-1)!.toUpperCase() },
      customer: pick(CUSTOMERS),
      status,
      produced,
      owner: r() < 0.08 ? null : pick(OWNERS),
      dueAt: new Date(TODAY + Math.round(r() * 60 - 20) * 86400000).toISOString().slice(0, 10),
      createdAt: new Date(TODAY - Math.round(r() * 90) * 86400000 - Math.round(r() * 86400000)).toISOString(),
      value: (Math.round(r() * 1_300_000 + 20_000) / 100) * 100,
      currency: 'TRY',
      plant: r() < 0.7 ? 'Gebze' : 'Dilovası',
    }
  })
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
const readBody = (req: import('node:http').IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = ''
    req.on('data', (c: Buffer) => (data += c))
    req.on('end', () => resolve(data))
  })

export interface Product {
  id: number
  sku: string
  name: string
  category: 'hydraulics' | 'pumps' | 'valves' | 'seals' | 'power_units' | 'hoses'
  unit: 'pcs' | 'sets' | 'm'
  listPrice: number
  cost: number
  vat: number
  minStock: number
  leadTime: number
  active: boolean
  validFrom: string | null
}

const FAMILIES: Array<{
  name: string
  sku: string
  category: Product['category']
  unit: Product['unit']
  base: number
}> = [
  { name: 'Hydraulic cylinder HC', sku: 'HC', category: 'hydraulics', unit: 'pcs', base: 1650 },
  { name: 'Gear pump GP', sku: 'GP', category: 'pumps', unit: 'pcs', base: 2240 },
  { name: 'Pressure relief valve PR', sku: 'PR', category: 'valves', unit: 'pcs', base: 455 },
  { name: 'Pump shaft seal', sku: 'PS', category: 'seals', unit: 'pcs', base: 84 },
  { name: 'Pump seal kit', sku: 'PS', category: 'seals', unit: 'sets', base: 214.5 },
  { name: 'Power unit', sku: 'PU', category: 'power_units', unit: 'pcs', base: 18400 },
  { name: 'Hydraulic hose', sku: 'HH', category: 'hoses', unit: 'm', base: 64 },
  { name: 'Proportional valve PV', sku: 'PV', category: 'valves', unit: 'pcs', base: 3450 },
]

/** 10.000 ürün, deterministik; SKU'lar tekil ("HC-0001-S"). */
export function makeProducts(count = 10_000): Product[] {
  const r = rng(11)
  return Array.from({ length: count }, (_, i) => {
    const f = FAMILIES[i % FAMILIES.length]!
    const n = Math.floor(i / FAMILIES.length) + 1
    const code = String(n).padStart(4, '0')
    const listPrice = Math.round(f.base * (0.6 + r() * 0.9) * 100) / 100
    const day = Math.floor(r() * 300)
    return {
      id: i + 1,
      sku: `${f.sku}-${code}-${'SABC'[i % 4]}`,
      name: `${f.name} ${n}`,
      category: f.category,
      unit: f.unit,
      listPrice,
      cost: Math.round(listPrice * (0.55 + r() * 0.2) * 100) / 100,
      vat: r() < 0.9 ? 20 : 10,
      minStock: [2, 5, 10, 15, 20, 30, 40, 50][Math.floor(r() * 8)]!,
      leadTime: [7, 10, 12, 14, 21, 30, 35][Math.floor(r() * 7)]!,
      active: r() < 0.93,
      validFrom: r() < 0.7 ? new Date(TODAY - day * 86_400_000).toISOString().slice(0, 10) : null,
    }
  })
}

export function mockApi(): Plugin {
  const orders = makeOrders()
  let products = makeProducts()
  return {
    name: 'dt-mock-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const q = url.searchParams
        const json = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (q.has('delay')) await sleep(Number(q.get('delay')))
        if (q.get('fail') === '1') return json(500, { message: 'Simulated failure' })

        if (url.pathname === '/products') {
          // Kayıt bellekteki ürünleri değiştirir (yeniden yükleyince görünsün); testler ?fresh=1 ile sıfırdan başlar.
          if (q.has('fresh')) products = makeProducts()
          const page = Math.max(1, Number(q.get('page') ?? 1))
          const size = Math.min(2000, Math.max(1, Number(q.get('size') ?? 2000)))
          const start = (page - 1) * size
          return json(200, { items: products.slice(start, start + size), total: products.length })
        }
        if (url.pathname === '/products/lookup-keys' || url.pathname === '/products/bulk-upsert') {
          const body = JSON.parse((await readBody(req)) || '{}') as {
            keys?: string[]
            rows?: Array<{ client_id: string; key: string; op: 'create' | 'update'; values: Record<string, unknown> }>
          }
          if (url.pathname === '/products/lookup-keys') {
            const out: Record<string, Product | null> = {}
            for (const k of body.keys ?? []) out[k] = products.find((p) => p.sku === k) ?? null
            return json(200, out)
          }
          const rows = body.rows ?? []
          if (rows.length > 500) return json(413, { message: 'Too many rows' })
          const results = rows.map((r) => {
            if (r.key.startsWith('ERR'))
              return { client_id: r.client_id, status: 'error', row_error: 'Locked by an open quote' }
            const cost = r.values.cost
            if (typeof cost === 'number' && cost > 100_000)
              return {
                client_id: r.client_id,
                status: 'error',
                field_errors: { cost: 'Cost exceeds the server limit (100,000)' },
              }
            const existing = products.find((p) => p.sku === r.key)
            if (existing) {
              Object.assign(existing, r.values)
              return { client_id: r.client_id, status: 'updated', row: { ...existing } }
            }
            const created: Product = {
              id: products.length + 1,
              sku: r.key,
              name: '',
              category: 'hydraulics',
              unit: 'pcs',
              listPrice: 0,
              cost: 0,
              vat: 20,
              minStock: 0,
              leadTime: 0,
              active: true,
              validFrom: null,
              ...r.values,
            }
            products.push(created)
            return { client_id: r.client_id, status: 'created', row: { ...created } }
          })
          return json(200, { results })
        }

        const search = (q.get('q') ?? '').toLocaleLowerCase('tr')
        const get = (o: Order, path: string): unknown =>
          path.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown> | null)?.[k], o)
        const filters = JSON.parse(q.get('filters') || '[]') as FilterCondition[]
        const cell = (o: Order, column: string) => (column === 'owner' ? (o.owner?.id ?? null) : get(o, column))
        const matching = orders.filter(
          (o) =>
            (!search ||
              [o.number, o.product.name, o.customer].some((s) => s.toLocaleLowerCase('tr').includes(search))) &&
            filters.every((f) => matches(f, cell(o, f.column), { locale: 'tr' })),
        )

        if (url.pathname === '/orders/count') return json(200, { total: matching.length })
        if (url.pathname !== '/orders') return json(404, { message: 'Not found' })

        const sort = q.get('sort')
        const dir = q.get('dir') === 'desc' ? -1 : 1
        const sorted = sort
          ? [...matching].sort((a, b) => {
              const x = get(a, sort) as string | number
              const y = get(b, sort) as string | number
              return x > y ? dir : x < y ? -dir : 0
            })
          : matching
        const page = Math.max(1, Number(q.get('page') ?? 1))
        const size = Math.min(500, Math.max(1, Number(q.get('size') ?? 100)))
        const start = (page - 1) * size
        json(200, { items: sorted.slice(start, start + size), hasMore: start + size < sorted.length })
      })
    },
  }
}
