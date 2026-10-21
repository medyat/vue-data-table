// Hücre girişlerinin çözümlenmesi (07 §5, §7): sayı yerel ayara göre ("2240", "2.240,00", "2,240.00"; "%20" → 20),
// tarih "24.10", "24.10.2026", "+7d", "today"/"bugün", ISO; seçenek etiketle (büyük/küçük harf ve İ/ı duyarsız).
// Çözülemeyen giriş ham metin olarak kalır; doğrulama onu tip hatası sayar (useSheetStore).
import { optionLabel } from '../core/cells/format'
import { TYPE_SPECS } from '../core/cells/specs'
import { isoDay } from '../core/filters/model'
import { parseNumber } from '../core/format/parse'
import type { ColumnDef } from '../types/columns'

export interface ParseEnv {
  locale: string
  today: Date
  /** i18n `date.today` ("Today" / "Bugün"); "today" her dilde kabul edilir. */
  todayWord: string
}

const fold = (s: string, locale: string): string => s.trim().toLocaleLowerCase(locale).replace(/ı|i̇/g, 'i')

const validDay = (y: number, m: number, d: number): string | null => {
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? isoDay(dt) : null
}

/** "24.10" (bu yıl), "24.10.2026", "24/10/26", "+7d", "-3d", "today", ISO. Çözülemezse null. */
export function parseDateInput(text: string, env: ParseEnv): string | null {
  const s = text.trim()
  if (!s) return null
  const low = fold(s, env.locale)
  if (low === 'today' || low === fold(env.todayWord, env.locale)) return isoDay(env.today)
  const rel = /^([+-])(\d+)d$/i.exec(s)
  if (rel) {
    const d = new Date(env.today)
    d.setDate(d.getDate() + (rel[1] === '-' ? -1 : 1) * Number(rel[2]))
    return isoDay(d)
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return validDay(+iso[1]!, +iso[2]!, +iso[3]!)
  const dmy = /^(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?$/.exec(s)
  if (dmy) {
    const y = dmy[3] ? (dmy[3].length === 2 ? 2000 + +dmy[3] : +dmy[3]) : env.today.getFullYear()
    return validDay(y, +dmy[2]!, +dmy[1]!)
  }
  return null
}

/** Editör / formül çubuğu metni → hücre değeri. Boş → null; çözülemeyen → ham metin (tip hatası). */
export function parseInput(def: ColumnDef, text: string, env: ParseEnv): unknown {
  const s = text.trim()
  if (s === '') return null
  if (TYPE_SPECS[def.type].numeric || def.type === 'star') {
    // Formül desteklenmez (07 §2): "=" ile başlayan giriş sayı sütununda hata olarak kalır.
    if (s.startsWith('=')) return s
    return parseNumber(env.locale, s) ?? s
  }
  switch (def.type) {
    case 'date':
    case 'datetime':
      return parseDateInput(s, env) ?? s
    case 'select': {
      const o = def.options.find(
        (opt) => fold(opt.label, env.locale) === fold(s, env.locale) || String(opt.value) === s,
      )
      return o ? o.value : s
    }
    case 'uppercase':
      return s.toLocaleUpperCase(env.locale)
    case 'lowercase':
      return s.toLocaleLowerCase(env.locale)
    default:
      return s
  }
}

/** Hücre değeri → editör / formül çubuğunun ham metni. */
export function inputText(def: ColumnDef, value: unknown): string {
  if (value === null || value === undefined) return ''
  if (def.type === 'select') return optionLabel(def.options, value)
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
