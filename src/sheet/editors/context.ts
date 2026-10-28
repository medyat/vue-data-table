// Yerleşik editörlerin DataSheet'ten aldığı iç bağlam (public sözleşme değil; özel editörler yalnızca props alır).
import { inject, type InjectionKey } from 'vue'

export interface SheetEditorContext {
  /** Yazarak açılan `multiselect` editöründe aramaya giden ilk metin (seçimler korunur). */
  seed: () => string | undefined
}

export const SHEET_EDITOR_KEY: InjectionKey<SheetEditorContext> = Symbol('dt-sheet-editor')

export const useSheetEditor = (): SheetEditorContext => inject(SHEET_EDITOR_KEY, { seed: () => undefined })
