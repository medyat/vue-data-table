// @vitest-environment node
// Faz 0 kabul kriteri: ESLint, grid/'den TanStack import'unu reddeder; katman sınırları (01) çalışır.
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) })

async function restricted(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return result!.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message)
}

describe('import sınırları', () => {
  it('grid/ TanStack Table import edemez', async () => {
    const msgs = await restricted(
      'src/core/grid/Row.ts',
      "import { useVueTable } from '@tanstack/vue-table'\nexport const x = useVueTable",
    )
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toContain('TanStack')
  })
  it('useColumnLayout, useListTable, useSheetTable edebilir', async () => {
    for (const f of ['src/core/columns/useColumnLayout.ts', 'src/list/useListTable.ts', 'src/sheet/useSheetTable.ts']) {
      expect(
        await restricted(f, "import { useVueTable } from '@tanstack/vue-table'\nexport const x = useVueTable"),
      ).toEqual([])
    }
  })
  it('core/ list/, sheet/ import edemez', async () => {
    expect(
      await restricted('src/core/cells/x.ts', "import { a } from '../../list/useListTable'\nexport const b = a"),
    ).toHaveLength(1)
    expect(
      await restricted(
        'src/core/columns/useColumnLayout.ts',
        "import { a } from '../../sheet/useSheetTable'\nexport const b = a",
      ),
    ).toHaveLength(1)
  })
  it('list/ ve sheet/ birbirini import edemez, core/ edebilir', async () => {
    expect(
      await restricted('src/list/x.ts', "import { a } from '../sheet/useSheetTable'\nexport const b = a"),
    ).toHaveLength(1)
    expect(
      await restricted('src/sheet/x.ts', "import { a } from '../list/useListTable'\nexport const b = a"),
    ).toHaveLength(1)
    expect(await restricted('src/list/x.ts', "import { a } from '../core/plugin'\nexport const b = a")).toEqual([])
  })
})
