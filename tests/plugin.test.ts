// createDataTable plugin'i, useDataTableContext ve localStorage adapter'ları.
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createLocalStoragePreferences, createLocalStorageViews } from '../src/core/adapters/localStorage'
import { createDataTable, useDataTableContext, type DataTableContext } from '../src/core/plugin'
import type { ViewState } from '../src/types'

const state: ViewState = {
  filters: [],
  sort: [{ column: 'dueAt', dir: 'asc' }],
  columns: { order: ['a'], visible: ['a'], widths: {}, pinned: { left: [], right: [] } },
}

beforeEach(() => localStorage.clear())

describe('createLocalStorageViews', () => {
  it('scope zorunlu', () => {
    // @ts-expect-error scope eksik
    expect(() => createLocalStorageViews({})).toThrow(TypeError)
  })
  it('oluştur / listele / güncelle / sil; scope ve tableId ayrı tutar', async () => {
    const a = createLocalStorageViews({ scope: 'a' })
    const v = await a.create('orders', { name: 'Gebze', state })
    expect(v.kind).toBe('personal')
    expect(await a.list('orders')).toEqual([v])
    expect(await a.list('products')).toEqual([])
    expect(await createLocalStorageViews({ scope: 'b' }).list('orders')).toEqual([])
    const u = await a.update('orders', v.id, { name: 'Gebze 2' })
    expect(u.name).toBe('Gebze 2')
    expect(u.state).toEqual(state)
    await a.remove('orders', v.id)
    expect(await a.list('orders')).toEqual([])
    expect(a.capabilities?.share).toBe(false)
  })
  it('bozuk kayıt boş liste sayılır', async () => {
    localStorage.setItem('dt:a:views:orders', '{nope')
    expect(await createLocalStorageViews({ scope: 'a' }).list('orders')).toEqual([])
  })
})

describe('createLocalStoragePreferences', () => {
  it('başta boş, set birleştirir', async () => {
    const p = createLocalStoragePreferences({ scope: 'a' })
    expect(await p.get('orders')).toEqual({})
    await p.set('orders', { density: 'compact' })
    await p.set('orders', { pageSize: 250 })
    expect(await p.get('orders')).toEqual({ density: 'compact', pageSize: 250 })
  })
})

describe('createDataTable', () => {
  const Probe = defineComponent({
    setup() {
      const ctx = useDataTableContext()
      return () =>
        h(
          'div',
          `${ctx.locale}|${ctx.i18n.t('common.cancel')}|${ctx.viewsAdapter ? 'views' : '-'}|${ctx.preferences ? 'prefs' : '-'}`,
        )
    },
  })
  it('plugin bağlam sağlar', () => {
    const plugin = createDataTable({
      locale: 'tr',
      viewsAdapter: createLocalStorageViews({ scope: 'x' }),
      preferences: createLocalStoragePreferences({ scope: 'x' }),
    })
    expect(mount(Probe, { global: { plugins: [plugin] } }).text()).toBe('tr|Vazgeç|views|prefs')
  })
  it('plugin yokken varsayılan bağlam: paket metinleri, adapter yok', () => {
    const text = mount(Probe).text()
    expect(text.endsWith('|-|-')).toBe(true)
    const ctx: DataTableContext = mount(
      defineComponent({ setup: () => ({ ctx: useDataTableContext() }), render: () => null }),
    ).vm.ctx
    expect(ctx.i18n.has('common.cancel')).toBe(true)
  })
})
