#!/usr/bin/env node

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveNamespace, resolveSkillPaths } from '../../utils/resolve-skill-config.mjs'
import { createSkillRunLogger } from '../../utils/skill-run-log.mjs'
import { createSkillRunOps } from '../../utils/skill-run-ops.mjs'

const MODES = {
  'domain-only': { domain: true, backend: false, web: false },
  'backend-only': { domain: false, backend: true, web: false },
  'web-only': { domain: false, backend: false, web: true },
  'domain-backend': { domain: true, backend: true, web: false },
  fullstack: { domain: true, backend: true, web: true },
}

function usage() {
  console.log(`Usage:
  node create-module.mjs <module-name> [options]

Options:
  --mode <mode>          domain-only | backend-only | web-only | domain-backend | fullstack
  --route <path>         Existing frontend route associated with the module (example: cambistas)
  --scope <namespace>    Override package namespace (example: @bancaflow)
  --project-root <path>  Project root; useful for validation fixtures
  --dry-run              Preview without changing project files or logs
  --json                 Print a machine-readable summary
  --help                 Show this help

The scaffold creates boundaries only. It never creates example CRUD, controllers,
Prisma adapters, business models, dashboards, routes or menu entries.`)
}

function parseArgs(argv) {
  const parsed = {
    moduleName: '',
    mode: 'fullstack',
    route: '',
    scope: '',
    projectRoot: '',
    dryRun: false,
    json: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    }
    if (arg === '--dry-run') {
      parsed.dryRun = true
      continue
    }
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (['--mode', '--route', '--scope', '--project-root'].includes(arg)) {
      const value = argv[index + 1]
      if (!value) throw new Error(`Missing value for ${arg}`)
      const key = {
        '--mode': 'mode',
        '--route': 'route',
        '--scope': 'scope',
        '--project-root': 'projectRoot',
      }[arg]
      parsed[key] = value
      index += 1
      continue
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`)
    if (parsed.moduleName) throw new Error('Only one module name is allowed.')
    parsed.moduleName = arg
  }

  return parsed
}

function validateModuleName(name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid module name '${name}'. Use lowercase kebab-case.`)
  }
}

function normalizeRoute(route) {
  if (!route) return ''
  const normalized = route.trim().replace(/^\/+|\/+$/g, '')
  if (!normalized || normalized.split('/').some((part) => !/^[a-z0-9][a-z0-9-]*$/.test(part))) {
    throw new Error(`Invalid route '${route}'. Use relative lowercase kebab-case segments.`)
  }
  return normalized
}

function toPascalCase(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function toPosix(value) {
  return value.replace(/\\/g, '/')
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function previewLogger(rootDir, quiet = false) {
  function relative(targetPath) {
    return toPosix(path.relative(rootDir, targetPath))
  }
  const print = quiet ? () => {} : (message) => console.log(message)
  const printRisk = quiet ? () => {} : (message) => console.warn(message)
  return {
    step: (message) => print(`[DRY-RUN] ${message}`),
    info: (message) => print(`[DRY-RUN] ${message}`),
    warn: (message) => printRisk(`[DRY-RUN] ${message}`),
    risk: (message) => printRisk(`[DRY-RUN][RISK] ${message}`),
    ai: (message) => print(`[DRY-RUN] ${message}`),
    command: () => {},
    file: (action, targetPath) => print(`[DRY-RUN][${action.toUpperCase()}] ${relative(targetPath)}`),
    success: async () => {},
    failure: async () => {},
  }
}

async function writeGeneratedFile({ ops, logger, filePath, content, label, summary }) {
  if (await pathExists(filePath)) {
    const existing = await fs.readFile(filePath, 'utf8')
    const normalized = content.endsWith('\n') ? content : `${content}\n`
    if (existing === normalized) {
      logger.step(`${label} já está correto: ${filePath}`)
      summary.preserved.push(filePath)
      return
    }
    logger.risk(`${label} já existe e foi preservado sem sobrescrita: ${filePath}`)
    summary.preserved.push(filePath)
    return
  }

  await ops.writeTextFile(filePath, content, { note: label, markRiskOnOverwrite: false })
  summary.created.push(filePath)
}

async function ensureDependency({ ops, logger, packageJsonPath, dependency, summary }) {
  if (!(await pathExists(packageJsonPath))) {
    throw new Error(`Missing package.json: ${packageJsonPath}`)
  }
  const packageJson = await readJson(packageJsonPath)
  const dependencies = { ...(packageJson.dependencies ?? {}) }
  if (dependencies[dependency] === '*') return
  dependencies[dependency] = '*'
  packageJson.dependencies = Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)))
  await ops.writeJsonFile(packageJsonPath, packageJson, {
    note: `workspace dependency ${dependency}`,
    markRiskOnOverwrite: false,
  })
  logger.step(`Dependência registrada: ${dependency} em ${packageJsonPath}`)
  summary.updated.push(packageJsonPath)
}

function addBackendModuleRegistration(source, moduleName, moduleClassName) {
  const importPath = `./modules/${moduleName}/${moduleName}.module`
  const importLine = `import { ${moduleClassName}Module } from '${importPath}';`
  let updated = source

  if (!updated.includes(`from '${importPath}'`) && !updated.includes(`from "${importPath}"`)) {
    const imports = [...updated.matchAll(/^import[^\n]+\n/gm)]
    const insertAt = imports.length ? imports.at(-1).index + imports.at(-1)[0].length : 0
    updated = `${updated.slice(0, insertAt)}${importLine}\n${updated.slice(insertAt)}`
  }

  const importsArray = /imports:\s*\[([\s\S]*?)\](?=\s*[,}])/m
  const match = updated.match(importsArray)
  if (!match) throw new Error('Could not locate NestJS imports array in app.module.ts')
  if (!new RegExp(`\\b${moduleClassName}Module\\b`).test(match[1])) {
    const inner = match[1]
    const nextInner = inner.trim() ? `\n    ${moduleClassName}Module,${inner}` : `\n    ${moduleClassName}Module,\n  `
    updated = updated.replace(importsArray, `imports: [${nextInner}]`)
  }
  return updated
}

async function ensureBackendRegistration({ ops, logger, appModulePath, moduleName, moduleClassName, summary }) {
  if (!(await pathExists(appModulePath))) throw new Error(`Missing backend AppModule: ${appModulePath}`)
  const source = await fs.readFile(appModulePath, 'utf8')
  const updated = addBackendModuleRegistration(source, moduleName, moduleClassName)
  if (updated === source) return
  await ops.writeTextFile(appModulePath, updated, {
    ensureNewline: false,
    note: `${moduleName} module registration`,
    markRiskOnOverwrite: false,
  })
  logger.step(`Módulo NestJS registrado: ${moduleName}`)
  summary.updated.push(appModulePath)
}

async function resolveAssociatedRoute({ rootDir, frontendAppPath, route, logger, summary }) {
  if (!route) return
  const appDir = path.join(rootDir, frontendAppPath, 'src', 'app')
  const privateDir = path.join(appDir, '(private)')
  const routeBase = (await pathExists(privateDir)) ? privateDir : appDir
  const routeFile = path.join(routeBase, ...route.split('/'), 'page.tsx')
  summary.route = routeFile
  if (await pathExists(routeFile)) {
    logger.step(`Rota existente associada e preservada: ${routeFile}`)
    return
  }
  logger.risk(`Rota associada não existe; o scaffold não cria páginas genéricas: ${routeFile}`)
}

async function scaffoldDomain(context) {
  const { rootDir, moduleName, packageName, sharedDependency, ops, logger, summary, tsconfigExtends } = context
  const moduleDir = path.join(rootDir, 'modules', moduleName)
  const packageJson = {
    name: packageName,
    version: '0.1.0',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    exports: { '.': { import: './dist/index.js', require: './dist/index.js', types: './dist/index.d.ts' } },
    scripts: {
      dev: 'tsc --watch',
      build: 'tsc',
      test: 'jest --coverage --passWithNoTests',
      'test:watch': 'jest --watchAll',
    },
    dependencies: { [sharedDependency]: '*' },
    devDependencies: {
      '@types/jest': '^30.0.0',
      jest: '^30.2.0',
      'ts-jest': '^29.4.5',
    },
  }
  const tsconfig = {
    extends: tsconfigExtends,
    compilerOptions: { rootDir: 'src', outDir: './dist', declaration: true },
    include: ['src'],
    exclude: ['dist', 'build', 'node_modules'],
  }
  const jestConfig = `import type { Config } from 'jest'\n\nconst config: Config = {\n  verbose: true,\n  preset: 'ts-jest',\n  testMatch: ['**/test/**/*.(test|spec).ts'],\n}\n\nexport default config\n`

  await writeGeneratedFile({ ops, logger, filePath: path.join(moduleDir, 'package.json'), content: `${JSON.stringify(packageJson, null, 2)}\n`, label: 'package do domínio', summary })
  await writeGeneratedFile({ ops, logger, filePath: path.join(moduleDir, 'tsconfig.json'), content: `${JSON.stringify(tsconfig, null, 2)}\n`, label: 'tsconfig do domínio', summary })
  await writeGeneratedFile({ ops, logger, filePath: path.join(moduleDir, 'jest.config.ts'), content: jestConfig, label: 'Jest do domínio', summary })
  await writeGeneratedFile({ ops, logger, filePath: path.join(moduleDir, 'src', 'index.ts'), content: 'export {}\n', label: 'API pública vazia do domínio', summary })
}

async function scaffoldBackend(context) {
  const { rootDir, moduleName, moduleClassName, backendAppPath, packageName, ops, logger, summary } = context
  const moduleDir = path.join(rootDir, backendAppPath, 'src', 'modules', moduleName)
  const moduleFile = path.join(moduleDir, `${moduleName}.module.ts`)
  const moduleContent = `import { Module } from '@nestjs/common'\n\n@Module({})\nexport class ${moduleClassName}Module {}\n`
  await writeGeneratedFile({ ops, logger, filePath: moduleFile, content: moduleContent, label: 'módulo NestJS vazio', summary })
  await writeGeneratedFile({ ops, logger, filePath: path.join(moduleDir, 'index.ts'), content: `export * from './${moduleName}.module'\n`, label: 'API pública do adapter backend', summary })
  await writeGeneratedFile({
    ops,
    logger,
    filePath: path.join(rootDir, backendAppPath, 'prisma', 'models', `${moduleName}.model.prisma`),
    content: `// Prisma models owned by the ${moduleName} module are added by an approved spec.\n`,
    label: 'fronteira Prisma do módulo',
    summary,
  })
  await ensureBackendRegistration({
    ops,
    logger,
    appModulePath: path.join(rootDir, backendAppPath, 'src', 'app.module.ts'),
    moduleName,
    moduleClassName,
    summary,
  })
  await ensureDependency({ ops, logger, packageJsonPath: path.join(rootDir, backendAppPath, 'package.json'), dependency: packageName, summary })
}

async function scaffoldWeb(context) {
  const { rootDir, moduleName, frontendAppPath, packageName, route, ops, logger, summary } = context
  const moduleDir = path.join(rootDir, frontendAppPath, 'src', 'modules', moduleName)
  for (const folder of ['components', 'data', 'pages']) {
    await writeGeneratedFile({
      ops,
      logger,
      filePath: path.join(moduleDir, folder, 'index.ts'),
      content: 'export {}\n',
      label: `fronteira Web ${folder}`,
      summary,
    })
  }
  await writeGeneratedFile({
    ops,
    logger,
    filePath: path.join(moduleDir, 'index.ts'),
    content: `export * from './components'\nexport * from './data'\nexport * from './pages'\n`,
    label: 'API pública do módulo Web',
    summary,
  })
  await ensureDependency({ ops, logger, packageJsonPath: path.join(rootDir, frontendAppPath, 'package.json'), dependency: packageName, summary })
  await resolveAssociatedRoute({ rootDir, frontendAppPath, route, logger, summary })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.moduleName) {
    usage()
    process.exitCode = 1
    return
  }
  validateModuleName(args.moduleName)
  if (!MODES[args.mode]) throw new Error(`Invalid mode '${args.mode}'. Choose: ${Object.keys(MODES).join(', ')}`)
  args.route = normalizeRoute(args.route)

  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const defaultRoot = path.resolve(scriptDir, '../../../..')
  const rootDir = path.resolve(args.projectRoot || defaultRoot)
  const logger = args.dryRun
    ? previewLogger(rootDir, args.json)
    : await createSkillRunLogger({ rootDir, skillName: 'config-new-module', commandArgs: process.argv.slice(2) })
  const ops = createSkillRunOps({ rootDir, logger, dryRun: args.dryRun })
  const summary = { module: args.moduleName, mode: args.mode, dryRun: args.dryRun, created: [], updated: [], preserved: [], route: '' }

  try {
    const { packagesDir, sharedModule, sharedPackageJsonPath, config } = await resolveSkillPaths(rootDir)
    let fallbackScope = ''
    if (await pathExists(sharedPackageJsonPath)) {
      const sharedPackage = await readJson(sharedPackageJsonPath)
      fallbackScope = typeof sharedPackage.name === 'string' ? sharedPackage.name.split('/')[0] : ''
    }
    const { scope } = await resolveNamespace({ rootDir, cliScope: args.scope, fallbackScope })
    const packageName = `${scope}/${args.moduleName}`
    const layers = MODES[args.mode]
    const moduleDir = path.join(rootDir, 'modules', args.moduleName)
    const tsconfigBaseCandidates = [
      path.join(packagesDir, 'config', 'typescript-config', 'base.json'),
      path.join(rootDir, 'packages', 'typescript-config', 'base.json'),
    ]
    const tsconfigBase = (await Promise.all(tsconfigBaseCandidates.map(pathExists))).findIndex(Boolean)
    const resolvedTsconfigBase = tsconfigBase >= 0 ? tsconfigBaseCandidates[tsconfigBase] : tsconfigBaseCandidates[0]
    const context = {
      rootDir,
      moduleName: args.moduleName,
      moduleClassName: toPascalCase(args.moduleName),
      packageName,
      sharedDependency: `${scope}/${sharedModule}`,
      backendAppPath: config.defaults.backendAppPath,
      frontendAppPath: config.defaults.frontendAppPath,
      route: args.route,
      ops,
      logger,
      summary,
      tsconfigExtends: toPosix(path.relative(moduleDir, resolvedTsconfigBase)),
    }

    if (layers.domain) await scaffoldDomain(context)
    if (!layers.domain && (layers.backend || layers.web) && !(await pathExists(path.join(moduleDir, 'package.json')))) {
      throw new Error(`Mode '${args.mode}' requires an existing domain package at modules/${args.moduleName}.`)
    }
    if (layers.backend) await scaffoldBackend(context)
    if (layers.web) await scaffoldWeb(context)

    if (args.json) console.log(JSON.stringify(summary, null, 2))
    else {
      console.log(`Module boundary ready: ${args.moduleName} (${args.mode})`)
      console.log(`Created: ${summary.created.length}; updated: ${summary.updated.length}; preserved: ${summary.preserved.length}`)
      console.log('Next: use the approved domain, backend and web skills from the OpenSpec tasks.')
    }
    await logger.success()
  } catch (error) {
    await logger.failure(error)
    throw error
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
