// Sütun menüsü ve header klavyesi (05 §4, 08 §3): eylem adları ve platforma göre kısayol gösterimi.
export type HeaderAction =
  | 'sort-asc'
  | 'sort-desc'
  | 'sort-clear'
  | 'pin-left'
  | 'pin-right'
  | 'unpin'
  | 'fit'
  | 'move-left'
  | 'move-right'
  | 'hide'

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
/** `⌥⇧←` / `Alt+Shift+←` (08 §3 · kbd gösterimi platforma göre). */
export const MOVE_KBD = { left: mac ? '⌥⇧←' : 'Alt+Shift+←', right: mac ? '⌥⇧→' : 'Alt+Shift+→' }
