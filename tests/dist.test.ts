import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Yayınlanan bildirim dosyaları yan etkili import taşımaz: `import './x.css'` TS 6'da
// (noUncheckedSideEffectImports varsayılan açık) tüketicinin tip denetimini kırar.
const entries = ['dist/index.d.ts', 'dist/sheet.d.ts']

describe.skipIf(!existsSync('dist/index.d.ts'))('dist bildirimleri', () => {
  it.each(entries)('%s yan etkili import içermez', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/^import\s+['"][^'"]+['"]/m)
  })

  // Tipler giriş başına tek dosyada paketlenir (bundleTypes): `nodenext` çözümlemesinde de çözülür.
  it.each(entries)('%s göreli import içermez', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/from\s*['"]\.\//)
  })
})

// `dependencies`'teki paketler dışarıda bırakılır (Vite library mode): tüketici tek kopya yükler.
describe.skipIf(!existsSync('dist/sheet.js'))('dist bağımlılıkları', () => {
  const js = readdirSync('dist').filter((f) => f.endsWith('.js'))
  const code = js.map((f) => readFileSync(`dist/${f}`, 'utf8')).join('\n')

  it('@internationalized/date gömülü değil, dış import', () => {
    expect(js.some((f) => f.startsWith('CalendarDate-'))).toBe(false)
    expect(code).toMatch(/from\s*["']@internationalized\/date["']/)
  })

  // D46: Excel kütüphaneleri peer; gömülmez, ilk Import/Export'ta dinamik yüklenir (ilk açılış bundle'ına girmez).
  it('read-excel-file / write-excel-file gömülü değil, dinamik import', () => {
    expect(code).not.toMatch(/No `format` was specified for a `Date`/)
    for (const m of ['read-excel-file/browser', 'write-excel-file/browser', 'write-excel-file/utility'])
      expect(code).toContain(`import("${m}")`)
    expect(code).not.toMatch(/from\s*["'](read|write)-excel-file/)
  })
})
