import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

// 01 · TanStack sınırı (D23): TanStack Table yalnızca bu dört dosyada yaşar.
const TANSTACK_HOSTS = [
  'src/core/columns/useColumnLayout.ts',
  'src/list/useListTable.ts',
  'src/document/useDocumentTable.ts',
  'src/sheet/useSheetTable.ts',
]
const TANSTACK_PATTERN = {
  group: ['@tanstack/vue-table', '@tanstack/vue-table/*', '@tanstack/table-core', '@tanstack/table-core/*'],
  message:
    'TanStack Table yalnızca useColumnLayout / useListTable / useDocumentTable / useSheetTable içinde (01 · TanStack sınırı, D23).',
}

// 01 · Klasör yapısı: core/* yalnızca core/*; list/document/sheet yalnızca core/, birbirini değil.
const LAYERS = {
  core: ['list', 'document', 'sheet'],
  list: ['document', 'sheet'],
  document: ['list', 'sheet'],
  sheet: ['list', 'document'],
}

const restrict = (patterns) => ({ 'no-restricted-imports': ['error', { patterns }] })

const boundaryConfigs = Object.entries(LAYERS).flatMap(([dir, banned]) => {
  const layer = {
    group: banned.map((b) => `**/${b}/**`),
    message: `${dir}/ yalnızca core/ import eder (01 · klasör yapısı).`,
  }
  const hosts = TANSTACK_HOSTS.filter((h) => h.startsWith(`src/${dir}/`))
  return [
    { files: [`src/${dir}/**`], ignores: hosts, rules: restrict([layer, TANSTACK_PATTERN]) },
    { files: hosts, rules: restrict([layer]) },
  ]
})

export default defineConfig([
  // docs/: api-draft.ts spesifikasyon taslağıdır, kod değil.
  { ignores: ['dist/**', 'node_modules/**', 'docs/**', 'playwright-report/**', 'test-results/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // essential: hata yakalayan kurallar; biçim kuralları (attribute satırı vb.) formatter olmadan gürültü.
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    // Tarayıcı global'leri (HTMLElement, MouseEvent …) TS tarafından denetlenir; no-undef .vue'da yanlış pozitif verir.
    rules: { 'vue/multi-word-component-names': 'off', 'no-undef': 'off' },
  },
  ...boundaryConfigs,
])
