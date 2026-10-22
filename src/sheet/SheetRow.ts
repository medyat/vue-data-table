// Sheet satırı + hücreler (07 §3–4, handoff 06 §5): render fonksiyonu (sanal listede yüzlerce örnek). Gutter (56 px,
// satır no + işaret), hücre durumları (editable / read-only / active / in selection / editing / changed / error / warning /
// required / new / fill target / match), editör hücrenin yerinde. Satırın taslak ve hata Map'leri prop'tur: yalnızca
// değişen satır yeniden çizilir.
import { PhCircleNotch, PhLock, PhPlus, PhWarningCircle } from '@phosphor-icons/vue'
import { defineComponent, h, type Component, type PropType, type VNodeChild } from 'vue'
import { formatCell, isEmptyValue } from '../core/cells/format'
import { cellFillStyle, renderCellContent, type RenderEnv } from '../core/cells/renderCell'
import { alignOf, isNumericType } from '../core/cells/specs'
import type { LayoutColumn } from '../core/columns/useColumnLayout'
import { withFill } from '../core/grid/Row'
import type { ColumnDef } from '../types/columns'
import { inputText } from './parse'
import type { Issue, KeyState } from './useSheetStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- satır tipi DataSheet'te; accessor parametreleri karşıt değişken
type AnyRow = any

/** Bu satırdaki seçili sütun dizini aralığı ve dış kenarlar (aralık > 1 hücre olduğunda). */
export interface RowSelection {
  from: number
  to: number
  top: boolean
  bottom: boolean
}
/** Doldurma hedefi: sütun dizini aralığı; `last` son hedef satır (alt kenar). */
export interface RowFill {
  from: number
  to: number
  last: boolean
}
export interface CellEditing {
  columnId: string
  value: unknown
  /** false: formül çubuğundan düzenleniyor; hücre editör açmaz, taslağı gösterir. */
  inCell: boolean
}

/** Sheet'te hücre içinde link yok (07 §9: "Open product" hücre menüsünde); `id`/`ajax` tipinin `href`'i çizimde düşer. */
const plainDefs = new WeakMap<ColumnDef<AnyRow>, ColumnDef<AnyRow>>()
const plain = (def: ColumnDef<AnyRow>): ColumnDef<AnyRow> => {
  if (!def.href) return def
  let p = plainDefs.get(def)
  if (!p) plainDefs.set(def, (p = { ...def, href: undefined }))
  return p
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
    /** Yeni satır (07 §9): gutter'da `+`, anahtar hücresinde New / Update / kontrol spinner'ı. */
    isNew: { type: Boolean, default: false },
    keyState: { type: String as PropType<KeyState | undefined>, default: undefined },
    /** Sunucu satır hatası (07 §14): anahtar hücresinde ve gutter ipucunda. */
    rowError: { type: String as PropType<string | undefined>, default: undefined },
    /** Aktif hücrenin sütun id'si (roving tabindex 0). */
    active: { type: String as PropType<string | null>, default: null },
    selection: { type: Object as PropType<RowSelection | null>, default: null },
    /** Fill handle'ın çizildiği hücre (tek hücrede aktif, aralıkta sağ alt köşe). */
    handleAt: { type: String as PropType<string | null>, default: null },
    fill: { type: Object as PropType<RowFill | null>, default: null },
    /** Find in grid eşleşen sütunlar. */
    found: { type: Set as PropType<Set<string>>, default: undefined },
    editing: { type: Object as PropType<CellEditing | null>, default: null },
    /** Hata balonu ilk satırda hücrenin altında (üstte header'ın altında kalırdı). */
    tipBelow: { type: Boolean, default: false },
    /** Telefonda gutter yok (07 §17). */
    gutter: { type: Boolean, default: true },
    /** Hata balonu id'leri için örnek öneki (`aria-describedby`, 08 §5). */
    uid: { type: String, default: 'dt' },
    style: { type: Object as PropType<Record<string, string>>, default: undefined },
  },
  emits: ['edit-value', 'use-suggestion'],
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
      const fill = props.fill
      const inFill = !!fill && i >= fill.from && i <= fill.to
      const ed = props.editing?.columnId === id ? props.editing : null
      const isKey = id === props.keyColumn

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
      else if (issue?.level === 'error' && isEmptyValue(value) && issue.message === t('sheet.required'))
        content = h('span', { class: 'dt-cell-content dt-cell-required' }, issue.message)
      else
        content = h('span', { class: 'dt-cell-content' }, [renderCellContent(plain(def), props.row, value, props.env)])

      const children: VNodeChild[] = [content]
      if (isKey && props.isNew && !ed)
        children.push(
          props.keyState === 'checking'
            ? h(PhCircleNotch, {
                size: 12,
                class: 'dt-tag-spin dt-spin',
                role: 'img',
                'aria-label': t('common.loading'),
              })
            : h(
                'span',
                { class: ['dt-tag-new', { 'is-update': props.keyState === 'update' }] },
                t(props.keyState === 'update' ? 'sheet.tag.update' : 'sheet.tag.new'),
              ),
        )
      if (isKey && props.rowError && !ed)
        children.push(h('span', { class: 'dt-cell-tip is-error', role: 'tooltip' }, props.rowError))
      if (!editable && !isKey)
        children.push(
          h(PhLock, { size: 12, class: 'dt-cell-lock', role: 'img', 'aria-label': t('sheet.readOnly.badge') }),
        )
      const tipId = issue ? `${props.uid}-${props.rowNo}-${i}` : undefined
      if (issue)
        children.push(
          h('span', { id: tipId, class: ['dt-cell-tip', `is-${issue.level}`], role: 'tooltip' }, [
            issue.message,
            issue.suggest
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'dt-cell-tip-btn',
                    tabindex: -1,
                    onClick: () => emit('use-suggestion', def, issue.suggest!.value),
                  },
                  t('sheet.useOption', { option: issue.suggest.label }),
                )
              : null,
          ]),
        )
      if (props.handleAt === id && !ed) children.push(h('span', { class: 'dt-fill-handle', 'aria-hidden': 'true' }))

      return h(
        'div',
        {
          class: [
            'dt-cell',
            `is-${alignOf(def)}`,
            {
              'is-numeric': isNumericType(def.type),
              'is-key': isKey,
              'is-new': isKey && props.isNew,
              'is-readonly': !editable,
              'is-active': isActive,
              'is-selected': inSel,
              'is-edge-l': inSel && i === sel!.from,
              'is-edge-r': inSel && i === sel!.to,
              'is-edge-t': inSel && sel!.top,
              'is-edge-b': inSel && sel!.bottom,
              'is-fill': inFill,
              'is-fill-end': inFill && fill!.last,
              'is-match': props.found?.has(id) ?? false,
              'is-editing': !!ed,
              'is-changed': changed,
              'is-error': issue?.level === 'error' || (isKey && !!props.rowError),
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
          'aria-describedby': tipId,
          'aria-invalid': issue?.level === 'error' ? 'true' : undefined,
          'data-col': id,
          // Öncelik Error > Warning > Changed (07 §4): hata/uyarı balonu varken "Was …" ipucu yok; yeni satırda orijinal yok.
          'data-dt-tip':
            changed && !issue && !ed && !props.isNew
              ? t('sheet.was', { value: formatCell(def, props.row, props.original(props.row, def), props.env) })
              : undefined,
        },
        children,
      )
    }

    const gutter = () => {
      let hasError = !!props.rowError
      for (const i of props.issues?.values() ?? []) if (i.level === 'error') hasError = true
      const changed = !!props.draft?.size
      return h(
        'div',
        {
          class: ['dt-cell', 'dt-gutter', 'is-pinned-start'],
          style: { left: '0px' },
          role: 'rowheader',
          'data-dt-tip': props.rowError,
        },
        [
          hasError
            ? h(PhWarningCircle, {
                size: 13,
                class: 'dt-mark is-error',
                role: 'img',
                'aria-label': t('sheet.hasErrors'),
              })
            : props.isNew
              ? h(PhPlus, { size: 13, class: 'dt-mark is-new', role: 'img', 'aria-label': t('sheet.tag.new') })
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
        [props.gutter ? gutter() : null, ...withFill(props.columns, (col) => renderCell(col, index.get(col.id)!))],
      )
    }
  },
})
