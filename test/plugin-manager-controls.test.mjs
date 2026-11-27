// @vitest-environment jsdom
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import vm from 'node:vm'
import React, { act, forwardRef } from 'react'
import * as ReactDOM from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

const harnessRequire = createRequire(import.meta.url)
const workspace = resolve('packages/dsh-desktop-client-ui/workspace')
const { createElement: element } = React
let managerPage, idleInstall, settingsControls, container, root
globalThis.IS_REACT_ACT_ENVIRONMENT = true

beforeAll(async () => {
  const { stdout } = await promisify(execFile)(process.execPath, [
    '-e',
    `const { buildSync } = require('esbuild')
    const workspace = process.argv[1]
    process.stdout.write(buildSync({
      entryPoints: [require('node:path').join(workspace, 'settings-controls.tsx')],
      alias: { '@': workspace }, bundle: true, platform: 'node', format: 'cjs',
      jsx: 'automatic', packages: 'external', write: false
    }).outputFiles[0].text)`,
    workspace
  ])
  const module = { exports: {} }
  vm.runInThisContext(`(function (module, require) {${stdout}\n})`)(module, harnessRequire)
  settingsControls = module.exports.settingsControls

  const location = harnessRequire.resolve('@deepseek-ai/dsh-client-ui-plugin-manager/package.json')
  const source = await readFile(location.replace('package.json', 'lib/client.js'), 'utf8')
  const span = ({ children }) => element('span', null, children)
  const primitives = {
    ...Object.fromEntries((source.match(/(?<=_primitives\.)(?:Icon|PluginArtwork)\w+/g) ?? []).map(name => [name, span])),
    Button: forwardRef(({ variant, size, icon, children, ...props }, ref) =>
      element('button', { ...props, ref }, icon, children)),
    Switch: ({ checked, disabled, label, title, onChange }) =>
      element('button', { role: 'switch', 'aria-checked': checked, 'aria-label': label, disabled, title,
        onClick: () => onChange(!checked) }),
    Menu: ({ anchor, open, children }) => element(React.Fragment, null, anchor, open ? element('div', { role: 'menu' }, children) : null),
    MenuItemButton: ({ children, onSelect }) => element('button', { role: 'menuitem', onClick: onSelect }, children),
    Modal: ({ open, children }) => open ? children : null,
    Tooltip: ({ children }) => children,
    StateDot: span,
    Tag: span,
    useAnchoredPosition: () => null,
    useDismissOnOutsidePointer() {}
  }
  const modules = {
    react: React, 'react/jsx-runtime': jsxRuntime, 'react-dom': ReactDOM,
    '@deepseek-ai/dsh-client-ui-primitives': primitives,
    '@deepseek-ai/dsh-client-ui-slots': {}, '@deepseek-ai/dsh-client-store': {}
  }
  const loader = { load({ factory }) { ({ managerPage, idleInstall } = factory(id => modules[id])) } }
  vm.runInNewContext(source.replace('exports.apply = apply;', 'exports.managerPage = PluginManagerWithControls; exports.idleInstall = IDLE_INSTALL; exports.apply = apply;'), {
    document,
    window: { __ModuleLoader__: loader }
  })
})

beforeEach(() => {
  container = document.body.appendChild(document.createElement('div'))
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const experimental = '@deepseek-ai/dsh-experimental-agent-team-profile'
const optional = '@deepseek-ai/dsh-experimental-tool-worktree'

function managerFixture(board) {
  const install = vi.fn(), refresh = vi.fn(), setEnabled = vi.fn()
  const state = {
    status: 'ready', refreshStatus: 'idle', busy: [], notice: null, highlight: null, confirm: null,
    install: idleInstall,
    packages: [
      { name: experimental, official: true, enabled: false, availability: 'present', rows: [] },
      { name: optional, official: true, enabled: true, availability: 'present', rows: [] }
    ]
  }
  let view = { kind: 'list' }
  function render() {
    return act(async () => root.render(element(managerPage, {
      t: (key, values) => values?.name ? `${key} ${values.name}` : key, ensure() {}, resolveText: text => text,
      renderSlot: (name, props, options) => name === 'plugins.controls' ? board ? props.render(settingsControls) : options.fallback : null,
      useConfigurations: select => select({}), usePluginManager: select => select(state),
      useConfigLedger: select => select({ items: [], rows: new Set(), bundles: new Set() }),
      useStore: select => select({ view, tab: 'installed' }), usePluginTabs: select => select([]),
      actions: { setView: next => { view = next }, setTab() {} },
      openInstall: install, refresh, setEnabled
    })))
  }
  return { state, render, install, refresh, setEnabled }
}

const labelled = label => container.querySelector(`[aria-label="${label}"]`)
const button = label => [...container.querySelectorAll('button')].find(node => node.textContent.trim() === label)
const toggle = (id = experimental) => container.querySelector(`[data-plugin-package="${id}"] [role="switch"]`)

it('uses Board UI for the plugin list actions and keeps the add menu reachable by keyboard', async () => {
  const page = managerFixture(true)
  await page.render()
  const add = button('addPlugin')
  const more = labelled('chooseAddMethod')
  const refresh = labelled('refresh')
  expect(add.classList.contains('bg-button-primary')).toBe(true)
  expect(more.classList.contains('bg-button-primary')).toBe(true)
  expect(refresh.classList.contains('bg-button-ghost-background')).toBe(true)
  expect(button('moreAction').classList.contains('bg-button-ghost-background')).toBe(true)
  await act(async () => add.click())
  refresh.click()
  expect(page.install).toHaveBeenCalledOnce()
  expect(page.refresh).toHaveBeenCalledOnce()
  await act(async () => more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })))
  expect(more.getAttribute('aria-expanded')).toBe('true')
  await act(async () => document.querySelector('[role="menuitem"]').click())
  expect(page.install).toHaveBeenCalledTimes(2)
  expect(more.getAttribute('aria-expanded')).toBe('false')
  page.state.refreshStatus = 'refreshing'
  await page.render()
  expect(refresh.disabled).toBe(true)
  expect(refresh.getAttribute('aria-busy')).toBe('true')
})

it('keeps plugin switches controlled and blocks interaction while busy or locked', async () => {
  const page = managerFixture(true)
  await page.render()
  let control = toggle()
  expect(control.closest('.dshSettingsControl')).not.toBeNull()
  expect(control.checked).toBe(false)
  await act(async () => control.click())
  expect(page.setEnabled).toHaveBeenCalledWith(experimental, true)
  expect(control.checked).toBe(false)

  page.state.packages[0].enabled = true
  page.state.busy = [experimental]
  page.state.packages[1].readOnlyReason = 'management-required'
  await page.render()
  control = toggle()
  expect(control.checked).toBe(true)
  expect(control.disabled).toBe(true)
  control.click()
  expect(page.setEnabled).toHaveBeenCalledOnce()
  await act(async () => button('moreAction').click())
  await page.render()
  expect(toggle(optional).disabled).toBe(true)
  expect(toggle(optional).closest('[title]').title).toBe('reasonManagementRequired')
})

it('keeps the Harness controls usable without the optional Board UI renderer', async () => {
  const page = managerFixture(false)
  await page.render()
  expect(button('addPlugin').closest('.dshSettingsControl')).toBeNull()
  expect(toggle().closest('.dshSettingsControl')).toBeNull()
  await act(async () => toggle().click())
  labelled('refresh').click()
  expect(page.setEnabled).toHaveBeenCalledWith(experimental, true)
  expect(page.refresh).toHaveBeenCalledOnce()
})
