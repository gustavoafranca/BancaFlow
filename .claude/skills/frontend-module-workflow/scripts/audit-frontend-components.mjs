#!/usr/bin/env node
/**
 * audit-frontend-components.mjs
 *
 * Read-only, deterministic audit of `apps/<app>/src/{shared,modules,app}`:
 * lists components/exports/imports/consumers (direct and transitive, so a
 * component only reached through a barrel is not misreported as orphan) and
 * flags:
 *   - `shared -> modules` dependencies, including via `export * from`/
 *     `export { X } from` re-exports (forbidden dependency direction)
 *   - exported component names repeated across more than one module
 *   - component files with zero transitive local consumers
 *
 * Never moves, deletes, or rewrites files. Does NOT claim to detect semantic
 * equivalence between similarly-named components, nor prove a file is truly
 * dead code (dynamic imports, string-built paths, and consumers outside the
 * scanned app are invisible to a regex-based scan) — every flag here is a
 * signal to review manually (see references/component-ownership.md), never
 * an automatic verdict or authorization to delete.
 *
 * Usage:
 *   node scripts/audit-frontend-components.mjs --app=web [--json|--markdown] [--project-root=<path>]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname, basename, dirname, sep } from 'node:path'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])
const IGNORED_DIR_NAMES = new Set(['node_modules', '.next', '__pycache__'])

export function parseArgs(argv) {
  const args = { app: 'web', format: 'markdown', projectRoot: process.cwd() }
  for (const raw of argv) {
    if (raw === '--json') args.format = 'json'
    else if (raw === '--markdown') args.format = 'markdown'
    else if (raw.startsWith('--app=')) args.app = raw.slice('--app='.length)
    else if (raw.startsWith('--project-root=')) args.projectRoot = raw.slice('--project-root='.length)
  }
  return args
}

function walk(dir, files = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return files
  }
  for (const entry of entries) {
    if (IGNORED_DIR_NAMES.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, files)
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
      if (entry.name.includes('.spec.') || entry.name.includes('.test.')) continue
      files.push(full)
    }
  }
  return files
}

const IMPORT_RE = /import\s+(?:type\s+)?(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]/g
// Matches `export * from '...'`, `export * as ns from '...'`, and
// `export { a, b as c } from '...'` — all are dependency edges, not just
// local export declarations, and were previously invisible to the audit.
const EXPORT_FROM_RE = /export\s+(?:\*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g
const EXPORT_NAMED_RE = /export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g
const EXPORT_BRACE_RE = /export\s*\{([^}]+)\}/g
const EXPORT_DEFAULT_RE = /export\s+default\s+(?:function\s+)?([A-Za-z_$][\w$]*)?/

function extractImports(content) {
  const specifiers = []
  let m
  IMPORT_RE.lastIndex = 0
  while ((m = IMPORT_RE.exec(content))) specifiers.push(m[1])
  return specifiers
}

function extractReexports(content) {
  const specifiers = []
  let m
  EXPORT_FROM_RE.lastIndex = 0
  while ((m = EXPORT_FROM_RE.exec(content))) specifiers.push(m[1])
  return specifiers
}

function extractExports(content) {
  const names = new Set()
  let m
  EXPORT_NAMED_RE.lastIndex = 0
  while ((m = EXPORT_NAMED_RE.exec(content))) names.add(m[1])
  EXPORT_BRACE_RE.lastIndex = 0
  while ((m = EXPORT_BRACE_RE.exec(content))) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim()
      if (name) names.add(name)
    }
  }
  const def = EXPORT_DEFAULT_RE.exec(content)
  if (def && def[1]) names.add(def[1])
  return [...names]
}

/** Resolves an import/re-export specifier to an absolute source file path, if it points inside `srcRoot`. */
function resolveLocal(specifier, fromFile, srcRoot) {
  let candidateBase
  if (specifier.startsWith('@/')) {
    candidateBase = join(srcRoot, specifier.slice('@/'.length))
  } else if (specifier.startsWith('.')) {
    candidateBase = join(dirname(fromFile), specifier)
  } else {
    return null // external package
  }
  const candidates = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    join(candidateBase, 'index.ts'),
    join(candidateBase, 'index.tsx'),
  ]
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      // keep trying
    }
  }
  return null
}

function classify(filePath, srcRoot) {
  const rel = relative(srcRoot, filePath)
  const segments = rel.split(sep)
  if (segments[0] === 'shared') return { area: 'shared', domain: null }
  if (segments[0] === 'modules') return { area: 'modules', domain: segments[1] ?? null }
  if (segments[0] === 'app') return { area: 'app', domain: null }
  return { area: 'other', domain: null }
}

function isEntryPointFile(filePath) {
  const name = basename(filePath)
  return name === 'index.ts' || name === 'index.tsx' || name === 'page.tsx' || name === 'layout.tsx' || name === 'proxy.ts'
}

function isComponentFile(filePath) {
  return filePath.includes(`${sep}components${sep}`)
}

/** BFS over the reverse dependency graph: every file that, through any chain of imports/re-exports, ends up depending on `start`. */
function transitiveClosure(start, reverseEdges) {
  const seen = new Set()
  const queue = [...(reverseEdges.get(start) ?? [])]
  while (queue.length > 0) {
    const next = queue.shift()
    if (seen.has(next)) continue
    seen.add(next)
    for (const parent of reverseEdges.get(next) ?? []) {
      if (!seen.has(parent)) queue.push(parent)
    }
  }
  return seen
}

export function analyze(projectRoot, app) {
  const srcRoot = join(projectRoot, 'apps', app, 'src')
  const files = walk(srcRoot)

  const fileInfo = new Map()
  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8')
    const imports = extractImports(content)
    const reexports = extractReexports(content)
    const exportsList = extractExports(content)
    const resolvedDependencies = [...imports, ...reexports]
      .map((specifier) => resolveLocal(specifier, filePath, srcRoot))
      .filter(Boolean)
    fileInfo.set(filePath, {
      exports: exportsList,
      imports,
      reexports,
      resolvedDependencies,
      ...classify(filePath, srcRoot),
    })
  }

  // reverseEdges: target file -> set of files that import/re-export it directly.
  const reverseEdges = new Map()
  for (const [filePath, info] of fileInfo) {
    for (const target of info.resolvedDependencies) {
      if (!reverseEdges.has(target)) reverseEdges.set(target, new Set())
      reverseEdges.get(target).add(filePath)
    }
  }

  const sharedToModuleViolations = []
  for (const [filePath, info] of fileInfo) {
    if (info.area !== 'shared') continue
    for (const target of info.resolvedDependencies) {
      const targetInfo = fileInfo.get(target)
      if (targetInfo?.area === 'modules') {
        sharedToModuleViolations.push({ file: relative(srcRoot, filePath), imports: relative(srcRoot, target) })
      }
    }
  }

  const exportNameToModules = new Map()
  for (const [filePath, info] of fileInfo) {
    if (info.area !== 'modules' || !isComponentFile(filePath)) continue
    for (const name of info.exports) {
      if (!/^[A-Z]/.test(name)) continue
      if (!exportNameToModules.has(name)) exportNameToModules.set(name, new Set())
      exportNameToModules.get(name).add(info.domain)
    }
  }
  const repeatedNames = [...exportNameToModules.entries()]
    .filter(([, modules]) => modules.size > 1)
    .map(([name, modules]) => ({ name, modules: [...modules] }))

  const components = []
  const orphanFiles = []
  for (const [filePath, info] of fileInfo) {
    if (!isComponentFile(filePath)) continue
    const rel = relative(srcRoot, filePath)
    const directConsumers = [...(reverseEdges.get(filePath) ?? [])].map((f) => relative(srcRoot, f))
    const consumers = [...transitiveClosure(filePath, reverseEdges)].map((f) => relative(srcRoot, f))
    components.push({
      file: rel,
      area: info.area,
      domain: info.domain,
      exports: info.exports,
      imports: info.imports,
      resolvedImports: info.resolvedDependencies.map((f) => relative(srcRoot, f)),
      directConsumers,
      consumers,
    })
    if (isEntryPointFile(filePath)) continue
    if (consumers.length === 0) orphanFiles.push(rel)
  }

  return {
    app,
    srcRoot,
    fileCount: files.length,
    components,
    sharedToModuleViolations,
    repeatedNames,
    orphanFiles,
  }
}

function toMarkdown(result) {
  const lines = []
  lines.push(`# Frontend component audit — ${result.app}`)
  lines.push('')
  lines.push(`Scanned ${result.fileCount} source files under \`apps/${result.app}/src\` (${result.components.length} under a \`components/\` directory). Run with \`--json\` for the full per-file inventory (exports/imports/consumers).`)
  lines.push('')
  lines.push('## shared -> modules violations')
  if (result.sharedToModuleViolations.length === 0) {
    lines.push('None found.')
  } else {
    for (const v of result.sharedToModuleViolations) {
      lines.push(`- \`${v.file}\` depends on \`${v.imports}\` (import or re-export)`)
    }
  }
  lines.push('')
  lines.push('## Repeated component names across modules')
  if (result.repeatedNames.length === 0) {
    lines.push('None found.')
  } else {
    for (const r of result.repeatedNames) {
      lines.push(`- \`${r.name}\` exported by modules: ${r.modules.join(', ')} — review manually, this does not imply they should be merged`)
    }
  }
  lines.push('')
  lines.push('## Component files without any transitive consumer')
  if (result.orphanFiles.length === 0) {
    lines.push('None found.')
  } else {
    for (const f of result.orphanFiles) {
      lines.push(`- \`${f}\` — no local file (direct or via barrel) ends up depending on this one; this is a heuristic signal (dynamic imports and usage outside the scanned app are invisible), not proof of dead code`)
    }
  }
  return lines.join('\n') + '\n'
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = analyze(args.projectRoot, args.app)
  if (args.format === 'json') {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(toMarkdown(result))
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  main()
}
