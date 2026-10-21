// 24 tipin hücre içeriği (03, brief §5.1, T8). Kabuk (hizalama, kesme, yoğunluk, zemin) Cell.vue'da; burada yalnızca içerik.
import { PhArrowUpRight, PhArrowsOutSimple, PhCheck, PhMinus, PhStar, PhX } from '@phosphor-icons/vue'
import { h, type Component, type VNodeChild } from 'vue'
import type { ColumnDef, OptionDef, UserOption } from '../../types/columns'
import type { Density, Tone } from '../../types/core'
import { currencyCode, formatArrayItem, formatCell, isEmptyValue, optionLabel, urlHost, type FormatEnv } from './format'

export interface RenderEnv extends FormatEnv {
  density: Density
  /** `pointer: coarse`: telefon numarası tel: linki olur. */
  coarse: boolean
}

type ToneRef = Tone | { light: string; dark: string } | undefined

const toneClass = (tone: ToneRef): string => (typeof tone === 'object' ? 'dt-tone-custom' : `dt-tone-${tone ?? 'gray'}`)
const toneStyle = (tone: ToneRef) =>
  typeof tone === 'object' ? { '--dt-tone-light': tone.light, '--dt-tone-dark': tone.dark } : undefined

/** Avatar rengi kişiye sabit: id hash'i → 6 tondan biri (02). */
const AVATAR_TONES: Tone[] = ['blue', 'green', 'amber', 'violet', 'pink', 'teal']
export function avatarTone(id: string | number): Tone {
  let hash = 0
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]!
}
export const initialsOf = (label: string): string =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase())
    .join('')

export function badge(tone: ToneRef, label: string, icon?: Component): VNodeChild {
  return h('span', { class: ['dt-badge', toneClass(tone)], style: toneStyle(tone) }, [
    icon
      ? h(icon, { class: 'dt-badge-icon', size: 11, weight: 'bold', 'aria-hidden': 'true' })
      : h('span', { class: 'dt-badge-dot', 'aria-hidden': 'true' }),
    h('span', { class: 'dt-badge-label' }, label),
  ])
}
const tag = (label: string): VNodeChild => h('span', { class: 'dt-tag' }, label)
const more = (count: number, tip: string, cls = 'dt-more'): VNodeChild =>
  h('span', { class: cls, 'data-dt-tip': tip }, `+${count}`)
const mono = (text: string): VNodeChild => h('span', { class: 'dt-mono' }, text)

export function avatar(user: Partial<UserOption> & { value: string | number; label: string }): VNodeChild {
  return h(
    'span',
    {
      class: ['dt-avatar', `dt-tone-${avatarTone(user.value)}`],
      style: user.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")` } : undefined,
      'aria-hidden': 'true',
    },
    user.avatarUrl ? '' : (user.initials ?? initialsOf(user.label)),
  )
}

function stars(value: number, max: number, label: string): VNodeChild {
  return h(
    'span',
    { class: 'dt-stars', role: 'img', 'aria-label': label, 'data-dt-tip': label },
    Array.from({ length: max }, (_, i) =>
      h(PhStar, { size: 14, weight: i < value ? 'fill' : 'regular', class: i < value ? 'is-on' : undefined }),
    ),
  )
}

function bar(pct: number, label: string): VNodeChild {
  return h('span', { class: 'dt-bar' }, [
    h('span', { class: 'dt-bar-track', 'aria-hidden': 'true' }, [
      h('span', { class: 'dt-bar-fill', style: { width: `${Math.max(0, Math.min(100, pct))}%` } }),
    ]),
    h('span', { class: 'dt-bar-label' }, label),
  ])
}

const link = (href: string, children: VNodeChild, external = false): VNodeChild =>
  h('a', { class: 'dt-link', href, tabindex: -1, ...(external && { target: '_blank', rel: 'noopener' }) }, [children])

/** `color` + `display: 'fill'`: hücre boyanır, yazı rengi kontrasta göre (03). */
export function cellFillStyle<Row extends object>(
  def: ColumnDef<Row>,
  value: unknown,
): Record<string, string> | undefined {
  if (def.type !== 'color' || def.display !== 'fill' || typeof value !== 'string') return undefined
  const m = /^#?([0-9a-f]{6})$/i.exec(value)
  if (!m) return { background: value }
  const n = parseInt(m[1]!, 16)
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
  return { background: value, color: lum > 0.55 ? 'var(--dt-fill-text-dark)' : 'var(--dt-fill-text-light)' }
}

function resolveUsers<Row extends object>(
  def: Extract<ColumnDef<Row>, { type: 'user' }>,
  ids: Array<string | number>,
  env: RenderEnv,
): Array<UserOption> {
  return ids.map((id) => {
    const o =
      def.options?.find((u) => u.value === id) ??
      (env.labels.option(def.id as string, def.remote, id) as UserOption | undefined)
    return o ?? { value: id, label: String(id) }
  })
}

export function renderCellContent<Row extends object>(
  def: ColumnDef<Row>,
  row: Row,
  value: unknown,
  env: RenderEnv,
): VNodeChild {
  const formatted = formatCell(def, row, value, env)
  if (def.cell) {
    // Tipli bağlam: `value` tipe göre daralır; burada tek yerde `unknown`dan geçilir.
    return (def.cell as (ctx: unknown) => VNodeChild)({
      row,
      value,
      formatted,
      column: { id: def.id, type: def.type },
      density: env.density,
    })
  }
  if (isEmptyValue(value)) {
    if (def.type === 'user') {
      return h('span', { class: 'dt-user is-empty' }, [
        h('span', { class: 'dt-avatar is-empty', 'aria-hidden': 'true' }),
        env.i18n.t('common.unassigned'),
      ])
    }
    return h('span', { class: 'dt-empty' }, formatted)
  }
  const { fmt, i18n } = env
  switch (def.type) {
    case 'int':
    case 'float':
      return formatted
    case 'percentage':
      return def.display === 'bar' ? bar(Number(value), formatted) : formatted
    case 'star':
      return stars(Number(value), def.max ?? 5, formatted)
    case 'currency':
      return [
        fmt.decimal(Number(value), def.decimalPlaces ?? 2),
        h('span', { class: 'dt-ccy' }, currencyCode(def, row)),
      ]
    case 'string':
    case 'uppercase':
    case 'lowercase':
    case 'email':
      return formatted
    case 'phone':
      return env.coarse ? link(`tel:${formatted}`, formatted) : formatted
    case 'text': {
      const firstLine = formatted.split('\n')[0]!
      return h('span', { class: 'dt-text' }, [
        h('span', { class: 'dt-text-first' }, firstLine),
        h(
          'button',
          {
            type: 'button',
            class: 'dt-text-expand',
            tabindex: -1,
            'aria-label': i18n.t('cell.expandText'),
            'data-dt-tip': formatted,
          },
          [h(PhArrowsOutSimple, { size: 14, 'aria-hidden': 'true' })],
        ),
      ])
    }
    case 'color':
      return def.display === 'fill'
        ? mono(formatted)
        : [h('span', { class: 'dt-swatch', style: { background: formatted }, 'aria-hidden': 'true' }), mono(formatted)]
    case 'url':
      return link(
        String(value),
        [urlHost(String(value)), h(PhArrowUpRight, { size: 12, class: 'dt-link-icon', 'aria-hidden': 'true' })],
        true,
      )
    case 'id': {
      const href = def.href?.(row)
      return href ? link(href, mono(formatted)) : mono(formatted)
    }
    case 'boolean':
      return value
        ? badge('green', formatted, PhCheck)
        : badge(
            def.falseTone === 'destructive' ? 'red' : 'gray',
            formatted,
            def.falseTone === 'destructive' ? PhX : PhMinus,
          )
    case 'select': {
      const opt = def.options.find((o) => o.value === value)
      return opt ? badge(opt.tone, opt.label) : badge('gray', String(value))
    }
    case 'multiselect': {
      const vals = value as Array<string | number>
      const shown = vals.slice(0, 2).map((v) => {
        const opt = def.options.find((o) => o.value === v)
        return opt ? badge(opt.tone, opt.label) : badge('gray', String(v))
      })
      return h('span', { class: 'dt-badges' }, [
        ...shown,
        vals.length > 2 ? more(vals.length - 2, fmt.list(vals.slice(2).map((v) => optionLabel(def.options, v)))) : null,
      ])
    }
    case 'tags': {
      const vals = value as string[]
      return h('span', { class: 'dt-badges' }, [
        ...vals.slice(0, 2).map(tag),
        vals.length > 2 ? more(vals.length - 2, fmt.list(vals.slice(2))) : null,
      ])
    }
    case 'ajax': {
      const href = def.href?.(row)
      return href ? link(href, formatted) : formatted
    }
    case 'user': {
      const ids = (Array.isArray(value) ? value : [value]) as Array<string | number>
      const users = resolveUsers(def, ids, env)
      if (users.length === 1)
        return h('span', { class: 'dt-user' }, [
          avatar(users[0]!),
          h('span', { class: 'dt-user-name' }, users[0]!.label),
        ])
      return h('span', { class: 'dt-user dt-avatars' }, [
        ...users.slice(0, 3).map(avatar),
        users.length > 3
          ? more(users.length - 3, fmt.list(users.slice(3).map((u) => u.label)), 'dt-more dt-more-pill')
          : null,
      ])
    }
    case 'date':
    case 'datetime': {
      const overdue = typeof def.overdue === 'function' ? def.overdue(row) : def.overdue
      const late = overdue ? fmt.daysLate(value as string | Date, env.today) : 0
      const tip = def.type === 'datetime' ? fmt.dateTimeFull(value as string | Date) : undefined
      if (late > 0)
        return h(
          'span',
          { class: 'dt-late', 'data-dt-tip': tip },
          `${formatted} · ${i18n.t('cell.late', { count: late })}`,
        )
      return tip ? h('span', { 'data-dt-tip': tip }, formatted) : formatted
    }
    case 'object':
      return [h('span', { class: 'dt-struct', 'aria-hidden': 'true' }, '{ }'), formatted]
    case 'array': {
      const items = value as unknown[]
      const shown = items.slice(0, 3).map((v) => formatArrayItem(def.itemType, v, fmt))
      return [
        h('span', { class: 'dt-struct', 'aria-hidden': 'true' }, '[ ]'),
        shown.join(', '),
        items.length > 3 ? [' ', more(items.length - 3, formatted)] : null,
      ]
    }
  }
}

export const isOption = (o: unknown): o is OptionDef =>
  typeof o === 'object' && o !== null && 'value' in o && 'label' in o
