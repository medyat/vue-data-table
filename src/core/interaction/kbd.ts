// Platforma göre kısayol gösterimi (08 §3): macOS `⌘ ⌥ ⇧`, diğerleri `Ctrl Alt Shift`.
export const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const MOVE_KBD = { left: mac ? '⌥⇧←' : 'Alt+Shift+←', right: mac ? '⌥⇧→' : 'Alt+Shift+→' }
export const SAVE_KBD = mac ? '⌘S' : 'Ctrl+S'
