// jsdom ölçüm yapmaz: virtual-core kabı clientWidth/clientHeight ile okur → kaydırma kabına 600 px, diğerlerine 40/100 ver.
import { nextTick } from 'vue'

export function mockLayout() {
  // Kaydırma kabı 1000 × 600; toolbar 1200 geniş (daralma eşiklerinin üstü); diğerleri 100 × 40.
  const size = (el: HTMLElement, axis: 'w' | 'h') =>
    el.classList.contains('dt-scroll')
      ? axis === 'h'
        ? 600
        : 1000
      : el.classList.contains('dt-toolbar')
        ? axis === 'h'
          ? 52
          : 1200
        : axis === 'h'
          ? 40
          : 100
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return size(this, 'h')
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return size(this, 'w')
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return document.body
    },
  })
  Object.defineProperty(Element.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return size(this as HTMLElement, 'h')
    },
  })
  Object.defineProperty(Element.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return size(this as HTMLElement, 'w')
    },
  })
  Element.prototype.getBoundingClientRect = function () {
    const h = size(this as HTMLElement, 'h')
    return { x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: h, width: 1000, height: h, toJSON: () => ({}) }
  }
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0) as unknown as number
  Element.prototype.scrollIntoView ??= () => {}
  // reka-ui / floating-ui portallı içerik için gözlemci stub'ları.
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  globalThis.IntersectionObserver ??= Observer as unknown as typeof IntersectionObserver
  globalThis.ResizeObserver ??= Observer as unknown as typeof ResizeObserver
}

/** Sanal liste ölçümü ve odak: vue-virtual onChange'i nextTick'te tetikler; iki tur + bir makro görev. */
export const flush = async () => {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
}
