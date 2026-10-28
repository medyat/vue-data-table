// Satır + hücreler: render fonksiyonu (sanal listede yüzlerce örnek; şablon derleyicisi yerine düz h()).
// Kabuk burada: hizalama, kesme, sabit sütun sticky'si, --dt-row-bg, ikinci satır, aksiyon overlay'i (05 §4, 03);
// seçim hücresi (40 px, sol sabit), birincil hücrede expand chevron'u, sağ sabit ⋯ hücresi (56 px) (05 §6–7, D6, D28).
import { PhCaretRight, PhWarningCircle } from '@phosphor-icons/vue'
import { defineComponent, h, onMounted, onUpdated, toRaw, type PropType, type VNodeChild } from 'vue'
import type { RowAction } from '../../types/list'
import CellActions from '../cells/CellActions.vue'
import { cellFillStyle, renderCellContent, type RenderEnv } from '../cells/renderCell'
import { alignOf, isNumericType } from '../cells/specs'
import type { LayoutColumn } from '../columns/useColumnLayout'
import { inlineActionsOf } from './inlineActions'
import RowMenu from './RowMenu.vue'

export default defineComponent({
  name: 'DtRow',
  props: {
    row: { type: Object as PropType<object>, required: true },
    index: { type: Number, required: true },
    rowIndex: { type: Number, required: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessor/cell parametreleri karşıt değişken; satır tipi üstten gelir
    columns: { type: Array as PropType<Array<LayoutColumn<any>>>, required: true },
    env: { type: Object as PropType<RenderEnv>, required: true },
    /** Comfortable: `secondary` görünür (02 · Yoğunluk). */
    secondaryVisible: { type: Boolean, default: false },
    /** Birincil hücre metni: aria etiketleri ve Copy. */
    label: { type: String, default: '' },
    selectable: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    /** Sol sabit sütun yokken seçim hücresi kenar gölgesini taşır. */
    selectEdge: { type: Boolean, default: false },
    expandable: { type: Boolean, default: false },
    canExpand: { type: Boolean, default: false },
    expanded: { type: Boolean, default: false },
    subrowId: { type: String, default: undefined },
    /** ⋯ hücresi (satır menüsü). */
    menu: { type: Boolean, default: false },
    menuOpen: { type: Boolean, default: false },
    menuEdge: { type: Boolean, default: false },
    rowActions: { type: Array as PropType<RowAction[]>, default: () => [] },
    /** Satır hatası mesajları (05 §4, D35); boş = yok. */
    error: { type: Array as PropType<string[]>, default: () => [] },
    /** Satıra özgü id öneki (GridRoot uid + satır anahtarı): hata ikonu ve inline açıklamaları için. */
    uid: { type: String, default: '' },
    href: { type: String, default: undefined },
    primaryHeader: { type: String, default: undefined },
    style: { type: Object as PropType<Record<string, string>>, default: undefined },
  },
  emits: ['select', 'expand', 'menu-open', 'open', 'copy'],
  setup(props, { emit }) {
    let el: HTMLElement | null = null
    // Hücre içi widget'lar doğal Tab durağıdır (08 §2, D38). Ortak hücre render'ları DataSheet için tabindex=-1 verir; listede kalkar.
    const promote = () => {
      if (!el) return
      for (const w of el.querySelectorAll<HTMLElement>('[tabindex="-1"]')) w.removeAttribute('tabindex')
    }
    onMounted(promote)
    onUpdated(promote)
    const t = (key: string, params?: Record<string, string>) => props.env.i18n.t(key, params)

    /** Satır hatası ikonu (05 §4, D35): ⋯ hücresinde; ⋯ yoksa ilk görünür hücrede (sabit genişlikli birincil id'yi kesmesin). */
    const errorTip = () => props.error.join('\n')
    const errorId = () => `${props.uid}-err`
    const errorIcon = () =>
      h(
        'span',
        { id: errorId(), class: 'dt-row-error', role: 'img', 'aria-label': errorTip(), 'data-dt-tip': errorTip() },
        [h(PhWarningCircle, { size: 14, weight: 'fill', 'aria-hidden': 'true' })],
      )
    /** Inline satır aksiyonu (D36): ⋯ ile aynı 28 px düğme; label aria'da, açıklama tooltip'te ve gizli span'da. */
    const inlineButton = (a: RowAction) => {
      const d = a.disabled?.(props.row)
      const reason = typeof d === 'string' ? d : null
      const descId = a.description ? `${props.uid}-${a.id}` : undefined
      return h('span', { class: 'dt-row-inline-wrap' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'dt-row-inline',
            disabled: !!d,
            'aria-label': a.label,
            'aria-describedby': descId,
            'data-dt-tip': reason ?? (a.description ? `${a.label} — ${a.description}` : a.label),
            onClick: () => void a.run(toRaw(props.row)),
          },
          [h(a.icon!, { size: 16, 'aria-hidden': 'true' })],
        ),
        descId ? h('span', { id: descId, class: 'dt-sr-only' }, a.description) : null,
      ])
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderCell = (col: LayoutColumn<any>): VNodeChild => {
      const def = col.def
      const value = def.accessor ? def.accessor(props.row) : readPathFast(props.row, col.id)
      const align = alignOf(def)
      let content = renderCellContent(def, props.row, value, props.env)
      const href = def.primary && def.type !== 'id' && def.type !== 'ajax' ? def.href?.(props.row) : undefined
      if (href) content = h('a', { class: 'dt-link dt-primary-link', href }, [content])
      const actions = def.actions
      const main = h('span', { class: 'dt-cell-content' }, [content])
      const secondary =
        props.secondaryVisible && def.secondary
          ? h('span', { class: 'dt-secondary' }, def.secondary(props.row) ?? '')
          : null
      const overlay = actions?.length ? h(CellActions, { actions, row: props.row }) : null
      const withExpand = def.primary && props.expandable
      const lead = props.error.length && !props.menu && col.id === props.columns[0]?.id ? errorIcon() : null
      const children: VNodeChild[] = withExpand
        ? [
            props.canExpand
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: ['dt-expand', { 'is-open': props.expanded }],
                    'aria-expanded': props.expanded ? 'true' : 'false',
                    'aria-controls': props.subrowId,
                    'aria-label': t('expand.showAria', { id: props.label }),
                    onClick: () => emit('expand'),
                  },
                  [h(PhCaretRight, { size: 14, 'aria-hidden': 'true' })],
                )
              : h('span', { class: 'dt-expand-space', 'aria-hidden': 'true' }),
            lead,
            h('span', { class: 'dt-cell-main' }, [main, secondary]),
            overlay,
          ]
        : lead
          ? [lead, h('span', { class: 'dt-cell-main' }, [main, secondary]), overlay]
          : [main, secondary, overlay]
      return h(
        'div',
        {
          class: [
            'dt-cell',
            `is-${align}`,
            {
              'is-numeric': isNumericType(def.type),
              'is-primary': def.primary,
              'has-expand': withExpand || !!lead,
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
          role: 'cell',
          'data-col': col.id,
        },
        children,
      )
    }

    /** Seçim hücresi (05 §6, T5-01): 40 px'in tamamı tıklanır; ⇧ aralık GridRoot'ta. */
    const selectCell = () =>
      h(
        'label',
        {
          class: ['dt-cell', 'dt-cell-select', 'is-pinned-start', { 'is-pin-edge': props.selectEdge }],
          style: { left: '0px' },
          role: 'cell',
        },
        [
          h('input', {
            type: 'checkbox',
            class: 'dt-checkbox dt-select-box',
            checked: props.selected,
            'aria-label': t('row.selectAria', { id: props.label }),
            // Native toggle engellenmez: Chrome iptal edilen tıklamayı Vue'nun patch'inden sonra geri alırdı; durum üstten eşlenir.
            onClick: (e: MouseEvent) => emit('select', !props.selected, e.shiftKey),
          }),
        ],
      )
    const menuCell = () =>
      h(
        'div',
        {
          class: ['dt-cell', 'dt-cell-menu', 'is-pinned-end', { 'is-pin-edge': props.menuEdge }],
          style: { right: '0px' },
          role: 'cell',
        },
        [
          props.error.length ? errorIcon() : null,
          ...inlineActionsOf(props.rowActions, props.row).map(inlineButton),
          h(RowMenu, {
            row: props.row,
            label: props.label,
            primaryHeader: props.primaryHeader,
            href: props.href,
            actions: props.rowActions,
            open: props.menuOpen,
            'onUpdate:open': (o: boolean) => emit('menu-open', o),
            onOpen: (e: MouseEvent) => emit('open', e),
            onCopy: () => emit('copy'),
          }),
        ],
      )

    return () =>
      h(
        'div',
        {
          ref: (r) => (el = r as HTMLElement | null),
          class: [
            'dt-row',
            {
              'is-selected': props.selected,
              'is-expanded': props.expanded,
              'is-error': props.error.length > 0,
            },
          ],
          role: 'row',
          'aria-rowindex': props.rowIndex,
          'aria-describedby': props.error.length ? errorId() : undefined,
          // Satırın tamamı tooltip anchor'ı: hatalı satırda nereye gelinirse gelinsin mesaj görünür (05 §4).
          'data-dt-tip': props.error.length ? errorTip() : undefined,
          'data-index': props.index,
          style: props.style,
        },
        [
          props.selectable ? selectCell() : null,
          ...withFill(props.columns, renderCell),
          props.menu ? menuCell() : null,
        ],
      )
  },
})

/** Orta ile sağ sabit sütunlar arasındaki `auto` dolgu track'ini tutan boş hücre (useColumnLayout.colsVar). */
export const fillCell = () => h('div', { class: 'dt-cell dt-cell-fill', role: 'presentation', 'aria-hidden': 'true' })
export function withFill(
  columns: Array<LayoutColumn<object>>,
  render: (col: LayoutColumn<object>) => VNodeChild,
): VNodeChild[] {
  const at = columns.findIndex((c) => c.pinned === 'end')
  const i = at < 0 ? columns.length : at
  return [...columns.slice(0, i).map(render), fillCell(), ...columns.slice(i).map(render)]
}

function readPathFast(row: object, path: string): unknown {
  let v: unknown = row
  for (const key of path.split('.')) {
    if (v === null || v === undefined) return undefined
    v = (v as Record<string, unknown>)[key]
  }
  return v
}
