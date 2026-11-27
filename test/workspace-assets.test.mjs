import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { it, expect } from 'vitest'
import { publishWorkspace } from '../scripts/publish-workspace-assets.mjs'
import { createPackage } from '@electron/asar'
import verifier from '../scripts/verify-packaged-workspace.cjs'
import snapshotPackagedWorkspace from '../scripts/snapshot-packaged-workspace.cjs'
import postcss from 'postcss'

it('applies the dark contribution palette and themed images inside Harness page slots', async () => {
  const path = new URL('../node_modules/@deepseek-ai/dsh-web-frontend/dist/desktop-workspace/workspace.css', import.meta.url)
  const sheet = postcss.parse(await readFile(path, 'utf8'))
  const selectors = []
  sheet.walkRules(rule => selectors.push(...rule.selectors))
  expect(selectors).toContain(':scope:where(.dark, .dark *) .contributions-grid[data-accent="violet"]')
  expect(selectors).toContain(':scope:where(.dark, .dark *) .theme-logo-dark')
})

it('isolates CSS Modules and their animations from plugin dialogs sharing the document', async () => {
  const root = new URL('../node_modules/@deepseek-ai/dsh-web-frontend/dist/desktop-workspace/', import.meta.url)
  const sheet = postcss.parse(await readFile(new URL('pages.css', root), 'utf8'))
  expect(sheet.nodes).toHaveLength(1)
  expect(sheet.first).toMatchObject({ type: 'atrule', name: 'scope', params: '(.dshWorkspacePages, .dshWorkspacePortal, [data-workspace-right-sidebar-slot])' })
  const classes = new Set()
  sheet.walkRules(rule => {
    for (const match of rule.selector.matchAll(/\.([\w-]+)/gu)) classes.add(match[1])
  })
  expect(classes).toContain('dsh_workspace_sidebar_motion_pushSidebar')
  expect([...classes].filter(name => !name.startsWith('dsh_workspace_') && name !== 'dark')).toEqual([])
  sheet.walkAtRules('keyframes', rule => expect(rule.params).toMatch(/^dsh_workspace_/u))
})

it('keeps an open renderer’s lazy modules reachable and packages only the new workspace', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'desktop-workspace-publish-'))
  const live = path.join(root, 'live'), release = path.join(root, 'release')
  try {
    for (const version of ['one', 'two']) {
      const prepared = path.join(root, version, 'next')
      await mkdir(path.join(prepared, 'chunks'), { recursive: true })
      await writeFile(path.join(prepared, 'chunks', `${version}.js`), version)
      await writeFile(path.join(prepared, 'pages.js'), `import './chunks/${version}.js'`)
      await publishWorkspace(prepared, live, release)
    }
    expect(await readFile(path.join(live, 'chunks/one.js'), 'utf8')).toBe('one')
    expect(await readFile(path.join(live, 'pages.js'), 'utf8')).toContain('two.js')
    expect(await readdir(path.join(release, 'chunks'))).toEqual(['two.js'])
  } finally { await rm(root, { recursive: true, force: true }) }
})

it('verifies the packaged workspace bytes and rejects missing and stale lazy modules', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'desktop-workspace-archive-'))
  const packaged = path.join(root, 'app/node_modules/@deepseek-ai/dsh-web-frontend/dist/desktop-workspace')
  const prepared = path.join(root, 'prepared')
  try {
    for (const directory of [prepared, packaged]) {
      await mkdir(path.join(directory, 'chunks'), { recursive: true })
      await writeFile(path.join(directory, 'pages.js'), "import './chunks/admin.js'")
      await writeFile(path.join(directory, 'chunks/admin.js'), 'export default 1')
    }
    await createPackage(path.join(root, 'app'), path.join(root, 'app.asar'))
    const verify = () => verifier.verifyPackagedWorkspace(root, prepared)
    expect(verify).not.toThrow()
    const lazy = path.join(prepared, 'chunks/admin.js')
    await writeFile(lazy, 'export default 2')
    expect(verify).toThrow('differs from the current build: chunks/admin.js')
    await rm(lazy)
    expect(verify).toThrow('Unreferenced desktop workspace asset in package: chunks/admin.js')
    await writeFile(lazy, 'export default 1')
    await writeFile(path.join(prepared, 'chunks/new.js'), '')
    expect(verify).toThrow('missing: chunks/new.js')
  } finally { await rm(root, { recursive: true, force: true }) }
})

it('pins the same generation for all packaging targets while a dev renderer updates', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'desktop-workspace-pack-targets-'))
  const prepared = path.join(root, '.build/desktop-workspace')
  const files = { from: '.build/desktop-workspace', to: 'node_modules/@deepseek-ai/dsh-web-frontend/dist/desktop-workspace' }
  let snapshots = 0
  const packager = {
    projectDir: root, config: { files: ['out/**/*', files] },
    info: { tempDirManager: { getTempDir: async () => { snapshots++; return mkdtemp(path.join(root, 'snapshot-')) } } }
  }
  try {
    await mkdir(prepared, { recursive: true })
    await writeFile(path.join(prepared, 'lazy-one.js'), 'old renderer')
    await Promise.all([snapshotPackagedWorkspace({ packager }), snapshotPackagedWorkspace({ packager })])
    expect(snapshots).toBe(1)
    expect(files.from).not.toBe(prepared)
    await rm(path.join(prepared, 'lazy-one.js'))
    await writeFile(path.join(prepared, 'lazy-two.js'), 'new renderer')
    expect(await readdir(files.from)).toEqual(['lazy-one.js'])
    expect(await readFile(path.join(files.from, 'lazy-one.js'), 'utf8')).toBe('old renderer')
  } finally { await rm(root, { recursive: true, force: true }) }
})
