// Yerleşik dosya okuyucu (07 §13, D46): `parseFile` verilmezse kullanılır. .xlsx `read-excel-file` ile (peer, ilk
// kullanımda yüklenir), .csv paketin ayrıştırıcısıyla (`;` veya `,`, tırnaklı). Eski ikili .xls okunmaz.
import type { I18n } from '../../core/i18n'
import type { ParsedWorkbook } from '../../types/sheet'
import { parseTsv } from '../clipboard'

/** Kütüphane tarihi UTC duvar saatiyle verir; yerel güne çevrilir (cellText yerel gün okur). */
const local = (d: Date) =>
  new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds())

export async function readWorkbook(file: File, i18n: I18n): Promise<ParsedWorkbook> {
  if (/\.csv$/i.test(file.name)) {
    const text = (await file.text()).replace(/^\uFEFF/, '')
    const first = text.slice(0, text.search(/\r?\n|$/))
    const sep = first.split(';').length > first.split(',').length ? ';' : ','
    return { sheets: [{ name: file.name.replace(/\.csv$/i, ''), rows: parseTsv(text, sep) }] }
  }
  if (!/\.xlsx$/i.test(file.name)) throw new Error(i18n.t('import.xlsxOnly'))
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const sheets = await readXlsxFile(file)
  return {
    sheets: sheets.map((s) => ({
      name: s.sheet,
      rows: s.data.map((r) => r.map((v) => (v instanceof Date ? local(v) : v))),
    })),
  }
}
