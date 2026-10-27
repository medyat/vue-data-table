import type { RowAction } from '../../types/list'

/** Satırda inline çizilen aksiyonlar (D36): `inline` + `icon` + `when(row)`; ilk 2. GridRoot genişlik için, RowMenu menüden düşmek için aynı listeyi kullanır. */
export const inlineActionsOf = (actions: RowAction[], row: object): RowAction[] =>
  actions.filter((a) => a.inline && a.icon && (!a.when || a.when(row))).slice(0, 2)
