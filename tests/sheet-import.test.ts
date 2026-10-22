// Excel'den içe aktarma saf fonksiyonları (07 §13): başlık satırı tespiti, sütun eşleme (tek/kesin, normalize), hücre metni.
import { describe, expect, it } from 'vitest'
import { cellText, detectHeaderRow, matchColumns, normalizeHeader } from '../src/sheet/import/model'

describe('detectHeaderRow', () => {
  it('ilk 20 satırda en çok dolu ve çoğunluğu metin olan ilk satır; eşitlikte ilk', () => {
    expect(
      detectHeaderRow([['Ürün Fiyat Listesi'], [], ['Stok Kodu', 'Ürün Adı', 'Fiyat'], ['HC-1', 'Silindir', 10]]),
    ).toBe(2)
    expect(
      detectHeaderRow([
        ['a', 'b'],
        ['c', 'd'],
        [1, 2],
      ]),
    ).toBe(0)
    expect(
      detectHeaderRow([
        [1, 2, 3],
        ['x', 'y', 'z'],
      ]),
    ).toBe(1) // sayı satırı başlık olamaz
    expect(detectHeaderRow([])).toBe(0)
    expect(detectHeaderRow([[null, ''], ['only']])).toBe(1)
  })
})

describe('matchColumns', () => {
  const columns = [
    { id: 'sku', header: 'SKU', importAliases: ['Stok Kodu', 'Stock code'] },
    { id: 'name', header: 'Product name', importAliases: ['Ürün Adı'] },
    { id: 'listPrice', header: 'List price', importAliases: ['Liste Fiyatı'] },
    { id: 'price2', header: 'Old price', importAliases: ['Liste Fiyatı'] }, // çift aday
    { id: 'vat', header: 'VAT' },
  ]
  it('header / id / alias ile; büyük-küçük harf, boşluk ve Türkçe karakter duyarsız', () => {
    expect(matchColumns(['STOK  KODU', 'urun adi', 'Vat', 'vat ', 'name'], columns)).toEqual({
      0: 'sku',
      1: 'name',
      2: 'vat',
      3: 'vat',
      4: 'name',
    })
  })
  it('eşleşmeyen ya da birden fazla alana uyan başlık haritada yok', () => {
    expect(matchColumns(['Liste Fiyatı', 'Birim', ''], columns)).toEqual({})
  })
  it('normalizeHeader', () => {
    expect(normalizeHeader('  Tedarik Süresi (gün) ')).toBe('tedarik suresi gun')
    expect(normalizeHeader('İthalat ŞEHİR')).toBe('ithalat sehir')
  })
  it('cellText: tarih ISO, sayı olduğu gibi, boş', () => {
    expect(cellText(new Date(2026, 9, 24))).toBe('2026-10-24')
    expect(cellText(12.5)).toBe('12.5')
    expect(cellText(null)).toBe('')
    expect(cellText(' x ')).toBe('x')
  })
})
