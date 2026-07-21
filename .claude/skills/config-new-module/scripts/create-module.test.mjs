import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const script = path.resolve('.claude/skills/config-new-module/scripts/create-module.mjs')

async function write(root, relative, content) {
  const target = path.join(root, relative)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content, 'utf8')
}

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'config-new-module-'))
  await write(root, '.claude/skills/skills.config.json', JSON.stringify({
    namespace: '@fixture',
    sharedModulePath: 'packages/shared',
    frontendAppPath: 'apps/web',
    backendAppPath: 'apps/backend',
  }))
  await write(root, 'packages/shared/package.json', JSON.stringify({ name: '@fixture/shared' }))
  await write(root, 'packages/typescript-config/base.json', '{}')
  await write(root, 'apps/backend/package.json', JSON.stringify({ name: '@fixture/backend', dependencies: {} }))
  await write(root, 'apps/backend/src/app.module.ts', "import { Module } from '@nestjs/common'\n\n@Module({ imports: [] })\nexport class AppModule {}\n")
  await write(root, 'apps/web/package.json', JSON.stringify({ name: '@fixture/web', dependencies: {} }))
  await write(root, 'apps/web/src/app/(private)/cambistas/page.tsx', 'export default function Page() { return null }\n')
  return root
}

async function run(root, ...args) {
  return execFileAsync(process.execPath, [script, 'participants', '--project-root', root, ...args])
}

test('dry-run previews a full-stack boundary without writing files', async (t) => {
  const root = await fixture()
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const { stdout } = await run(root, '--mode', 'fullstack', '--route', 'cambistas', '--dry-run')
  assert.match(stdout, /Module boundary ready/)
  await assert.rejects(fs.access(path.join(root, 'modules/participants/package.json')))
  assert.equal(await fs.readFile(path.join(root, 'apps/web/src/app/(private)/cambistas/page.tsx'), 'utf8'), 'export default function Page() { return null }\n')
})

test('json dry-run emits a parseable summary without progress noise', async (t) => {
  const root = await fixture()
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const { stdout } = await run(root, '--mode', 'fullstack', '--route', 'cambistas', '--dry-run', '--json')
  const summary = JSON.parse(stdout)
  assert.equal(summary.module, 'participants')
  assert.equal(summary.dryRun, true)
  assert.match(summary.route, /cambistas\/page\.tsx$/)
})

test('fullstack creates only boundaries and preserves the associated route', async (t) => {
  const root = await fixture()
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await run(root, '--mode', 'fullstack', '--route', 'cambistas')

  await fs.access(path.join(root, 'modules/participants/src/index.ts'))
  await fs.access(path.join(root, 'apps/backend/src/modules/participants/participants.module.ts'))
  await fs.access(path.join(root, 'apps/backend/prisma/models/participants.model.prisma'))
  await fs.access(path.join(root, 'apps/web/src/modules/participants/index.ts'))
  await assert.rejects(fs.access(path.join(root, 'apps/backend/src/modules/participants/participants.controller.ts')))
  await assert.rejects(fs.access(path.join(root, 'apps/backend/src/modules/participants/participants.prisma.ts')))
  await assert.rejects(fs.access(path.join(root, 'apps/web/src/modules/participants/pages/dashboard.page.tsx')))

  const appModule = await fs.readFile(path.join(root, 'apps/backend/src/app.module.ts'), 'utf8')
  assert.match(appModule, /ParticipantsModule/)
  const backendPackage = JSON.parse(await fs.readFile(path.join(root, 'apps/backend/package.json'), 'utf8'))
  const webPackage = JSON.parse(await fs.readFile(path.join(root, 'apps/web/package.json'), 'utf8'))
  assert.equal(backendPackage.dependencies['@fixture/participants'], '*')
  assert.equal(webPackage.dependencies['@fixture/participants'], '*')
  assert.equal(await fs.readFile(path.join(root, 'apps/web/src/app/(private)/cambistas/page.tsx'), 'utf8'), 'export default function Page() { return null }\n')
})

test('repeated execution is idempotent and preserves generated boundaries', async (t) => {
  const root = await fixture()
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await run(root, '--mode', 'fullstack', '--route', 'cambistas')
  const watched = [
    'modules/participants/package.json',
    'apps/backend/src/app.module.ts',
    'apps/backend/package.json',
    'apps/web/package.json',
  ]
  const before = await Promise.all(watched.map((file) => fs.readFile(path.join(root, file), 'utf8')))
  await run(root, '--mode', 'fullstack', '--route', 'cambistas')
  const after = await Promise.all(watched.map((file) => fs.readFile(path.join(root, file), 'utf8')))
  assert.deepEqual(after, before)
})

test('domain-only does not create backend or web boundaries', async (t) => {
  const root = await fixture()
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await run(root, '--mode', 'domain-only')
  await fs.access(path.join(root, 'modules/participants/package.json'))
  await assert.rejects(fs.access(path.join(root, 'apps/backend/src/modules/participants')))
  await assert.rejects(fs.access(path.join(root, 'apps/web/src/modules/participants')))
})
