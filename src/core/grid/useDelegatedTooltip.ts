// Tek tooltip, delegasyonla (02 · Tooltip 400 ms): kesilmiş hücre metni ve `data-dt-tip` taşıyan öğeler.
// Hücre başına reka Tooltip örneği 500 satırda ağır olurdu; kökte tek dinleyici + tek DOM düğümü.
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

const DELAY = 400

export function useDelegatedTooltip(root: Ref<HTMLElement | null>) {
  const text = ref('')
  const style = ref<Record<string, string>>({})
  const open = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let anchor: HTMLElement | null = null

  const tipOf = (target: Element | null): { el: HTMLElement; text: string } | null => {
    const tipped = target?.closest<HTMLElement>('[data-dt-tip]')
    if (tipped && tipped.dataset.dtTip) return { el: tipped, text: tipped.dataset.dtTip }
    const content = target?.closest<HTMLElement>('.dt-cell-content, .dt-head-label')
    if (content && content.scrollWidth > content.clientWidth + 1)
      return { el: content, text: content.textContent?.trim() ?? '' }
    return null
  }

  const hide = () => {
    clearTimeout(timer)
    timer = undefined
    anchor = null
    open.value = false
  }

  const show = (el: HTMLElement, t: string) => {
    const r = el.getBoundingClientRect()
    text.value = t
    style.value = { left: `${Math.round(r.left + r.width / 2)}px`, top: `${Math.round(r.bottom + 6)}px` }
    open.value = true
  }

  const onOver = (e: Event) => {
    const hit = tipOf(e.target as Element)
    if (!hit) return
    if (hit.el === anchor) return
    hide()
    anchor = hit.el
    timer = setTimeout(() => show(hit.el, hit.text), DELAY)
  }
  const onOut = (e: MouseEvent) => {
    if (anchor && !anchor.contains(e.relatedTarget as Node | null)) hide()
  }
  const onFocusin = (e: FocusEvent) => {
    const hit = tipOf(e.target as Element)
    if (hit) {
      hide()
      anchor = hit.el
      show(hit.el, hit.text)
    }
  }

  onMounted(() => {
    const el = root.value
    if (!el) return
    el.addEventListener('mouseover', onOver)
    el.addEventListener('mouseout', onOut)
    el.addEventListener('focusin', onFocusin)
    el.addEventListener('focusout', hide)
    el.addEventListener('scroll', hide, true)
    el.addEventListener('mousedown', hide)
  })
  onBeforeUnmount(() => {
    const el = root.value
    hide()
    el?.removeEventListener('mouseover', onOver)
    el?.removeEventListener('mouseout', onOut)
    el?.removeEventListener('focusin', onFocusin)
    el?.removeEventListener('focusout', hide)
    el?.removeEventListener('scroll', hide, true)
    el?.removeEventListener('mousedown', hide)
  })

  return { open, text, style, hide }
}
