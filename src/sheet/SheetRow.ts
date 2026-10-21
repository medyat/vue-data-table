// Sheet satırı + hücreler (07 §3–4, handoff 06 §5): render fonksiyonu (sanal listede yüzlerce örnek). Gutter (56 px,
// satır no + işaret), hücre durumları (editable / read-only / active / in selection / editing / changed / error / warning /
// required), editör hücrenin yerinde. Satırın taslak ve hata Map'leri prop'tur: yalnızca değişen satır yeniden çizilir.
import { PhLock, PhWarningCircle } from '@phosphor-icons/vue'
import { defineComponent, h, type Component, type PropType, type VNodeChild } from 'vue'
import { formatCell, isEmptyValue } from '../core/cells/format'
import { cellFillStyle, renderCellContent, type RenderEnv } from '../core/cells/renderCell'
import { alignOf, isNumericType } from '../core/cells/specs'
import type { LayoutColumn } from '../core/columns/useColumnLayout'
import { withFill } from '../core/grid/Row'
import type { ColumnDef } from '../types/columns'
import { inputText } from './parse'
import type { Issue } from './useSheetStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- satır tipi DataSheet'te; accessor parametreleri karşıt değişken
type AnyRow = any

/** Bu satırdaki seçili sütun dizini aralığı ve dış kenarlar (aralık > 1 hücre olduğunda). */
export interface RowSelection {
  from: number
  to: number
  top: boolean
  bottom: boolean
}
export interface CellEditing {
  columnId: string
  value: unknown
  /** false: formül çubuğundan düzenleniyor; hücre editör açmaz, taslağı gösterir. */
  inCell: boolean
}

export default defineComponent({
  name: 'DtSheetRow',
  props: {
    row: { type: Object as PropType<object>, required: true },
    index: { type: Number, required: true },
    /** Kararlı satır numarası (yükleme sırası, 07 §3). */
    rowNo: { type: Number, required: true },
    columns: { type: Array as PropType<Array<LayoutColumn<AnyRow>>>, required: true },
    env: { type: Object as PropType<RenderEnv>, required: true },
    keyColumn: { type: String, required: true },
    read: { type: Function as PropType<(row: AnyRow, def: ColumnDef<AnyRow>) => unknown>, required: true },
    original: { type: Function as PropType<(row: AnyRow, def: ColumnDef<AnyRow>) => unknown>, required: true },
    canEdit: { type: Function as PropType<(row: AnyRow, def: ColumnDef<AnyRow>) => boolean>, required: true },
    editorFor: { type: Function as PropType<(def: ColumnDef<AnyRow>) => Component | null>, required: true },
    draft: { type: Map as PropType<Map<string, unknown>>, default: undefined },
    issues: { type: Map as PropType<Map<string, Issue>>, default: undefined },
    /** Aktif hücrenin sütun id'si (roving tabindex 0). */
    active: { type: String as PropType<string | null>, default: null },
    selection: { type: Object as PropType<RowSelection | null>, default: null },
    editing: { type: Object as PropType<CellEditing | null>, default: null },
    /** Hata balonu ilk satırda hücrenin altında (üstte header'ın altında kalırdı). */
    tipBelow: { type: Boolean, default: false },
    style: { type: Object as PropType<Record<string, string>>, default: undefined },
  },
  emits: ['edit-value'],
  setup(props, { emit }) {
    const t = (key: string, params?: Record<string, string | number>) => props.env.i18n.t(key, params)

    const renderCell = (col: LayoutColumn<AnyRow>, i: number): VNodeChild => {
      const def = col.def
      const id = col.id
      const value = props.read(props.row, def)
      const editable = props.canEdit(props.row, def)
      const issue = props.issues?.get(id)
      const changed = props.draft?.has(id) ?? false
      const isActive = props.active === id
      const sel = props.selection
      const inSel = !!sel && i >= sel.from && i <= sel.to
      const ed = props.editing?.columnId === id ? props.editing : null

      let content: VNodeChild
      if (ed?.inCell) {
        const Editor = props.editorFor(def)!
        content = h(Editor, {
          modelValue: ed.value,
          row: props.row,
          column: def,
          'onUpdate:modelValue': (v: unknown) => emit('edit-value', v),
        })
      } else if (ed) content = h('span', { class: 'dt-cell-content' }, inputText(def, ed.value))
      else if (issue?.level === 'error' && def.required && isEmptyValue(value))
        content = h('span', { class: 'dt-cell-content dt-cell-required' }, t('sheet.required'))
      else content = h('span', { class: 'dt-cell-content' }, [renderCellContent(def, props.row, value, props.env)])

      const children: VNodeChild[] = [content]
      if (!editable && id !== props.keyColumn)
        children.push(
          h(PhLock, { size: 12, class: 'dt-cell-lock', role: 'img', 'aria-label': t('sheet.readOnly.badge') }),
        )
      if (issue)
        children.push(h('span', { class: ['dt-cell-tip', `is-${issue.level}`], role: 'tooltip' }, issue.message))
      if (isActive && !ed) children.push(h('span', { class: 'dt-fill-handle', 'aria-hidden': 'true' }))

      return h(
        'div',
        {
          class: [
            'dt-cell',
            `is-${alignOf(def)}`,
            {
              'is-numeric': isNumericType(def.type),
              'is-key': id === props.keyColumn,
              'is-readonly': !editable,
              'is-active': isActive,
              'is-selected': inSel,
              'is-edge-l': inSel && i === sel!.from,
              'is-edge-r': inSel && i === sel!.to,
              'is-edge-t': inSel && sel!.top,
              'is-edge-b': inSel && sel!.bottom,
              'is-editing': !!ed,
              'is-changed': changed,
              'is-error': issue?.level === 'error',
              'is-warning': issue?.level === 'warning',
              'is-tip-below': props.tipBelow,
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
          tabindex: isActive ? 0 : -1,
          'aria-readonly': editable ? undefined : 'true',
          'aria-selected': inSel ? 'true' : undefined,
          'data-col': id,
          // Öncelik Error > Warning > Changed (07 §4): hata/uyarı balonu varken "Was …" ipucu yok.
          'data-dt-tip':
            changed && !issue && !ed
              ? t('sheet.was', { value: formatCell(def, props.row, props.original(props.row, def), props.env) })
              : undefined,
        },
        children,
      )
    }

    const gutter = () => {
      let hasError = false
      for (const i of props.issues?.values() ?? []) if (i.level === 'error') hasError = true
      const changed = !!props.draft?.size
      return h(
        'div',
        { class: ['dt-cell', 'dt-gutter', 'is-pinned-start'], style: { left: '0px' }, role: 'rowheader' },
        [
          hasError
            ? h(PhWarningCircle, {
                size: 13,
                class: 'dt-mark is-error',
                role: 'img',
                'aria-label': t('sheet.hasErrors'),
              })
            : changed
              ? h('span', { class: 'dt-mark is-changed', role: 'img', 'aria-label': t('sheet.changed') })
              : null,
          h('span', { class: 'dt-gutter-no' }, String(props.rowNo)),
        ],
      )
    }

    return () => {
      const index = new Map(props.columns.map((c, i) => [c.id, i]))
      return h(
        'div',
        {
          class: ['dt-row', { 'is-active-row': props.active !== null }],
          role: 'row',
          'aria-rowindex': props.index + 2,
          'data-index': props.index,
          style: props.style,
        },
        [gutter(), ...withFill(props.columns, (col) => renderCell(col, index.get(col.id)!))],
      )
    }
  },
})
