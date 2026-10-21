// İlk yükleme iskeleti (03 · Skeleton, T8-02): tipe göre biçim; metin çubuğu satırdan satıra %55–80 arası değişir.
import { defineComponent, h, type PropType } from 'vue'
import { TYPE_SPECS, alignOf } from '../cells/specs'
import type { LayoutColumn } from '../columns/useColumnLayout'
import { withFill } from './Row'

const WIDTHS = [72, 58, 80, 64, 55, 76, 61, 69]

export default defineComponent({
  name: 'DtSkeletonRow',
  props: {
    index: { type: Number, required: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: { type: Array as PropType<Array<LayoutColumn<any>>>, required: true },
    style: { type: Object as PropType<Record<string, string>>, default: undefined },
  },
  setup(props) {
    return () =>
      h(
        'div',
        { class: 'dt-row dt-row-skeleton', role: 'row', 'aria-hidden': 'true', style: props.style },
        withFill(props.columns, (col) => {
          const i = props.columns.indexOf(col)
          const shape = TYPE_SPECS[col.def.type].skeleton
          const width = `${WIDTHS[(props.index + i) % WIDTHS.length]}%`
          return h(
            'div',
            {
              class: [
                'dt-cell',
                `is-${alignOf(col.def)}`,
                {
                  'is-pinned-start': col.pinned === 'start',
                  'is-pinned-end': col.pinned === 'end',
                  'is-pin-edge': col.pinEdge,
                },
              ],
              style:
                col.pinned === 'start'
                  ? { left: `var(${col.offsetVar})` }
                  : col.pinned === 'end'
                    ? { right: `var(${col.offsetVar})` }
                    : undefined,
              role: 'gridcell',
            },
            shape === 'person'
              ? [h('span', { class: 'dt-sk dt-sk-circle' }), h('span', { class: 'dt-sk dt-sk-bar', style: { width } })]
              : shape === 'badge'
                ? h('span', { class: 'dt-sk dt-sk-pill' })
                : shape === 'number'
                  ? h('span', { class: 'dt-sk dt-sk-bar dt-sk-num' })
                  : h('span', { class: 'dt-sk dt-sk-bar', style: { width } }),
          )
        }),
      )
  },
})
