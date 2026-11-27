import { build } from 'esbuild'
import { lockWorkspacePublication, publishWorkspace } from './publish-workspace-assets.mjs'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import postcss from 'postcss'
import { cp, mkdir, mkdtemp, readFile, writeFile, readdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = path.join(root, 'packages/dsh-desktop-client-ui/workspace')
const frontend = path.join(root, 'node_modules/@deepseek-ai/dsh-web-frontend/dist')
const pageScopes = '(.dshWorkspacePages, .dshWorkspacePortal, [data-workspace-right-sidebar-slot])'

function adaptRootSelectors(sheet) {
  // Harness owns the document. Resets, dark palettes and themed images must
  // match at each scoped page or portal root when the document changes theme.
  sheet.walkRules(rule => {
    rule.selectors = rule.selectors.map(selector => {
      const pageRoot = /^(?:html|body)(?=[\s.:[>]|$)/u.test(selector)
      const scoped = selector
        .replace(/:root\b|(?<![\w.#-])(?:html|body)(?=[\s.,:{\[>]|$)/gu, ':scope')
        .replace(/^(?::scope)?\.dark(?=\s|$)/u, ':scope:where(.dark, .dark *)')
      return pageRoot ? scoped.replace(/^:scope/u, ':scope:not(:where(.dshSettingsControl))') : scoped
    })
  })
}

async function buildWorkspace(outdir) {
  await cp(path.join(source, 'public'), outdir, { recursive: true })
  await cp(path.join(source, 'static'), outdir, { recursive: true })
  await cp(path.join(source, 'NOTICE.md'), path.join(outdir, 'NOTICE.txt'))

  // The Harness module loader owns these singletons. Libraries in the workspace
  // bundle import the same objects as the surrounding slot (including portals).
  const hostModules = new Set(['react', 'react-dom', 'react/jsx-runtime'])
  await build({
    entryPoints: ['pages.tsx', 'settings-controls.tsx', 'chat-controls.tsx'].map(file => path.join(source, file)), outdir, bundle: true,
    format: 'esm', platform: 'browser', target: 'chrome140', splitting: true,
    // Preserve the dsh-workspace filename prefix on CSS Module classes and
    // keyframes. Other independently built plugins share this document.
    jsx: 'automatic', minifySyntax: true, minifyWhitespace: true, legalComments: 'eof', chunkNames: 'chunks/[name]-[hash]',
    define: { 'process.env.NODE_ENV': '"production"' },
    alias: { '@': source },
    loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl' },
    plugins: [{
      name: 'harness-react',
      setup(builder) {
        builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, args => {
          if (!hostModules.has(args.path)) throw new Error(`Unsupported Harness React import: ${args.path}`)
          return { path: args.path, namespace: 'harness' }
        })
        builder.onResolve({ filter: /^host-runtime$/, namespace: 'harness' }, () => ({ path: '/desktop-workspace/host-runtime.js', external: true }))
        builder.onLoad({ filter: /.*/, namespace: 'harness' }, args => ({ contents: `import { resolveHost } from 'host-runtime'; module.exports = resolveHost(${JSON.stringify(args.path)})` }))
      }
    }]
  })

  const styleDir = path.join(source, 'styles')
  const input = await readFile(path.join(styleDir, 'globals.css'), 'utf8')
  const compiler = await compile(input, { base: styleDir, onDependency() {} })
  const scanner = new Scanner({ sources: [{ base: source, pattern: '**/*.{tsx,ts,js,jsx}', negated: false }] })
  const sheet = postcss.parse(compiler.build(scanner.scan()))
  const workspaceStyle = await readFile(path.join(styleDir, 'workspace.css'), 'utf8')
  sheet.append(postcss.parse(workspaceStyle))
  adaptRootSelectors(sheet)
  const scoped = postcss.atRule({ name: 'scope', params: pageScopes.replace(/\)$/u, ', .dshSettingsControl)') })
  const css = postcss.root()
  // @property declarations must be globally registered for transform, gradient,
  // and shadow utilities. The names are Tailwind-prefixed.
  sheet.walkAtRules('property', rule => { css.append(rule.clone()); rule.remove() })
  // Native conversation nodes use Harness layout and controls. Carry the Board
  // UI surface and secondary button tokens across that boundary without resets.
  const chatSurfaces = postcss.atRule({ name: 'scope', params: '(body[data-dsh-workspace-scene=chat] #dsh-panel-work)' })
  sheet.walkRules(rule => {
    if (![':scope', ':scope, :host', ':scope:where(.dark, .dark *)'].includes(rule.selector)) return
    const tokens = postcss.rule({ selector: rule.selector.replace(', :host', '') })
    for (const decl of rule.nodes) {
      if (decl.type === 'decl' && /^--color-(?:white|neutral-[0-9]+|background-(?:full|primary-(?:default|hover|active|disabled)|secondary-default)|border-button-(?:default|hover|active)|text-(?:primary|secondary|tertiary))$/u.test(decl.prop) &&
        decl.value !== `var(${decl.prop})`) tokens.append(decl.clone())
    }
    if (tokens.nodes.length) chatSurfaces.append(tokens)
  })
  css.append(chatSurfaces)
  scoped.append(sheet.nodes.slice())
  css.append(scoped)
  await writeFile(path.join(outdir, 'workspace.css'), css.toString())

  const chunks = await readdir(path.join(outdir, 'chunks'))
  const moduleSheets = ['pages.css', ...chunks.filter(file => file.endsWith('.css')).map(file => path.join('chunks', file))]
  for (const file of moduleSheets) {
    const modulesFile = path.join(outdir, file)
    const modules = postcss.parse(await readFile(modulesFile, 'utf8'))
    adaptRootSelectors(modules)
    const scopedModules = postcss.atRule({ name: 'scope', params: pageScopes })
    scopedModules.append(modules.nodes.slice())
    await writeFile(modulesFile, scopedModules.toString())
  }

  const additionalSheets = (await readdir(path.join(source, 'static'))).filter(name => name.endsWith('.css') && name !== 'inter.css')
  const sheets = ['inter.css', 'workspace.css', 'pages.css', ...additionalSheets]
  const entries = new Set(await readdir(outdir))
  return sheets.filter(name => entries.has(name)).map(name => `<link rel="stylesheet" href="/desktop-workspace/${name}">`).join('\n')

}

// Compile outside the lock. A dev server, test and packager can prepare the
// same checkout independently without interleaving their release snapshots.
const cache = path.join(root, '.build')
await mkdir(cache, { recursive: true })
const staging = await mkdtemp(path.join(cache, 'workspace-'))
const prepared = path.join(staging, 'next')
const published = path.join(frontend, 'desktop-workspace')
try {
  await mkdir(prepared)
  const links = await buildWorkspace(prepared)
  const entry = path.join(frontend, 'index.html')
  // Keep atomic-rename sources on the frontend's filesystem but outside its
  // distributable files. Builder can enumerate the installed package while a
  // dev server publishes; a temporary name in dist may vanish before packing.
  const scratchBase = path.join(frontend, '..', 'node_modules/.cache')
  await mkdir(scratchBase, { recursive: true })
  const scratch = await mkdtemp(path.join(scratchBase, 'desktop-workspace-'))
  let release
  try {
    release = await lockWorkspacePublication(cache)
    const previous = await readFile(entry, 'utf8')
    const html = previous.replace(/<!-- workspace-styles -->[\s\S]*?<!-- end-workspace-styles -->\n?/u, '')
    if (!html.includes('</head>')) throw new Error('Harness HTML has no head for the workspace styles')
    const next = html.replace('</head>', `<!-- workspace-styles -->\n${links}\n<!-- end-workspace-styles -->\n</head>`)
    await publishWorkspace(prepared, published, path.join(cache, 'desktop-workspace'), scratch)
    if (next !== previous) {
      const nextHtml = path.join(scratch, 'index.html')
      await writeFile(nextHtml, next)
      await rename(nextHtml, entry)
    }
  } finally {
    try { await rm(scratch, { recursive: true, force: true }) } finally { await release?.() }
  }
} finally {
  await rm(staging, { recursive: true, force: true })
}
console.log('Prepared desktop workspace pages, local fonts, styles and media')
