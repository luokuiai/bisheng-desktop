import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { JSDOM, VirtualConsole } from 'jsdom'
import { expect, it, vi } from 'vitest'
import { prepareBootCopy, prepareMenuPresence, prepareModalClose, prepareReferenceIcons } from '../scripts/prepare-reference-icons.mjs'

const frontend = new URL('../node_modules/@deepseek-ai/dsh-web-frontend/dist/', import.meta.url)
const html = readFileSync(new URL('index.html', frontend), 'utf8')
const entry = new URL(html.match(/<script[^>]*src="([^"?]+)/)[1], frontend)
const bundle = readFileSync(entry, 'utf8')
const primitives = readFileSync(new URL('../node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js', import.meta.url), 'utf8')

async function loadSharedModules() {
  // Execute the complete shipped web entry + vendor graph. Capture the exact
  // staticModules handed to Harness's loader, rather than mocking primitives.
  const built = await build({ entryPoints: [fileURLToPath(entry)], bundle: true, format: 'iife', write: false, logLevel: 'silent' })
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only', url: 'http://localhost', virtualConsole: new VirtualConsole() })
  let modules, boot
  dom.window.__ModuleLoader__ = { create: options => {
    modules = options.staticModules
    const spinner = dom.window.document.querySelector('[data-dsh-boot-spinner]')
    boot = { brand: spinner?.previousElementSibling?.textContent, status: spinner?.nextElementSibling?.textContent }
    throw new Error('Test: shared modules captured')
  } }
  dom.window.eval(built.outputFiles[0].text)
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(modules).toBeDefined()
  const React = modules.react
  const root = modules['react-dom/client'].createRoot(dom.window.document.getElementById('root'))
  const render = element => modules['react-dom'].flushSync(() => root.render(element))
  return { dom, modules, React, render, boot, close() { root.unmount(); dom.window.close() } }
}

it('shows the desktop wordmark and Chinese loading status before activating plugins', async () => {
  const { boot, close } = await loadSharedModules()
  try {
    expect(boot).toEqual({ brand: 'LUOKUI-AI', status: '正在加载插件…' })
  } finally { close() }
})

it('loads the actual frontend shared module and renders every reference icon', async () => {
  const { dom, modules, React, render, close } = await loadSharedModules()
  try {
    render(React.createElement('div', {},
      ...['skill', 'tool', 'folder', 'file', 'session'].map(kind => React.createElement('span', { key: kind, 'data-kind': kind },
        React.createElement(modules['@deepseek-ai/dsh-client-ui-primitives'].ReferenceIconRegular, { kind, size: 14, className: 'reference-icon' })))))
    for (const kind of ['skill', 'tool', 'folder', 'file', 'session']) {
      const svg = dom.window.document.querySelector(`[data-kind="${kind}"] svg`)
      expect(svg, `${kind} must render from the shipped shared module`).not.toBeNull()
      expect(svg.getAttribute('width')).toBe('14')
      expect(svg.getAttribute('class')).toBe('reference-icon')
      expect(svg.querySelector('path')).not.toBeNull()
    }
  } finally { close() }
})

it('keeps the shipped menu inert while exiting and cancels removal when reopened', async () => {
  const { dom, modules, React, render, close } = await loadSharedModules()
  const { Menu } = modules['@deepseek-ai/dsh-client-ui-primitives']
  const anchor = React.createElement('button', { type: 'button' }, 'Account')
  const renderMenu = (open, animatePresence = true) => render(React.createElement(Menu, { open, animatePresence, anchor, onClose() {} }))
  const findMenu = () => dom.window.document.querySelector('[role="menu"]')
  try {
    renderMenu(true)
    const menu = findMenu()
    const first = Promise.withResolvers()
    menu.getAnimations = () => [{ playState: 'running', finished: first.promise }]
    renderMenu(false)
    expect(findMenu()).toBe(menu)
    expect(menu.hasAttribute('inert')).toBe(true)
    expect(menu.hasAttribute('data-exiting')).toBe(true)

    renderMenu(true)
    first.resolve()
    await Promise.resolve()
    expect(menu.hasAttribute('inert')).toBe(false)

    const second = Promise.withResolvers()
    menu.getAnimations = () => [{ playState: 'running', finished: second.promise }]
    renderMenu(false)
    second.resolve()
    await vi.waitFor(() => expect(findMenu()).toBeNull())

    renderMenu(true, false)
    findMenu().getAnimations = () => [{ playState: 'running', finished: new Promise(() => {}) }]
    renderMenu(false, false)
    expect(findMenu()).toBeNull()
  } finally { close() }
})

it('marks only the default close button of a shipped Harness modal and preserves its close action', async () => {
  const { dom, modules, React, render, close } = await loadSharedModules()
  const { Modal } = modules['@deepseek-ai/dsh-client-ui-primitives']
  const onClose = vi.fn()
  const renderModal = headless => render(React.createElement(Modal, { open: true, title: 'Modal', closeLabel: 'Dismiss', onClose, headless },
    React.createElement('button', { 'aria-label': 'Another action' }, 'Action')))
  try {
    renderModal(false)
    const dialog = dom.window.document.querySelector('[role="dialog"]')
    const button = dialog.querySelector('button[data-dsh-modal-close]')
    expect(button.getAttribute('aria-label')).toBe('Dismiss')
    expect(dialog.querySelector('[aria-label="Another action"]').hasAttribute('data-dsh-modal-close')).toBe(false)
    button.click()
    expect(onClose).toHaveBeenCalledOnce()
    renderModal(true)
    expect(dialog.querySelector('[data-dsh-modal-close]')).toBeNull()
  } finally { close() }
})

it('reproduces identical output and rejects upstream contract drift', () => {
  const upstream = bundle.replace(/\/\* BISHENG_REFERENCE_ICONS_BEGIN \*\/[\s\S]*?\/\* BISHENG_REFERENCE_ICONS_END \*\//, '')
  expect(prepareReferenceIcons(upstream, primitives)).toBe(bundle)
  expect(prepareReferenceIcons(bundle, primitives)).toBe(bundle)
  expect(prepareMenuPresence(bundle)).toBe(bundle)
  expect(prepareModalClose(bundle.replace('"data-dsh-modal-close":"",', ''))).toBe(bundle)
  expect(prepareBootCopy(bundle.replace('.wordmark,"LUOKUI-AI")', '.wordmark,"HARNESS")')
    .replace('.hint,"正在加载插件…")', '.hint,"Loading plugins…")'))).toBe(bundle)
  expect(prepareBootCopy(bundle)).toBe(bundle)
  expect(() => prepareBootCopy(bundle.replace('正在加载插件…', 'Loading…'))).toThrow('expected one loading status')
  expect(() => prepareReferenceIcons(bundle.replace('ReferenceIconRegular:', 'RenamedIcon:'), primitives)).toThrow('public ReferenceIconRegular export')
  expect(() => prepareReferenceIcons(bundle, primitives.replace('function HammerReferenceArtwork', 'function ChangedArtwork'))).toThrow('HammerReferenceArtwork')
})
