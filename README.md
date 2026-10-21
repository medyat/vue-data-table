# @swors/data-table

Vue 3 için `DataTable` ve `DataSheet`: ortak çekirdek, iki bileşen. Spesifikasyon `docs/data-table/`, tasarım teslimi `docs/handoff/`, çalışma kuralları `CLAUDE.md`.

## Geliştirme

Node 22+ ve pnpm (corepack ile): `corepack enable` bir kez, sonra `pnpm install`.

| Komut                               | Ne yapar                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Playground (`playground/`, http://localhost:5174); sahte API `/api/orders`                          |
| `pnpm test`                         | Vitest: token ↔ 02, kontrast, i18n ↔ 09, ESLint sınırları, plugin/adapter                           |
| `pnpm test:e2e`                     | Playwright (playground'a karşı)                                                                     |
| `pnpm typecheck` · `pnpm lint`      | vue-tsc, ESLint (import sınırları dahil)                                                            |
| `pnpm format` · `pnpm format:check` | Prettier (biçim yalnızca Prettier'ın; ESLint biçim kuralı taşımaz)                                  |
| `pnpm build`                        | `dist/`: `index.js`, `sheet.js`, `style.css`, köprü CSS'leri, `.d.ts`                               |
| `pnpm gen:docs`                     | 02 → `src/styles/tokens.css`, 09 → `src/core/i18n/{en,tr}.ts` (üretilmiş dosyalar elle düzenlenmez) |
| `pnpm check`                        | gen:docs + typecheck + lint + format:check + test                                                   |

Token ve metin değişikliği dokümanda yapılır, sonra `pnpm gen:docs`; testler dokümanla kodun ayrışmasını yakalar.
