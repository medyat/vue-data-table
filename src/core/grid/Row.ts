// Satır + hücreler: render fonksiyonu (sanal listede yüzlerce örnek; şablon derleyicisi yerine düz h()).
// Kabuk burada: hizalama, kesme, sabit sütun sticky'si, --dt-row-bg, ikinci satır, aksiyon overlay'i (05 §4, 03).
import { defineComponent, h, onMounted, onUpdated, type PropType, type VNodeChild } from 'vue'
import CellActions from '../cells/CellActions.vue'
import { cellFillStyle, renderCellContent, type RenderEnv } from '../cells/renderCell'
import { alignOf, isNumericType } from '../cells/specs'
import type { LayoutColumn } from '../columns/useColumnLayout'
import { INTERACTIVE_SELECTOR } from '../interaction/isInteractive'

export default defineComponent({
  name: 'DtRow',
  props: {
    row: { type: Object as PropType<object>, required: true },
    index: { type: Number, required: true },
    rowIndex: { type: Number, required: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessor/cell parametreleri karşıt değişken; satır tipi üstten gelir
    columns: { type: Array as PropType<Array<LayoutColumn<any>>>, required: true },
    env: { type: Object as PropType<RenderEnv>, required: true },
    focused: { type: Boolean, default: false },
    keyboardFocus: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    /** Comfortable: `secondary` görünür (02 · Yoğunluk). */
    secondaryVisible: { type: Boolean, default: false },
    style: { type: Object as PropType<Record<string, string>>, default: undefined },
  },
  setup(props) {
    let el: HTMLElement | null = null
    // Hücre içi widget'lar Tab durağı değildir (08 §2): uygulamanın `cell` içeriği dahil, her güncellemede tabindex=-1.
    const demote = () => {
      if (!el) return
      for (const w of el.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)) if (w.tabIndex !== -1) w.tabIndex = -1
    }
    onMounted(demote)
    onUpdated(demote)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderCell = (col: LayoutColumn<any>): VNodeChild => {
      const def = col.def
      const value = def.accessor ? def.accessor(props.row) : readPathFast(props.row, col.id)
      const align = alignOf(def)
      let content = renderCellContent(def, props.row, value, props.env)
      const href = def.primary && def.type !== 'id' && def.type !== 'ajax' ? def.href?.(props.row) : undefined
      if (href) content = h('a', { class: 'dt-link dt-primary-link', href, tabindex: -1 }, [content])
      const actions = def.actions
      return h(
        'div',
        {
          class: [
            'dt-cell',
            `is-${align}`,
            {
              'is-numeric': isNumericType(def.type),
              'is-primary': def.primary,
              'is-pinned-start': col.pinned === 'start',
              'is-pinned-end': col.pinned === 'end',
              'is-pin-edge': col.pinEdge,
            },
          ],
          style: {
            ...(col.pinned === 'start'
              ? { left: `var(${col.offsetVar})` }
              : col.pinned === 'end'
                ? { right: `var(${col.offsetVar})` }
                : null),
            ...cellFillStyle(def, value),
          },
          role: 'gridcell',
          'data-col': col.id,
        },
        [
          h('span', { class: 'dt-cell-content' }, [content]),
          props.secondaryVisible && def.secondary
            ? h('span', { class: 'dt-secondary' }, def.secondary(props.row) ?? '')
            : null,
          actions?.length ? h(CellActions, { actions, row: props.row }) : null,
        ],
      )
    }

    return () =>
      h(
        'div',
        {
          ref: (r) => (el = r as HTMLElement | null),
          class: ['dt-row', { 'is-focus': props.focused && props.keyboardFocus, 'is-selected': props.selected }],
          role: 'row',
          'aria-rowindex': props.rowIndex,
          'aria-selected': props.selected ? 'true' : undefined,
          tabindex: props.focused ? 0 : -1,
          'data-index': props.index,
          style: props.style,
        },
        props.columns.map(renderCell),
      )
  },
})

function readPathFast(row: object, path: string): unknown {
  let v: unknown = row
  for (const key of path.split('.')) {
    if (v === null || v === undefined) return undefined
    v = (v as Record<string, unknown>)[key]
  }
  return v
}
