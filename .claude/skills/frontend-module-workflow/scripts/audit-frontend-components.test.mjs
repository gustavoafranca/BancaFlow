import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import { analyze } from './audit-frontend-components.mjs'

const execFileAsync = promisify(execFile)
const script = path.resolve('.claude/skills/frontend-module-workflow/scripts/audit-frontend-components.mjs')

async function write(root, relative, content) {
  const target = path.join(root, relative)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content, 'utf8')
}

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-frontend-components-'))

  // shared: one healthy primitive, one that (wrongly) imports from a module.
  await write(
    root,
    'apps/web/src/shared/components/ui/button.tsx',
    "export function Button() { return null }\n",
  )
  await write(
    root,
    'apps/web/src/shared/components/ui/bad-import.tsx',
    "import { PessoaBadge } from '@/modules/pessoas/components/pessoa-badge'\nexport function BadImport() { return PessoaBadge }\n",
  )
  // shared re-exporting from a module via a barrel star-export — must also be
  // caught, since `export * from` is a dependency edge, not just an import.
  await write(
    root,
    'apps/web/src/shared/components/ui/bad-reexport.ts',
    "export * from '@/modules/pessoas/components/pessoa-badge'\n",
  )

  // two modules exporting a component with the same name (repeated-name signal).
  await write(
    root,
    'apps/web/src/modules/pessoas/components/pessoa-badge.tsx',
    "export function PessoaBadge() { return null }\n",
  )
  await write(
    root,
    'apps/web/src/modules/cambistas/components/pessoa-badge.tsx',
    "export function PessoaBadge() { return null }\n",
  )

  // a module component consumed directly by its own page (must NOT be orphan).
  await write(
    root,
    'apps/web/src/modules/cambistas/components/cambistas-table.tsx',
    "export function CambistasTable() { return null }\n",
  )
  await write(
    root,
    'apps/web/src/modules/cambistas/pages/cambistas.page.tsx',
    "import { CambistasTable } from '../components/cambistas-table'\nexport function CambistasPage() { return CambistasTable }\n",
  )

  // an orphan component: nothing imports it, directly or transitively.
  await write(
    root,
    'apps/web/src/modules/cambistas/components/unused-widget.tsx',
    "export function UnusedWidget() { return null }\n",
  )

  // a component only reachable through a NAMED re-export barrel
  // (`export { X } from './x'`) one level removed from its real consumer —
  // must NOT be flagged as orphan just because nothing imports it directly.
  await write(
    root,
    'apps/web/src/modules/relatorios/components/relatorio-card.tsx',
    "export function RelatorioCard() { return null }\n",
  )
  await write(
    root,
    'apps/web/src/modules/relatorios/components/index.ts',
    "export { RelatorioCard } from './relatorio-card'\n",
  )
  await write(
    root,
    'apps/web/src/modules/relatorios/pages/relatorios.page.tsx',
    "import { RelatorioCard } from '../components'\nexport function RelatoriosPage() { return RelatorioCard }\n",
  )

  // a component only reachable through a STAR re-export barrel
  // (`export * from './x'`) consumed from a different area (app/**) two hops
  // away from the file that defines it.
  await write(
    root,
    'apps/web/src/modules/relatorios/components/relatorio-icon.tsx',
    "export function RelatorioIcon() { return null }\n",
  )
  await write(
    root,
    'apps/web/src/modules/relatorios/index.ts',
    "export * from './components/relatorio-icon'\n",
  )
  await write(
    root,
    'apps/web/src/app/(private)/relatorios/page.tsx',
    "import { RelatorioIcon } from '@/modules/relatorios'\nexport default function Page() { return RelatorioIcon }\n",
  )

  return root
}

test('flags a shared -> module import as a violation', async () => {
  const root = await fixture()
  const result = analyze(root, 'web')
  const direct = result.sharedToModuleViolations.find((v) => v.file.endsWith('bad-import.tsx'))
  assert.ok(direct, 'expected a direct import violation')
  assert.match(direct.imports, /pessoa-badge\.tsx$/)
})

test('flags a shared -> module dependency introduced via `export * from`', async () => {
  const root = await fixture()
  const result = analyze(root, 'web')
  const viaReexport = result.sharedToModuleViolations.find((v) => v.file.endsWith('bad-reexport.ts'))
  assert.ok(viaReexport, 'expected a re-export violation to be caught, not just direct imports')
  assert.match(viaReexport.imports, /pessoa-badge\.tsx$/)
})

test('flags a component name repeated across two modules', async () => {
  const root = await fixture()
  const result = analyze(root, 'web')
  const repeated = result.repeatedNames.find((entry) => entry.name === 'PessoaBadge')
  assert.ok(repeated, 'expected PessoaBadge to be flagged as repeated')
  assert.deepEqual(repeated.modules.sort(), ['cambistas', 'pessoas'])
})

test('flags a truly orphan component, but not one used by its own page', async () => {
  const root = await fixture()
  const result = analyze(root, 'web')
  assert.ok(result.orphanFiles.some((f) => f.endsWith('unused-widget.tsx')))
  assert.ok(!result.orphanFiles.some((f) => f.endsWith('cambistas-table.tsx')))
})

test('does not flag a component only reachable through a named re-export barrel', async () => {
  const root = await fixture()
  const result = analyze(root, 'web')
  assert.ok(!result.orphanFiles.some((f) => f.endsWith('relatorio-card.tsx')))
  const entry = result.components.find((c) => c.file.endsWith('relatorio-card.tsx'))
  assert.ok(entry, 'expected relatorio-card.tsx in the components inventory')
  assert.deepEqual(entry.directConsumers.map((f) => path.basename(f)), ['index.ts'])
  assert.ok(entry.consumers.some((f) => f.endsWith('relatorios.page.tsx')), 'expected the page to show up as a transitive consumer')
})

test('does not flag a component only reachable through a star re-export barrel', async () => {
  const root = await fixture()
  const result = analyze(root, 'web')
  assert.ok(!result.orphanFiles.some((f) => f.endsWith('relatorio-icon.tsx')))
  const entry = result.components.find((c) => c.file.endsWith('relatorio-icon.tsx'))
  assert.ok(entry, 'expected relatorio-icon.tsx in the components inventory')
  assert.ok(entry.consumers.some((f) => f.includes('relatorios') && f.endsWith('page.tsx')), 'expected app/**/page.tsx to show up as a transitive consumer through the module root barrel')
})

test('components inventory exposes exports/imports/consumers per file', async () => {
  const root = await fixture()
  const result = analyze(root, 'web')
  const button = result.components.find((c) => c.file.endsWith('button.tsx'))
  assert.ok(button)
  assert.deepEqual(button.exports, ['Button'])
  assert.equal(button.area, 'shared')
})

test('CLI --json produces the same shape as analyze()', async () => {
  const root = await fixture()
  const { stdout } = await execFileAsync(process.execPath, [script, '--app=web', '--json', `--project-root=${root}`])
  const parsed = JSON.parse(stdout)
  assert.equal(parsed.app, 'web')
  assert.ok(Array.isArray(parsed.components))
  assert.ok(parsed.repeatedNames.some((r) => r.name === 'PessoaBadge'))
})

test('CLI --markdown renders a human-readable report', async () => {
  const root = await fixture()
  const { stdout } = await execFileAsync(process.execPath, [script, '--app=web', '--markdown', `--project-root=${root}`])
  assert.match(stdout, /# Frontend component audit/)
  assert.match(stdout, /shared -> modules violations/)
  assert.match(stdout, /PessoaBadge/)
})

test('never modifies any fixture file (read-only guarantee)', async () => {
  const root = await fixture()
  const filesToCheck = [
    'apps/web/src/shared/components/ui/button.tsx',
    'apps/web/src/modules/cambistas/components/unused-widget.tsx',
    'apps/web/src/modules/relatorios/components/index.ts',
  ]
  const before = await Promise.all(
    filesToCheck.map((f) => fs.readFile(path.join(root, f), 'utf8')),
  )

  await execFileAsync(process.execPath, [script, '--app=web', '--json', `--project-root=${root}`])
  await execFileAsync(process.execPath, [script, '--app=web', '--markdown', `--project-root=${root}`])

  const after = await Promise.all(
    filesToCheck.map((f) => fs.readFile(path.join(root, f), 'utf8')),
  )
  assert.deepEqual(after, before)
})
