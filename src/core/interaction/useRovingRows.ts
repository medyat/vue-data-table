// Satır odaklı roving tabindex (08 §2, D24): ızgara tek Tab durağı; oklar satırlar arası; `→` satırın ilk widget'ına,
// widget'lar arası `←`/`→`, `Esc` satıra. Widget odaklıyken ızgara tuşları kapalı; input kendi oklarını alır.
import { ref, type Ref } from 'vue'
import { isTextInput } from './isInteractive'

const WIDGET_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="-1"][role]'

export interface RovingOptions {
  count: () => number
  rowEl: (index: number) => HTMLElement | null
  /** Satırı DOM'a getirip odaklamak için (sanal liste). */
  scrollToIndex: (index: number) => void
  /** Bir ekranlık satır sayısı (PageUp/PageDown). */
  pageSize: () => number
  onEnter?: (index: number) => void
  onRight?: (index: number) => boolean
  onLeft?: (index: number) => boolean
}

export function useRovingRows(opts: RovingOptions) {
  /** Roving tabindex'i taşıyan satır; -1: hiçbiri (ilk satır varsayılan). */
  const focusedIndex: Ref<number> = ref(0)
  /** Son etkileşim klavyeden mi: odak çerçevesi yalnızca o zaman çizilir. */
  const keyboard = ref(false)

  const widgetsOf = (row: HTMLElement): HTMLElement[] =>
    [...row.querySelectorAll<HTMLElement>(WIDGET_SELECTOR)].filter(
      (el) => el.offsetParent !== null || el.getClientRects().length > 0,
    )

  /** Sanal listede satır henüz DOM'da olmayabilir: önce kaydır, sonraki karede odakla. */
  const focusRow = (index: number) => {
    const n = opts.count()
    if (n === 0) return
    const i = Math.max(0, Math.min(n - 1, index))
    focusedIndex.value = i
    keyboard.value = true
    opts.scrollToIndex(i)
    const tryFocus = (attempt: number) => {
      const el = opts.rowEl(i)
      if (el) el.focus({ preventScroll: true })
      else if (attempt < 3) requestAnimationFrame(() => tryFocus(attempt + 1))
    }
    tryFocus(0)
  }

  const onKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const row = target.closest<HTMLElement>('[role="row"][data-index]')
    if (!row) return
    const index = Number(row.dataset.index)
    const inWidget = target !== row

    if (inWidget) {
      // Widget içi: yalnızca ← → Esc; input/combobox kendi oklarını alır.
      if (e.key === 'Escape') {
        e.preventDefault()
        keyboard.value = true
        row.focus({ preventScroll: true })
        return
      }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !isTextInput(target)) {
        const widgets = widgetsOf(row)
        const at = widgets.indexOf(target.closest<HTMLElement>(WIDGET_SELECTOR) ?? target)
        const next = e.key === 'ArrowRight' ? widgets[at + 1] : at > 0 ? widgets[at - 1] : row
        if (next) {
          e.preventDefault()
          keyboard.value = true
          next.focus({ preventScroll: true })
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusRow(index + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusRow(index - 1)
        break
      case 'Home':
        e.preventDefault()
        focusRow(0)
        break
      case 'End':
        e.preventDefault()
        focusRow(opts.count() - 1)
        break
      case 'PageDown':
        e.preventDefault()
        focusRow(index + opts.pageSize())
        break
      case 'PageUp':
        e.preventDefault()
        focusRow(index - opts.pageSize())
        break
      case 'ArrowRight': {
        if (opts.onRight?.(index)) {
          e.preventDefault()
          break
        }
        const first = widgetsOf(row)[0]
        if (first) {
          e.preventDefault()
          keyboard.value = true
          first.focus({ preventScroll: true })
        }
        break
      }
      case 'ArrowLeft':
        if (opts.onLeft?.(index)) e.preventDefault()
        break
      case 'Enter':
        if (opts.onEnter) {
          e.preventDefault()
          opts.onEnter(index)
        }
        break
    }
  }

  /** Fare ile satıra gelen odak: roving index taşınır, çerçeve çizilmez. */
  const onMousedown = (e: MouseEvent) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[role="row"][data-index]')
    if (!row) return
    keyboard.value = false
    focusedIndex.value = Number(row.dataset.index)
  }

  /** Odak (Tab ile) satıra gelince: klavye modu. */
  const onFocusin = (e: FocusEvent) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[role="row"][data-index]')
    if (row && e.target === row && !keyboard.value && !pointerDown) keyboard.value = true
  }
  let pointerDown = false
  const onPointerdown = () => {
    pointerDown = true
    setTimeout(() => (pointerDown = false), 0)
  }

  /** Sayfa/sorgu değişiminde: index sınırlanır (aynı anahtar → aynı indeks → ilk satır kuralı çağıran tarafta). */
  const clamp = () => {
    focusedIndex.value = Math.max(0, Math.min(opts.count() - 1, focusedIndex.value))
  }

  return { focusedIndex, keyboard, focusRow, onKeydown, onMousedown, onFocusin, onPointerdown, clamp }
}
