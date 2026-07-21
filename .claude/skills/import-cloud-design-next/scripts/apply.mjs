#!/usr/bin/env node
/**
 * import-cloud-design-next — apply.mjs
 *
 * Importa um layout do Claude Design / Cloud Code Design (arquivo `.dc.html`) para
 * dentro de um projeto Next.js, separando telas (frames), componentes reutilizáveis
 * e assets de forma determinística.
 *
 * Este script faz APENAS o trabalho mecânico e seguro:
 *   - detecta o ambiente (monorepo, app Next, router, Tailwind, aliases, design system);
 *   - carrega o design a partir de um link OU de um arquivo local exportado;
 *   - extrai frames, CSS e assets (base64, URL, inline SVG, arquivos locais);
 *   - normaliza nomes e copia os assets para public/design-imports/{screen}/;
 *   - varre componentes já existentes para evitar duplicação;
 *   - planeja os componentes da tela e gera esqueletos TSX + a página;
 *   - grava um relatório em design-import/report-{screen}.md.
 *
 * NÃO existe integração "falsa" com o Claude Design. Se o link não puder ser acessado
 * automaticamente, o script orienta o modo export manual e não inventa conteúdo.
 *
 * Uso:
 *   node scripts/apply.mjs --app=web --url="<link>" --screen=login
 *   node scripts/apply.mjs --screen=login --dry-run
 *   node scripts/apply.mjs --input="design-import/input/BancaFlow Login.dc.html" --screen=login
 *
 * Flags:
 *   --app=<nome>       app de destino em apps/ (monorepo). Autodetecta se houver só um.
 *   --url="<link>"     link compartilhado do Claude Design.
 *   --input=<caminho>  arquivo .dc.html/.html/.json local (senão procura em design-import/input/).
 *   --screen=<nome>    nome da tela desejada (ex.: login). Obrigatório.
 *   --frame=<nome>     nome exato do frame quando houver ambiguidade.
 *   --dry-run          simula tudo sem gravar nada.
 *   --force            permite sobrescrever arquivos existentes (senão só cria os que faltam).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Fonte canônica de componentes globais: a skill irmã config-shared-frontend embarca
// o kit de UI (button.tsx, input.tsx, …) e o util `cn`. Quando a import precisa CRIAR
// um primitivo global, copia o arquivo canônico de lá em vez de inventar um esqueleto,
// garantindo alinhamento total com o padrão do projeto.
const SHARED_FRONTEND_DIR = path.resolve(SKILL_DIR, '..', 'config-shared-frontend')
const SHARED_FRONTEND_UI = path.join(SHARED_FRONTEND_DIR, 'assets', 'shared', 'components', 'ui')
const SHARED_FRONTEND_CN = path.join(SHARED_FRONTEND_DIR, 'assets', 'shared', 'lib', 'class-name.util.ts')
const INPUT_DIR = path.join(ROOT, 'design-import', 'input')
const INPUT_ASSETS_DIR = path.join(INPUT_DIR, 'assets')
const EXTRACTED_DIR = path.join(ROOT, 'design-import', 'extracted')

// Extensões permitidas ao baixar/copiar assets (segurança: só mídia/estilo).
const ALLOWED_ASSET_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg', '.ico', '.css',
])
const RASTER_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'])

const MANUAL_EXPORT_HINT = [
  '',
  'Não foi possível acessar o link compartilhado automaticamente.',
  'Baixe/exporte o arquivo .dc.html e coloque em design-import/input/.',
  'Se houver assets exportados, coloque-os em design-import/input/assets/.',
  'Depois execute novamente.',
  '',
].join('\n')

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { dryRun: false, force: false }
  const positional = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--force') out.force = true
    else if (a.startsWith('--app=')) out.app = a.slice('--app='.length)
    else if (a === '--app') out.app = args[++i]
    else if (a.startsWith('--url=')) out.url = stripQuotes(a.slice('--url='.length))
    else if (a === '--url') out.url = stripQuotes(args[++i])
    else if (a.startsWith('--input=')) out.input = stripQuotes(a.slice('--input='.length))
    else if (a === '--input') out.input = stripQuotes(args[++i])
    else if (a.startsWith('--screen=')) out.screen = a.slice('--screen='.length)
    else if (a === '--screen') out.screen = args[++i]
    else if (a.startsWith('--frame=')) out.frame = stripQuotes(a.slice('--frame='.length))
    else if (a === '--frame') out.frame = stripQuotes(args[++i])
    else if (!a.startsWith('-')) positional.push(a)
  }
  if (!out.app && positional.length) out.app = positional[0]
  return out
}

function stripQuotes(v) {
  if (!v) return v
  return v.replace(/^["']|["']$/g, '')
}

// ─────────────────────────────────────────────────────────────────────────────
// Detecção de ambiente
// ─────────────────────────────────────────────────────────────────────────────

function detectWorkspace() {
  const appsDir = path.join(ROOT, 'apps')
  const hasApps = fs.existsSync(appsDir) && fs.statSync(appsDir).isDirectory()
  const rootPkg = readJsonSafe(path.join(ROOT, 'package.json'))
  const isMonorepo =
    hasApps ||
    Boolean(rootPkg?.workspaces) ||
    fs.existsSync(path.join(ROOT, 'turbo.json')) ||
    fs.existsSync(path.join(ROOT, 'pnpm-workspace.yaml'))
  return { root: ROOT, appsDir, hasApps, isMonorepo, rootPkg }
}

function isNextApp(dir) {
  const pkg = readJsonSafe(path.join(dir, 'package.json'))
  const hasNextDep =
    pkg && ((pkg.dependencies && pkg.dependencies.next) || (pkg.devDependencies && pkg.devDependencies.next))
  const hasAppDir =
    fs.existsSync(path.join(dir, 'src', 'app')) ||
    fs.existsSync(path.join(dir, 'app')) ||
    fs.existsSync(path.join(dir, 'src', 'pages')) ||
    fs.existsSync(path.join(dir, 'pages'))
  const hasNextConfig =
    fs.existsSync(path.join(dir, 'next.config.ts')) ||
    fs.existsSync(path.join(dir, 'next.config.js')) ||
    fs.existsSync(path.join(dir, 'next.config.mjs'))
  return Boolean(hasNextDep || hasAppDir || hasNextConfig)
}

function detectNextApp(ws, requestedApp) {
  // 1) app explícito
  if (requestedApp) {
    const candidates = [path.join(ws.appsDir, requestedApp), path.join(ROOT, requestedApp)]
    const found = candidates.find((c) => fs.existsSync(c) && isNextApp(c))
    if (found) return { dir: found, name: requestedApp }
    throw new Error(
      `App "${requestedApp}" não encontrado como projeto Next.js. Apps disponíveis: ${listNextApps(ws).join(', ') || '(nenhum)'}`,
    )
  }

  // 2) raiz é um app Next?
  if (isNextApp(ROOT) && !ws.hasApps) {
    return { dir: ROOT, name: ws.rootPkg?.name || path.basename(ROOT) }
  }

  // 3) autodetecção em apps/
  const apps = listNextApps(ws)
  if (apps.length === 1) return { dir: path.join(ws.appsDir, apps[0]), name: apps[0] }
  if (apps.length === 0) {
    if (isNextApp(ROOT)) return { dir: ROOT, name: ws.rootPkg?.name || path.basename(ROOT) }
    throw new Error('Nenhum app Next.js encontrado. Informe --app=<nome> ou rode a skill na raiz do app.')
  }
  throw new Error(`Múltiplos apps Next.js encontrados em apps/: ${apps.join(', ')}. Informe --app=<nome>.`)
}

function listNextApps(ws) {
  if (!ws.hasApps) return []
  return fs
    .readdirSync(ws.appsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => isNextApp(path.join(ws.appsDir, name)))
}

function detectRouterMode(appInfo) {
  const dir = appInfo.dir
  const useSrc = fs.existsSync(path.join(dir, 'src'))
  const base = useSrc ? path.join(dir, 'src') : dir

  if (fs.existsSync(path.join(base, 'app'))) {
    return { router: 'app', srcRoot: base, useSrc, routeBase: path.join(base, 'app') }
  }
  if (fs.existsSync(path.join(base, 'pages'))) {
    return { router: 'pages', srcRoot: base, useSrc, routeBase: path.join(base, 'pages') }
  }
  // default: assume app router em src/app (padrão Next atual)
  return { router: 'app', srcRoot: base, useSrc, routeBase: path.join(base, 'app') }
}

function detectTailwind(appInfo) {
  const dir = appInfo.dir
  const pkg = readJsonSafe(path.join(dir, 'package.json')) || {}
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  if (deps.tailwindcss || deps['@tailwindcss/postcss']) return true
  for (const cfg of ['tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.mjs']) {
    if (fs.existsSync(path.join(dir, cfg))) return true
  }
  const postcss = ['postcss.config.mjs', 'postcss.config.js']
    .map((f) => path.join(dir, f))
    .find((p) => fs.existsSync(p))
  if (postcss && /tailwind/.test(fs.readFileSync(postcss, 'utf8'))) return true
  return false
}

function detectAliases(appInfo) {
  const tsconfig = readJsonSafe(path.join(appInfo.dir, 'tsconfig.json'))
  const paths = tsconfig?.compilerOptions?.paths || {}
  // Procura um alias que aponte para a raiz de src (ex.: "@/*": ["./src/*"]).
  for (const [key, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets)) continue
    const target = targets[0] || ''
    if (key.endsWith('/*') && /(^|\/)src\/\*$/.test(target)) {
      return { alias: key.replace('/*', ''), target, hasAlias: true }
    }
  }
  // fallback comum
  if (paths['@/*']) return { alias: '@', target: paths['@/*'][0], hasAlias: true }
  return { alias: '@', target: './src/*', hasAlias: false }
}

/**
 * Detecta onde os componentes globais devem morar:
 *   - src/shared/components  (se o projeto usa a convenção "shared")
 *   - src/components         (fallback)
 * E se há um design system / UI kit existente (pasta ui/).
 */
function detectDesignSystem(router) {
  const src = router.srcRoot
  const sharedComponents = path.join(src, 'shared', 'components')
  const plainComponents = path.join(src, 'components')

  let componentsRoot
  let usesShared
  if (fs.existsSync(sharedComponents)) {
    componentsRoot = sharedComponents
    usesShared = true
  } else if (fs.existsSync(path.join(src, 'shared'))) {
    componentsRoot = sharedComponents
    usesShared = true
  } else if (fs.existsSync(plainComponents)) {
    componentsRoot = plainComponents
    usesShared = false
  } else {
    // Nenhuma das duas existe ainda: preferir shared/ se a árvore shared existir,
    // senão components/.
    componentsRoot = plainComponents
    usesShared = false
  }

  const uiDir = path.join(componentsRoot, 'ui')
  const hasUiKit = fs.existsSync(uiDir)

  // Barrel do shared (index.ts) → permite `import { X } from '@/shared'`.
  const sharedIndex = ['index.ts', 'index.tsx']
    .map((f) => path.join(src, 'shared', f))
    .find((p) => fs.existsSync(p))

  // Util de classe (cn) no padrão do projeto.
  const cnUtil = ['lib/class-name.util.ts', 'lib/utils.ts', 'utils/cn.ts']
    .map((f) => path.join(src, 'shared', f))
    .find((p) => fs.existsSync(p))

  return {
    componentsRoot,
    uiDir,
    usesShared,
    hasUiKit,
    sharedIndex: sharedIndex || null,
    cnUtil: cnUtil ? path.relative(src, cnUtil).replace(/\.tsx?$/, '') : null,
  }
}

// Converte PascalCase/camelCase para kebab-case (LoginLayout → login-layout).
function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

// Detecta a convenção de nome de arquivo dominante entre os componentes existentes.
// Retorna 'kebab' (ex.: button.tsx, sidebar-menu.component.tsx) ou 'pascal' (Button.tsx).
const NEXT_RESERVED = new Set([
  'page', 'layout', 'loading', 'error', 'global-error', 'not-found', 'template',
  'default', 'route', 'middleware', 'instrumentation',
])
function detectNaming(existing) {
  let kebab = 0
  let pascal = 0
  for (const c of existing) {
    const base = c.name.replace(/\.component$/, '')
    // Ignora arquivos reservados do Next (page/layout/…) — sempre minúsculos, não
    // indicam a convenção de nome de componente do projeto.
    if (NEXT_RESERVED.has(base.toLowerCase())) continue
    if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(base)) kebab++
    else if (/^[A-Z]/.test(base)) pascal++
  }
  if (kebab === 0 && pascal === 0) return 'kebab'
  return kebab >= pascal ? 'kebab' : 'pascal'
}

// Nome-base de arquivo (sem extensão) conforme a convenção do projeto.
function fileBase(name, naming) {
  return naming === 'kebab' ? toKebab(name) : name
}

// Retorna o arquivo canônico do primitivo global em config-shared-frontend/assets,
// ou null se não existir (ex.: ThemeToggle/WindowControls não fazem parte do kit).
function canonicalUiAsset(name) {
  if (!fs.existsSync(SHARED_FRONTEND_UI)) return null
  const candidate = path.join(SHARED_FRONTEND_UI, `${toKebab(name)}.tsx`)
  return fs.existsSync(candidate) ? candidate : null
}

// ─────────────────────────────────────────────────────────────────────────────
// Carregamento do design
// ─────────────────────────────────────────────────────────────────────────────

async function loadDesignFromUrl(url) {
  if (!url) return { ok: false, reason: 'sem-url' }
  if (typeof fetch !== 'function') {
    return { ok: false, reason: 'fetch-indisponivel' }
  }
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; import-cloud-design-next/1.0; +https://claude.com/claude-code)',
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      },
    })
    if (!res.ok) return { ok: false, reason: `http-${res.status}` }
    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    const body = await res.text()

    // O link compartilhado do Claude Design costuma ser uma app SPA que carrega o
    // conteúdo via JS — o HTML cru não traz o layout. Detectamos esse caso para não
    // tratar um "casulo" de SPA como design real.
    const looksLikeSpaShell =
      /text\/html/.test(contentType) &&
      !/<img|<svg|data:image|background-image|\.dc\.html/i.test(body) &&
      /<div id="root"|__NEXT_DATA__|<script/i.test(body)

    if (looksLikeSpaShell) {
      return { ok: false, reason: 'spa-shell', contentType }
    }
    if (!/text\/html|application\/json|text\/plain/.test(contentType) && !/<html|<svg|{/.test(body)) {
      return { ok: false, reason: `content-type:${contentType}` }
    }
    return { ok: true, html: body, source: url, contentType }
  } catch (err) {
    return { ok: false, reason: `erro:${err.message}` }
  }
}

function loadDesignFromInput(explicitInput) {
  // 1) arquivo explícito via --input
  const tryFiles = []
  if (explicitInput) {
    tryFiles.push(path.isAbsolute(explicitInput) ? explicitInput : path.join(ROOT, explicitInput))
  }

  // 2) varrer design-import/input/
  const foundInInput = []
  if (fs.existsSync(INPUT_DIR)) {
    for (const entry of fs.readdirSync(INPUT_DIR, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const ext = path.extname(entry.name).toLowerCase()
      if (['.html', '.json'].includes(ext) || entry.name.toLowerCase().endsWith('.dc.html')) {
        foundInInput.push(path.join(INPUT_DIR, entry.name))
      }
    }
  }

  // Prioridade: arquivo explícito, senão .dc.html, senão .html, senão .json.
  const ordered = [
    ...tryFiles,
    ...foundInInput.filter((f) => f.toLowerCase().endsWith('.dc.html')),
    ...foundInInput.filter((f) => f.toLowerCase().endsWith('.html') && !f.toLowerCase().endsWith('.dc.html')),
    ...foundInInput.filter((f) => f.toLowerCase().endsWith('.json')),
  ]

  const target = ordered.find((f) => fs.existsSync(f))
  if (!target) {
    return { ok: false, reason: 'sem-arquivo', searchedDir: INPUT_DIR }
  }

  const ext = path.extname(target).toLowerCase()
  const raw = fs.readFileSync(target, 'utf8')

  // CSS avulso exportado (opcional).
  const cssFiles = fs.existsSync(INPUT_DIR)
    ? fs
        .readdirSync(INPUT_DIR)
        .filter((f) => f.toLowerCase().endsWith('.css'))
        .map((f) => fs.readFileSync(path.join(INPUT_DIR, f), 'utf8'))
    : []

  if (ext === '.json') {
    return { ok: true, source: target, kind: 'json', json: raw, css: cssFiles.join('\n') }
  }
  return { ok: true, source: target, kind: 'html', html: raw, css: cssFiles.join('\n') }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de frames (telas)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cada "frame" do design vira uma tela. Como não há um schema oficial público do
 * `.dc.html`, usamos heurísticas em ordem de confiança:
 *   1. elementos com data-frame / data-screen / data-name;
 *   2. <section>/<article> de alto nível com id/classe;
 *   3. o documento inteiro como um único frame (nome derivado do <title>/arquivo).
 */
function extractFrames(html, fallbackName) {
  if (!html) return []
  const frames = []

  // 1) atributos explícitos de frame
  const attrRe = /<([a-zA-Z0-9]+)\b([^>]*\b(?:data-frame|data-screen|data-name)\s*=\s*["']([^"']+)["'][^>]*)>/gi
  let m
  while ((m = attrRe.exec(html))) {
    const tag = m[1]
    const name = m[3]
    const slice = extractBalanced(html, m.index, tag)
    if (slice) frames.push({ name, html: slice })
  }

  if (frames.length) return dedupeFrames(frames)

  // 2) sections/articles de alto nível com identificador
  const sectionRe = /<(section|article|main)\b[^>]*(?:id|class)\s*=\s*["']([^"']+)["'][^>]*>/gi
  while ((m = sectionRe.exec(html))) {
    const tag = m[1]
    const name = m[2].split(/\s+/)[0]
    const slice = extractBalanced(html, m.index, tag)
    if (slice && slice.length > 120) frames.push({ name, html: slice })
  }
  if (frames.length) return dedupeFrames(frames)

  // 3) documento inteiro como um frame
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const name = (titleMatch ? titleMatch[1] : fallbackName || 'screen').trim()
  frames.push({ name, html: bodyMatch ? bodyMatch[1] : html })
  return frames
}

// Extrai um elemento balanceado simples a partir do índice da tag de abertura.
function extractBalanced(html, startIndex, tag) {
  const openRe = new RegExp(`<${tag}\\b`, 'gi')
  const closeRe = new RegExp(`</${tag}>`, 'gi')
  const from = html.indexOf('>', startIndex)
  if (from === -1) return null
  let depth = 1
  let cursor = from + 1
  const MAX = html.length
  while (cursor < MAX && depth > 0) {
    openRe.lastIndex = cursor
    closeRe.lastIndex = cursor
    const nextOpen = openRe.exec(html)
    const nextClose = closeRe.exec(html)
    if (!nextClose) break
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      cursor = nextOpen.index + 1
    } else {
      depth--
      cursor = nextClose.index + `</${tag}>`.length
    }
  }
  return html.slice(startIndex, cursor)
}

// Extrai o conteúdo de todos os blocos <style> do documento.
function extractStyleBlocks(html) {
  if (!html) return ''
  const out = []
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
  let m
  while ((m = re.exec(html))) out.push(m[1])
  return out.join('\n')
}

function dedupeFrames(frames) {
  const seen = new Set()
  const out = []
  for (const f of frames) {
    const key = f.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

// Seleciona o frame que corresponde à tela pedida.
function selectFrame(frames, screen, frameArg) {
  if (!frames.length) return null
  const norm = (s) => slugify(String(s))
  const wanted = norm(frameArg || screen)
  // match exato / contém
  let match = frames.find((f) => norm(f.name) === wanted)
  if (!match) match = frames.find((f) => norm(f.name).includes(wanted) || wanted.includes(norm(f.name)))
  return match || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de assets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna lista de assets a partir do HTML:
 *   { origin: 'base64'|'url'|'local'|'inline-svg', name, ext, data?, url?, raw? }
 */
function extractAssets(html, css, baseUrl) {
  const assets = []
  const seenUrls = new Set()
  const seenData = new Set()
  let m

  const dataExt = (subtype) => (subtype.toLowerCase() === 'svg+xml' ? '.svg' : `.${subtype.toLowerCase().replace('jpeg', 'jpg')}`)

  const pushSrc = (src, hint) => {
    const candidate = (src || '').trim()
    if (!candidate || candidate.startsWith('#')) return
    if (candidate.startsWith('data:')) {
      const dm = candidate.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)/)
      if (!dm) return
      const ext = dataExt(dm[1])
      if (!ALLOWED_ASSET_EXT.has(ext)) return
      const data = dm[2].replace(/\s+/g, '')
      const key = data.slice(0, 48)
      if (seenData.has(key)) return
      seenData.add(key)
      assets.push({ origin: 'base64', name: '', ext, data, hint })
      return
    }
    const ext = path.extname(candidate.split('?')[0]).toLowerCase()
    if (!ALLOWED_ASSET_EXT.has(ext) || ext === '.css') return
    if (seenUrls.has(candidate)) return
    seenUrls.add(candidate)
    const base = path.basename(candidate.split('?')[0]).replace(ext, '')
    if (/^https?:\/\//i.test(candidate)) {
      assets.push({ origin: 'url', name: base, ext, url: candidate, hint: hint || base })
    } else {
      assets.push({ origin: 'local', name: base, ext, relPath: candidate, hint: hint || base })
    }
  }

  // 1) <img ...> — captura src + alt (hint semântico para o nome do arquivo)
  const imgRe = /<img\b([^>]*)>/gi
  while ((m = imgRe.exec(html || ''))) {
    const attrs = m[1]
    const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1]
    const alt = (attrs.match(/\balt\s*=\s*["']([^"']*)["']/i) || [])[1]
    if (src) pushSrc(src, alt)
  }

  // 2) demais src/href e background url(...) no HTML + CSS
  const urlRe = /(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi
  const combined = `${html || ''}\n${css || ''}`
  while ((m = urlRe.exec(combined))) {
    pushSrc(m[1] || m[2], null)
  }

  // 3) data: URIs soltas não capturadas acima
  const dataUriRe = /data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)/g
  while ((m = dataUriRe.exec(combined))) {
    pushSrc(m[0], null)
  }

  // 4) <svg>...</svg> inline
  const svgRe = /<svg\b[\s\S]*?<\/svg>/gi
  let s = 0
  while ((m = svgRe.exec(html || ''))) {
    assets.push({ origin: 'inline-svg', name: '', ext: '.svg', raw: m[0], hint: `illustration-${++s}` })
  }

  return assets
}

// ─────────────────────────────────────────────────────────────────────────────
// Nomes de assets
// ─────────────────────────────────────────────────────────────────────────────

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Gera um nome limpo, evitando genéricos como "image1". Recebe o índice para
 * desambiguar e o "hint" semântico quando existir (ex.: alt do img).
 */
function normalizeAssetName(asset, index, hint) {
  let base = hint || asset.name || ''
  base = slugify(base)
  const generic = /^(image|img|asset|photo|pic|frame|inline)?-?\d*$/i
  if (!base || generic.test(base)) {
    base = `${slugify(hint || 'asset')}-${index + 1}`
  }
  return `${base}${asset.ext}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Copiar assets para public/
// ─────────────────────────────────────────────────────────────────────────────

async function copyAssetsToPublic(assets, screen, appInfo, ctx) {
  const publicDir = path.join(appInfo.dir, 'public', 'design-imports', screen)
  const copied = []
  const pending = []
  const usedNames = new Set()

  for (let idx = 0; idx < assets.length; idx++) {
    const asset = assets[idx]
    let filename = normalizeAssetName(asset, idx, asset.hint)
    // evitar colisão
    let n = 1
    const stem = filename.replace(asset.ext, '')
    while (usedNames.has(filename)) filename = `${stem}-${++n}${asset.ext}`
    usedNames.add(filename)

    const dest = path.join(publicDir, filename)
    const webPath = `/design-imports/${screen}/${filename}`

    try {
      if (asset.origin === 'base64') {
        writeBinary(dest, Buffer.from(asset.data, 'base64'), ctx)
        copied.push({ ...asset, filename, webPath })
      } else if (asset.origin === 'inline-svg') {
        writeText(dest, asset.raw, ctx)
        copied.push({ ...asset, filename, webPath })
      } else if (asset.origin === 'local') {
        const src = resolveLocalAsset(asset.relPath)
        if (src && fs.existsSync(src)) {
          if (!ctx.dryRun) {
            ensureDir(path.dirname(dest))
            fs.copyFileSync(src, dest)
          }
          copied.push({ ...asset, filename, webPath, from: path.relative(ROOT, src) })
        } else {
          pending.push({ ...asset, reason: 'arquivo local não encontrado em design-import/input/assets/' })
        }
      } else if (asset.origin === 'url') {
        const buf = await tryDownload(asset.url)
        if (buf) {
          writeBinary(dest, buf, ctx)
          copied.push({ ...asset, filename, webPath })
        } else {
          pending.push({ ...asset, reason: 'download falhou (URL remota inacessível)' })
        }
      }
    } catch (err) {
      pending.push({ ...asset, reason: `erro ao gravar: ${err.message}` })
    }
  }

  return { publicDir, copied, pending }
}

function resolveLocalAsset(relPath) {
  const base = path.basename(relPath.split('?')[0])
  const candidates = [
    path.join(INPUT_ASSETS_DIR, base),
    path.join(INPUT_ASSETS_DIR, relPath),
    path.join(INPUT_DIR, relPath),
  ]
  return candidates.find((c) => fs.existsSync(c)) || null
}

async function tryDownload(url) {
  if (typeof fetch !== 'function') return null
  const ext = path.extname(url.split('?')[0]).toLowerCase()
  if (!ALLOWED_ASSET_EXT.has(ext)) return null // segurança: só mídia/estilo permitidos
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return null
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (!/^image\//.test(ct) && ext !== '.svg') return null
    const arr = await res.arrayBuffer()
    return Buffer.from(arr)
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Componentes: varredura, plano, geração
// ─────────────────────────────────────────────────────────────────────────────

function scanExistingComponents(router, ds) {
  const roots = [ds.componentsRoot, path.join(router.srcRoot, 'components'), path.join(router.srcRoot, 'app')]
  const found = []
  const seen = new Set()
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    walk(root, (file) => {
      if (!/\.(tsx|jsx)$/.test(file)) return
      const base = path.basename(file).replace(/\.(tsx|jsx)$/, '')
      const key = base.toLowerCase()
      if (seen.has(key + file)) return
      seen.add(key + file)
      found.push({ name: base, path: path.relative(router.srcRoot, file) })
    })
  }
  return found
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, onFile)
    else onFile(full)
  }
}

const PASCAL = (s) =>
  slugify(s)
    .split('-')
    .filter(Boolean)
    .map((c) => c[0].toUpperCase() + c.slice(1))
    .join('')

/**
 * Planeja os componentes de uma tela. Componentes "globais" (Button, Input, etc.)
 * vão para o design system; os específicos ficam colocados junto da página.
 * Componentes opcionais só entram se detectados no HTML do frame.
 */
function planComponents(screen, frameHtml, existing) {
  const Screen = PASCAL(screen)
  const html = (frameHtml || '').toLowerCase()

  const pageSpecific = []
  const global = []

  if (/log[ií]n|senha|password|e-?mail|entrar|sign\s*in/.test(html) || slugify(screen) === 'login') {
    pageSpecific.push('LoginLayout', 'LoginCard', 'LoginForm', 'BrandHeader')
    if (/illustration|hero|banner|<svg|background-image|aside/.test(html)) pageSpecific.push('AuthIllustration')
    global.push('Input', 'Button')
    if (/theme|dark|light|toggle|switch/.test(html)) global.push('ThemeToggle')
    if (/window-controls|traffic|electron|titlebar|drag-region/.test(html)) global.push('WindowControls')
  } else {
    pageSpecific.push(`${Screen}Layout`, `${Screen}Content`)
    if (/<form|<input|<button/.test(html)) {
      pageSpecific.push(`${Screen}Form`)
      global.push('Input', 'Button')
    }
  }

  const existingByName = new Map(existing.map((c) => [c.name.toLowerCase(), c]))
  const decide = (name, scope) => {
    const hit = existingByName.get(name.toLowerCase())
    return {
      name,
      scope, // 'page' | 'global'
      action: hit ? 'reuse' : 'create',
      existingPath: hit ? hit.path : null,
    }
  }

  return [
    ...pageSpecific.map((n) => decide(n, 'page')),
    ...global.map((n) => decide(n, 'global')),
  ]
}

// Localização da rota/página e da pasta _components.
function resolveRouteTarget(screen, router, ds) {
  const publicScreens = ['login', 'register', 'signup', 'signin', 'join', 'forgot', 'reset', 'recover']
  const isPublic = publicScreens.includes(slugify(screen))

  if (router.router === 'pages') {
    const pageFile = path.join(router.routeBase, `${slugify(screen)}.tsx`)
    // pages router não tem _components colocados; usar components/{screen}
    const componentsDir = path.join(ds.componentsRoot, slugify(screen))
    return { pageFile, componentsDir, group: null, isPublic }
  }

  // app router — usar grupo (public)/(private) se o projeto já usa essa convenção
  const usesGroups =
    fs.existsSync(path.join(router.routeBase, '(public)')) ||
    fs.existsSync(path.join(router.routeBase, '(private)'))
  const group = usesGroups ? (isPublic ? '(public)' : '(private)') : null
  const routeDir = group
    ? path.join(router.routeBase, group, slugify(screen))
    : path.join(router.routeBase, slugify(screen))
  return {
    pageFile: path.join(routeDir, 'page.tsx'),
    componentsDir: path.join(routeDir, '_components'),
    group,
    isPublic,
  }
}

function importAlias(aliases, router, absPath) {
  // Converte um caminho absoluto dentro de srcRoot para o alias (ex.: @/shared/...).
  const rel = path.relative(router.srcRoot, absPath).replace(/\\/g, '/').replace(/\.(tsx|ts)$/, '')
  return `${aliases.alias}/${rel}`
}

function generateComponents(plan, target, router, aliases, ds, screen, frameHtml, ctx) {
  const results = []
  const Screen = PASCAL(screen)
  const planNames = new Set(plan.map((c) => c.name))
  const naming = ctx.naming
  const warnings = []

  // Se algum primitivo global CRIADO tiver versão canônica no config-shared-frontend,
  // adotamos a convenção shared/ para os globais (o arquivo canônico importa
  // `@/shared/lib/class-name.util`) e garantimos o util `cn`.
  const usesCanonical = plan.some(
    (c) => c.scope === 'global' && c.action === 'create' && canonicalUiAsset(c.name),
  )
  const sharedUiDir = path.join(router.srcRoot, 'shared', 'components', 'ui')
  const globalUiDir = ds.usesShared ? ds.uiDir : usesCanonical ? sharedUiDir : ds.uiDir

  // Mapa de resolução: para cada componente do plano, onde ele mora e como importá-lo.
  //   symbol   → identificador exportado (sempre PascalCase, ex.: Button, LoginForm)
  //   file     → caminho absoluto do arquivo (respeitando a convenção de nome)
  //   sibling  → import relativo ('./login-card') para componentes de página
  //   from     → especificador de import p/ globais ('@/shared' barrel ou caminho)
  //   copyFrom → quando setado, copia o arquivo canônico em vez de gerar esqueleto
  const byName = new Map()
  for (const comp of plan) {
    if (comp.action === 'reuse') {
      // Usa o arquivo real existente (casing correto) e, se houver barrel do shared, prefere ele.
      const relNoExt = comp.existingPath.replace(/\.(tsx|jsx|ts)$/, '').replace(/\\/g, '/')
      const underShared = /(^|\/)shared\//.test(relNoExt)
      const from = ds.sharedIndex && underShared ? `${aliases.alias}/shared` : `${aliases.alias}/${relNoExt}`
      byName.set(comp.name, { comp, symbol: comp.name, from, barrel: ds.sharedIndex && underShared })
      continue
    }
    if (comp.scope === 'global') {
      const canonical = canonicalUiAsset(comp.name)
      // Arquivo canônico é sempre kebab (button.tsx); esqueleto próprio segue a convenção.
      const base = canonical ? path.basename(canonical, '.tsx') : fileBase(comp.name, naming)
      const dir = canonical ? globalUiDir : ds.uiDir
      const file = path.join(dir, `${base}.tsx`)
      const relNoExt = path.relative(router.srcRoot, file).replace(/\\/g, '/').replace(/\.tsx$/, '')
      const underShared = /(^|\/)shared\//.test(relNoExt)
      byName.set(comp.name, {
        comp,
        symbol: comp.name,
        file,
        from: ds.sharedIndex && underShared ? `${aliases.alias}/shared` : `${aliases.alias}/${relNoExt}`,
        barrel: Boolean(ds.sharedIndex && underShared),
        copyFrom: canonical || null,
      })
    } else {
      const base = fileBase(comp.name, naming)
      const file = path.join(target.componentsDir, `${base}.tsx`)
      byName.set(comp.name, { comp, symbol: comp.name, file, sibling: `./${base}` })
    }
  }

  // Garante o util `cn` quando algum arquivo canônico for copiado (ele o importa).
  if (usesCanonical && fs.existsSync(SHARED_FRONTEND_CN)) {
    const cnDest = path.join(router.srcRoot, 'shared', 'lib', 'class-name.util.ts')
    if (!fs.existsSync(cnDest)) {
      if (!ctx.dryRun) {
        ensureDir(path.dirname(cnDest))
        fs.copyFileSync(SHARED_FRONTEND_CN, cnDest)
      }
      warnings.push('Copiado shared/lib/class-name.util.ts (dependência dos componentes canônicos).')
    }
    warnings.push(
      'Componentes canônicos exigem deps: clsx, tailwind-merge, class-variance-authority, @radix-ui/react-slot. ' +
        'Rode config-shared-frontend para o kit completo + instalação, ou instale-as no app.',
    )
  }

  // Helpers de import usados pelos esqueletos.
  const childImport = (name) => byName.get(name)?.sibling || `./${fileBase(name, naming)}`
  const globalImports = (names) => {
    const lines = []
    const barrelSymbols = []
    for (const n of names) {
      if (!planNames.has(n)) continue
      const info = byName.get(n)
      if (!info) continue
      if (info.barrel) barrelSymbols.push(info.symbol)
      else lines.push(`import { ${info.symbol} } from '${info.from}'`)
    }
    if (barrelSymbols.length) {
      lines.unshift(`import { ${[...new Set(barrelSymbols)].join(', ')} } from '${aliases.alias}/shared'`)
    }
    return lines.join('\n')
  }

  const skelCtx = { Screen, screen, aliases, router, target, ds, planNames, naming, childImport, globalImports }

  for (const comp of plan) {
    if (comp.action === 'reuse') {
      results.push({ ...comp, file: comp.existingPath, written: false, note: 'reutilizado' })
      continue
    }
    const info = byName.get(comp.name)
    const file = info.file
    if (fs.existsSync(file) && !ctx.force) {
      results.push({
        ...comp,
        file: path.relative(router.srcRoot, file),
        written: false,
        note: 'já existe (use --force para sobrescrever)',
      })
      continue
    }

    if (info.copyFrom) {
      // Copia o componente canônico do config-shared-frontend (verbatim).
      if (!ctx.dryRun) {
        ensureDir(path.dirname(file))
        fs.copyFileSync(info.copyFrom, file)
      }
      results.push({
        ...comp,
        file: path.relative(router.srcRoot, file),
        written: !ctx.dryRun,
        note: 'copiado de config-shared-frontend (canônico)',
      })
      continue
    }

    const body = renderComponentSkeleton(comp, skelCtx)
    writeText(file, body, ctx)
    results.push({ ...comp, file: path.relative(router.srcRoot, file), written: !ctx.dryRun, note: 'novo (esqueleto)' })
  }

  return { results, warnings }
}

function renderComponentSkeleton(comp, ctx) {
  const { Screen, screen } = ctx
  const name = comp.name

  // Componentes de UI globais: contratos mínimos e reutilizáveis.
  if (name === 'Button') {
    return tsx(`import { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base =
    'inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost: 'hover:bg-muted',
  }
  return <button className={\`\${base} \${variants[variant]} \${className}\`} {...props} />
}
`)
  }
  if (name === 'Input') {
    return tsx(`import { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={\`h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring \${className}\`}
      {...props}
    />
  )
}
`)
  }
  if (name === 'ThemeToggle') {
    return tsx(`'use client'

export function ThemeToggle() {
  // TODO: conectar ao provider de tema do projeto (next-themes, contexto próprio, etc.).
  return (
    <button
      type="button"
      aria-label="Alternar tema"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
    >
      🌓
    </button>
  )
}
`)
  }
  if (name === 'WindowControls') {
    return tsx(`'use client'

// Controles de janela (layout Electron). Apenas visual; conecte às APIs do Electron
// (window.close/minimize/maximize) conforme a integração real do projeto.
export function WindowControls() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span className="h-3 w-3 rounded-full bg-red-500" />
      <span className="h-3 w-3 rounded-full bg-yellow-500" />
      <span className="h-3 w-3 rounded-full bg-green-500" />
    </div>
  )
}
`)
  }

  // Componentes específicos da tela. A composição referencia apenas componentes
  // que também estão no plano (planNames), evitando imports quebrados.
  const has = (n) => ctx.planNames && ctx.planNames.has(n)
  const rawRef = `design-import/extracted/${slugify(screen)}.html`

  if (comp.name.endsWith('Layout')) {
    // Filho principal: Card, senão Content, senão Form.
    const child = [cardName(screen), `${Screen}Content`, formName(screen)].find(has)
    // Ilustração (login) fica ao lado do card, como painel lateral responsivo.
    const illustration = ['AuthIllustration', `${Screen}Illustration`].find(has)
    const imports = [child, illustration]
      .filter(Boolean)
      .map((c) => `import { ${c} } from '${ctx.childImport(c)}'`)
      .join('\n')
    const cardEl = child ? `<${child} />` : `{/* TODO: componha os componentes da tela aqui */}`

    if (illustration) {
      return tsx(`${imports}

// TODO: refine este layout a partir do HTML extraído em ${rawRef}.
// Layout dividido: ilustração (desktop) + card centralizado. Responsivo.
export function ${comp.name}() {
  return (
    <main className="grid min-h-screen w-full lg:grid-cols-2">
      <aside className="hidden items-center justify-center bg-muted p-8 lg:flex">
        <${illustration} />
      </aside>
      <div className="flex items-center justify-center p-4 sm:p-8">
        ${cardEl}
      </div>
    </main>
  )
}
`)
    }

    return tsx(`${imports}${imports ? '\n\n' : ''}// TODO: refine este layout a partir do HTML extraído em ${rawRef}.
// Mantenha responsivo (mobile / tablet / desktop) e centralizado quando fizer sentido.
export function ${comp.name}() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center p-4">
      ${cardEl}
    </main>
  )
}
`)
  }

  if (comp.name.endsWith('Card')) {
    const children = [brandName(screen), formName(screen)].filter(has)
    const imports = children.map((c) => `import { ${c} } from '${ctx.childImport(c)}'`).join('\n')
    const inner = children.length
      ? children.map((c) => `      <${c} />`).join('\n')
      : `      {/* TODO: componha os componentes da tela aqui */}`
    return tsx(`${imports}${imports ? '\n\n' : ''}// TODO: refine a partir do HTML extraído em ${rawRef}.
export function ${comp.name}() {
  return (
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
${inner}
    </section>
  )
}
`)
  }

  if (comp.name.endsWith('Content')) {
    return tsx(`// TODO: refine a partir do HTML extraído em ${rawRef}.
export function ${comp.name}() {
  return <div className="w-full max-w-md">{/* conteúdo da tela ${screen} */}</div>
}
`)
  }

  if (comp.name.endsWith('Form')) {
    const formImports = ctx.globalImports(['Input', 'Button'])
    return tsx(`'use client'

${formImports}

// TODO: refine campos e validação a partir do HTML extraído em ${rawRef}.
export function ${comp.name}() {
  return (
    <form className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">E-mail</span>
        <Input type="email" name="email" autoComplete="email" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Senha</span>
        <Input type="password" name="password" autoComplete="current-password" required />
      </label>
      <Button type="submit" className="mt-2 w-full">
        Entrar
      </Button>
    </form>
  )
}
`)
  }

  if (comp.name.endsWith('Header') || comp.name.startsWith('Brand')) {
    return tsx(`// TODO: aponte o logo para o asset copiado em public/design-imports/${slugify(screen)}/.
// Ex.: <Image src="/design-imports/${slugify(screen)}/logo.svg" alt="Logo" width={140} height={48} />
export function ${comp.name}() {
  return (
    <header className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-xl font-semibold">Bem-vindo</h1>
      <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
    </header>
  )
}
`)
  }

  if (comp.name.endsWith('Illustration')) {
    return tsx(`import Image from 'next/image'

// TODO: aponte para a ilustração copiada em public/design-imports/${slugify(screen)}/.
export function ${comp.name}() {
  return (
    <div className="relative hidden aspect-square w-full overflow-hidden rounded-2xl lg:block">
      <Image
        src="/design-imports/${slugify(screen)}/auth-illustration.png"
        alt="Ilustração"
        fill
        className="object-cover"
        priority
      />
    </div>
  )
}
`)
  }

  // Genérico
  return tsx(`// TODO: refine a partir do HTML extraído em ${rawRef}.
export function ${comp.name}() {
  return <div className="w-full">${comp.name}</div>
}
`)
}

const cardName = (s) => `${PASCAL(s)}Card`
const formName = (s) => `${PASCAL(s)}Form`
const brandName = () => 'BrandHeader'

function uiImportPath(ctx) {
  // caminho relativo de srcRoot até uiDir (ex.: shared/components/ui ou components/ui)
  const rel = path.relative(ctx.router.srcRoot, ctx.ds.uiDir).replace(/\\/g, '/')
  return rel
}

function tsx(s) {
  return s
}

// ─────────────────────────────────────────────────────────────────────────────
// Geração de página
// ─────────────────────────────────────────────────────────────────────────────

function generatePage(target, router, screen, ctx) {
  const Screen = PASCAL(screen)
  const layout = `${Screen}Layout`
  const layoutFile = fileBase(layout, ctx.naming)

  if (fs.existsSync(target.pageFile) && !ctx.force) {
    return { file: path.relative(router.srcRoot, target.pageFile), written: false, note: 'já existe (use --force)' }
  }

  let content
  if (router.router === 'pages') {
    const from = path
      .relative(router.srcRoot, path.join(target.componentsDir, layoutFile))
      .replace(/\\/g, '/')
    content = tsx(`import { ${layout} } from '${ctx.aliases.alias}/${from}'

export default function ${Screen}Page() {
  return <${layout} />
}
`)
  } else {
    content = tsx(`import { ${layout} } from './_components/${layoutFile}'

export default function ${Screen}Page() {
  return <${layout} />
}
`)
  }

  writeText(target.pageFile, content, ctx)
  return { file: path.relative(router.srcRoot, target.pageFile), written: !ctx.dryRun, note: 'página criada' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validação
// ─────────────────────────────────────────────────────────────────────────────

function runValidation(componentResults, pageResult, assetsResult, router, ctx) {
  const checks = []

  // 1) Nenhum componente pode depender de URL remota do Claude Design.
  let remoteLeak = false
  for (const c of componentResults) {
    if (!c.written) continue
    const abs = path.join(router.srcRoot, c.file)
    if (!fs.existsSync(abs)) continue
    if (/claude\.ai\/design|https?:\/\/[^\s"']*claude/i.test(fs.readFileSync(abs, 'utf8'))) remoteLeak = true
  }
  checks.push({
    name: 'sem-url-remota-claude',
    ok: !remoteLeak,
    detail: remoteLeak ? 'Há referência a URL do Claude Design em componente gerado.' : 'OK',
  })

  // 2) Página existe (ou seria criada em dry-run).
  checks.push({
    name: 'pagina-gerada',
    ok: Boolean(pageResult),
    detail: pageResult ? pageResult.file : 'página não planejada',
  })

  // 3) Assets pendentes reportados.
  checks.push({
    name: 'assets-pendentes',
    ok: true,
    detail: `${assetsResult.pending.length} pendência(s)`,
  })

  // 4) Lint/tipos: apenas sinaliza como manual (não roda build pesado aqui).
  checks.push({
    name: 'typecheck',
    ok: true,
    detail: ctx.dryRun ? 'pulado (dry-run)' : 'rode `npm run build` / `tsc --noEmit` para validar tipos',
  })

  return checks
}

// ─────────────────────────────────────────────────────────────────────────────
// Relatório
// ─────────────────────────────────────────────────────────────────────────────

function writeReport(data, ctx) {
  const {
    screen,
    url,
    inputFile,
    frames,
    selectedFrame,
    assetsFound,
    assetsResult,
    componentResults,
    pageResult,
    checks,
    router,
    aliases,
    tailwind,
    ds,
    errors,
  } = data

  const reused = componentResults.filter((c) => c.action === 'reuse')
  const created = componentResults.filter((c) => c.action === 'create')
  const list = (arr) => (arr.length ? arr.map((x) => `- ${x}`).join('\n') : '- (nenhum)')

  const md = `# Relatório de importação — tela \`${screen}\`

> Gerado por \`import-cloud-design-next\`${ctx.dryRun ? ' (DRY-RUN — nada foi gravado)' : ''}

## Origem
- Link usado: ${url ? `\`${url}\`` : '(não usado)'}
- Arquivo local usado: ${inputFile ? `\`${path.relative(ROOT, inputFile)}\`` : '(não usado)'}

## Ambiente detectado
- Router: \`${router.router}\`
- Raiz de código: \`${path.relative(ROOT, router.srcRoot)}\`
- Tailwind: ${tailwind ? 'sim' : 'não'}
- Alias: \`${aliases.alias}\` → \`${aliases.target}\`${aliases.hasAlias ? '' : ' (ausente no tsconfig — considere adicionar)'}
- Componentes globais em: \`${path.relative(ROOT, ds.uiDir)}\` (${ds.usesShared ? 'convenção shared/' : 'components/'})

## Telas / frames
- Frames encontrados (${frames.length}):
${list(frames.map((f) => `\`${f.name}\``))}
- Tela importada: ${selectedFrame ? `\`${selectedFrame.name}\`` : '(nenhum frame correspondente — verifique --frame)'}

## Assets
- Assets encontrados: ${assetsFound.length}
- Assets copiados (${assetsResult.copied.length}) → \`${path.relative(ROOT, assetsResult.publicDir)}\`:
${list(assetsResult.copied.map((a) => `\`${a.filename}\` (${a.origin})`))}
- Assets pendentes (${assetsResult.pending.length}):
${list(assetsResult.pending.map((a) => `${a.origin}: ${a.url || a.relPath || a.name} — ${a.reason}`))}

## Componentes
- Reutilizados (${reused.length}):
${list(reused.map((c) => `\`${c.name}\` → \`${c.existingPath}\``))}
- Novos criados (${created.length}):
${list(created.map((c) => `\`${c.name}\` → \`${c.file}\` [${c.scope}] (${c.note})`))}

## Página
- ${pageResult ? `\`${pageResult.file}\` — ${pageResult.note}` : '(não gerada)'}

## Arquivos alterados
${list(
  [
    ...componentResults.filter((c) => c.written).map((c) => c.file),
    ...(pageResult && pageResult.written ? [pageResult.file] : []),
    ...assetsResult.copied.map((a) => path.relative(ROOT, path.join(assetsResult.publicDir, a.filename))),
  ].map((f) => `\`${f}\``),
)}

## Validações
${checks.map((c) => `- [${c.ok ? 'x' : ' '}] ${c.name}: ${c.detail}`).join('\n')}

## Erros / pendências
${errors && errors.length ? errors.map((e) => `- ${e}`).join('\n') : '- (nenhum)'}

## Próximos passos
1. Abra os esqueletos gerados e refine cada componente a partir do HTML em \`design-import/extracted/${slugify(screen)}.html\`.
2. Ajuste os \`<Image>\` para apontar aos assets copiados em \`public/design-imports/${slugify(screen)}/\`.
3. Resolva as pendências de assets (baixe manualmente e coloque em \`design-import/input/assets/\`).
4. Rode \`npm run build\` (ou \`tsc --noEmit\`) para validar tipos.
`

  const reportPath = path.join(ROOT, 'design-import', `report-${slugify(screen)}.md`)
  writeText(reportPath, md, ctx)
  return reportPath
}

// ─────────────────────────────────────────────────────────────────────────────
// I/O helpers (respeitam dry-run)
// ─────────────────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}
function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}
function writeText(file, content, ctx) {
  if (ctx.dryRun) return
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, content, 'utf8')
}
function writeBinary(file, buffer, ctx) {
  if (ctx.dryRun) return
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, buffer)
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs()
  const ctx = { dryRun: args.dryRun, force: args.force }
  const errors = []

  if (!args.screen) {
    console.error('Erro: informe a tela com --screen=<nome> (ex.: --screen=login).')
    process.exit(1)
  }
  const screen = args.screen

  // 1) Ambiente
  const ws = detectWorkspace()
  const appInfo = detectNextApp(ws, args.app)
  const router = detectRouterMode(appInfo)
  const tailwind = detectTailwind(appInfo)
  const aliases = detectAliases(appInfo)
  const ds = detectDesignSystem(router)

  console.log(`→ App: ${path.relative(ROOT, appInfo.dir) || '.'} | router: ${router.router} | tailwind: ${tailwind}`)
  console.log(`→ Componentes globais em: ${path.relative(ROOT, ds.uiDir)}`)
  if (ctx.dryRun) console.log('→ DRY-RUN: nenhuma gravação será feita.')

  // 2) Carregar design (link → fallback input)
  let html = null
  let css = ''
  let usedUrl = null
  let inputFile = null

  if (args.url) {
    const fromUrl = await loadDesignFromUrl(args.url)
    if (fromUrl.ok) {
      html = fromUrl.html
      usedUrl = args.url
      console.log('→ Design carregado a partir do link.')
    } else {
      console.log(`→ Link não acessível automaticamente (${fromUrl.reason}).`)
      errors.push(`Link não acessível: ${fromUrl.reason}`)
    }
  }

  if (!html) {
    const fromInput = loadDesignFromInput(args.input)
    if (fromInput.ok) {
      inputFile = fromInput.source
      css = fromInput.css || ''
      if (fromInput.kind === 'json') {
        // JSON exportado: guardamos como referência; a extração de HTML fica limitada.
        html = fromInput.json
        console.log(`→ Design (JSON) carregado de ${path.relative(ROOT, inputFile)}.`)
      } else {
        html = fromInput.html
        console.log(`→ Design carregado de ${path.relative(ROOT, inputFile)}.`)
      }
    } else if (args.url) {
      // Tinha URL mas falhou, e não há arquivo local.
      console.error(MANUAL_EXPORT_HINT)
      process.exit(2)
    } else {
      console.error(MANUAL_EXPORT_HINT)
      process.exit(2)
    }
  }

  // CSS de <style> embutido no documento também é fonte de assets (background-image)
  // e serve de referência para o refino. Junta com os .css avulsos exportados.
  css = [css, extractStyleBlocks(html)].filter(Boolean).join('\n')

  // 3) Frames
  const frames = extractFrames(html, screen)
  const selectedFrame = selectFrame(frames, screen, args.frame)
  if (frames.length > 1 && !selectedFrame) {
    console.log('→ Vários frames encontrados; nenhum casou com a tela pedida:')
    frames.forEach((f) => console.log(`   - ${f.name}`))
    console.log('   Informe --frame="<nome exato>".')
  }
  const frameHtml = selectedFrame ? selectedFrame.html : html

  // Salvar HTML extraído da tela para o refino manual/IA.
  writeText(path.join(EXTRACTED_DIR, `${slugify(screen)}.html`), frameHtml || '', ctx)
  if (css) writeText(path.join(EXTRACTED_DIR, `${slugify(screen)}.css`), css, ctx)

  // 4) Assets
  const assetsFound = extractAssets(frameHtml, css, usedUrl)
  const assetsResult = await copyAssetsToPublic(assetsFound, slugify(screen), appInfo, ctx)
  console.log(`→ Assets: ${assetsResult.copied.length} copiado(s), ${assetsResult.pending.length} pendente(s).`)

  // 5) Componentes
  const existing = scanExistingComponents(router, ds)
  const naming = detectNaming(existing)
  console.log(`→ Convenção de nome de arquivo: ${naming}${ds.sharedIndex ? ' | barrel @/shared' : ''}`)
  const plan = planComponents(screen, frameHtml, existing)
  const target = resolveRouteTarget(screen, router, ds)
  const genCtx = { ...ctx, aliases, router, ds, naming }
  const { results: componentResults, warnings: compWarnings } = generateComponents(
    plan,
    target,
    router,
    aliases,
    ds,
    screen,
    frameHtml,
    genCtx,
  )
  errors.push(...compWarnings)

  // 6) Página
  const pageResult = generatePage(target, router, screen, { ...ctx, aliases, naming })

  // 7) Validação
  const checks = runValidation(componentResults, pageResult, assetsResult, router, ctx)

  // 8) Relatório
  const reportPath = writeReport(
    {
      screen,
      url: usedUrl,
      inputFile,
      frames,
      selectedFrame,
      assetsFound,
      assetsResult,
      componentResults,
      pageResult,
      checks,
      router,
      aliases,
      tailwind,
      ds,
      errors,
    },
    ctx,
  )

  console.log('')
  console.log(`✅ Concluído para a tela "${screen}".`)
  console.log(`📄 Relatório: ${path.relative(ROOT, reportPath)}${ctx.dryRun ? ' (dry-run: não gravado)' : ''}`)
  if (!tailwind) console.log('⚠️  Tailwind não detectado — os esqueletos usam classes Tailwind; ajuste se necessário.')
  if (assetsResult.pending.length) console.log(`⚠️  ${assetsResult.pending.length} asset(s) pendente(s) — ver relatório.`)
}

main().catch((err) => {
  console.error(`Erro: ${err.message}`)
  process.exit(1)
})
