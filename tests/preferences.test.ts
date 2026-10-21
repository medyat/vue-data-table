// usePreferences: adapter yoksa oturumluk; varsa get uygulanır, set kalıcı; localStorage adapter'ı hata vermez.
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createLocalStoragePreferences } from '../src/core/adapters/localStorage'
import { usePreferences } from '../src/core/preferences/usePreferences'

const defaults = { density: 'standard' as const, verticalLines: false, pageSize: 100, defaultViewId: null }

function setup(adapter: ReturnType<typeof createLocalStoragePreferences> | null) {
  let api!: ReturnType<typeof usePreferences>
  mount(
    defineComponent({
      setup() {
        api = usePreferences('orders', adapter, defaults)
        return () => null
      },
    }),
  )
  return api
}

beforeEach(() => localStorage.clear())

describe('usePreferences', () => {
  it('adapter yok: oturumluk, persistent false', () => {
    const p = setup(null)
    expect(p.persistent).toBe(false)
    p.set({ density: 'compact' })
    expect(p.prefs.density).toBe('compact')
    p.reset()
    expect(p.prefs.density).toBe('standard')
  })
  it('adapter var: kayıtlı tercih yüklenir, set yazılır, reset varsayılanı yazar', () => {
    const adapter = createLocalStoragePreferences({ scope: 't' })
    adapter.set('orders', { pageSize: 250 })
    const p = setup(adapter)
    expect(p.persistent).toBe(true)
    expect(p.prefs.pageSize).toBe(250)
    p.set({ verticalLines: true })
    expect(adapter.get('orders')).toEqual({ pageSize: 250, verticalLines: true })
    p.set({ defaultViewId: 'v1' })
    p.reset()
    // Display › Reset ekran ayarlarını döndürür; varsayılan görünüm seçimi kalır (04 §8 notu).
    expect(adapter.get('orders')).toEqual({
      density: 'standard',
      verticalLines: false,
      pageSize: 100,
      defaultViewId: 'v1',
    })
  })
  it('Promise dönen adapter ve hata atan set tabloyu bozmaz', async () => {
    const adapter = {
      get: async () => ({ density: 'comfortable' as const }),
      set: vi.fn(() => {
        throw new Error('quota')
      }),
    }
    const p = setup(adapter)
    await Promise.resolve()
    await Promise.resolve()
    expect(p.prefs.density).toBe('comfortable')
    expect(() => p.set({ pageSize: 50 })).toThrow() // adapter senkron fırlattı; uygulamanın hatası
    expect(adapter.set).toHaveBeenCalledWith('orders', { pageSize: 50 })
  })
})
