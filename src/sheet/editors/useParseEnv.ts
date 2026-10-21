// Yerleşik hücre editörlerinin ortak çözümleme bağlamı (parse.ts): yerel ayar, bugün, "Today" sözcüğü.
import { useDataTableContext } from '../../core/plugin'
import type { ParseEnv } from '../parse'

export function useParseEnv(): () => ParseEnv {
  const { i18n, locale } = useDataTableContext()
  return () => ({ locale, today: new Date(), todayWord: i18n.t('date.today') })
}

/** Odak editöre, imleç sonda (F2 / yazarak açılış, 07 §5). */
export function focusEnd(el: HTMLInputElement | HTMLTextAreaElement | null) {
  if (!el) return
  el.focus({ preventScroll: true })
  const n = el.value.length
  el.setSelectionRange(n, n)
}
