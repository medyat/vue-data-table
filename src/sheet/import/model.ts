// Excel'den içe aktarma — saf fonksiyonlar (07 §13, 01): başlık satırı tespiti ve sütun eşleme dosya biçiminden
// bağımsızdır (.xlsx ve .csv aynı yol); `@medyat/vue-data-table/sheet`'ten dışa verilir ve ayrı test edilir.
import { isoDay } from '../../core/filters/model'
import type { ColumnDef } from '../../types/columns'

/** Hücre metni: tarih yerel gün olarak ISO, sayı olduğu gibi, boş → ''. */
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : isoDay(v)
  return String(v).trim()
}

/** Başlık normalizasyonu: küçük harf, baştaki/sondaki ve ardışık boşluklar, Türkçe karakterler (ı→i, ş→s …). */
const TR: Record<string, string> = { ı: 'i', i̇: 'i', ş: 's', ğ: 'g', ç: 'c', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u' }
export const normalizeHeader = (s: string): string =>
  s
    .toLocaleLowerCase('tr')
    .replace(/ı|i̇|ş|ğ|ç|ö|ü|â|î|û/g, (ch) => TR[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const isNumberLike = (s: string) => /^[-+]?[\d.,\s]*\d[\d.,\s]*%?$/.test(s)

/**
 * Başlık satırı: ilk 20 satır içinde, boş olmayan hücre sayısı en yüksek ve hücrelerinin çoğu metin olan ilk satır;
 * eşitlikte ilk boş olmayan satır. Hiç aday yoksa 0.
 */
export function detectHeaderRow(rows: unknown[][]): number {
  let best = -1
  let bestScore = -1
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cells = (rows[i] ?? []).map(cellText).filter(Boolean)
    if (!cells.length) continue
    const textual = cells.filter((c) => !isNumberLike(c)).length
    if (textual * 2 < cells.length) continue
    if (cells.length > bestScore) {
      bestScore = cells.length
      best = i
    }
  }
  if (best >= 0) return best
  const first = rows.findIndex((r) => (r ?? []).some((c) => cellText(c) !== ''))
  return first < 0 ? 0 : first
}

/**
 * Otomatik eşleme: başlık normalize edilerek sütunun `header`, `id` ya da `importAliases` değerlerinden biriyle aynıysa
 * ve yalnızca tek bir sütuna uyuyorsa. Eşleşmeyen ya da birden fazla sütuna uyan başlık haritada yoktur.
 */
export function matchColumns(
  headers: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Array<Pick<ColumnDef<any>, 'id' | 'header' | 'importAliases'>>,
): Record<number, string> {
  const out: Record<number, string> = {}
  const names = columns.map((c) => new Set([c.header, String(c.id), ...(c.importAliases ?? [])].map(normalizeHeader)))
  headers.forEach((h, i) => {
    const n = normalizeHeader(h)
    if (!n) return
    const hits = columns.filter((_, j) => names[j]!.has(n))
    if (hits.length === 1) out[i] = String(hits[0]!.id)
  })
  return out
}
