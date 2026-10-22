// Doldurma (07 §8): kaynak en az iki sayı ve sabit artışlıysa seri devam eder (1, 2, 3 / 10, 20), aksi halde kaynak
// döngüyle kopyalanır. Yukarı doldurmada seri geriye gider, kopya sondan başlar.

/** `count` hedef değer; `up` yukarı yön. */
export function fillValues(source: unknown[], count: number, up = false): unknown[] {
  if (!source.length || count <= 0) return []
  const nums = source.every((v) => typeof v === 'number') ? (source as number[]) : null
  if (nums && nums.length >= 2) {
    const step = nums[1]! - nums[0]!
    if (nums.every((v, i) => i === 0 || Math.abs(v - nums[i - 1]! - step) < 1e-9)) {
      const base = up ? nums[0]! : nums[nums.length - 1]!
      const dir = up ? -1 : 1
      return Array.from({ length: count }, (_, i) => round(base + dir * step * (i + 1)))
    }
  }
  const n = source.length
  return Array.from({ length: count }, (_, i) => (up ? source[(n - 1 - (i % n) + n) % n] : source[i % n]))
}

/** Kayan nokta artığı (0.1 + 0.2) görünmesin: 10 anlamlı basamak. */
const round = (n: number): number => Number(n.toPrecision(10))
