// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import * as workspaceChrome from '../packages/dsh-desktop-client-ui/workspace/static/workspace-chrome.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
const disposers = []
beforeEach(() => {
  vi.stubGlobal('localStorage', globalThis.jsdom.window.localStorage)
  window.localStorage.removeItem('dsh-desktop-navigation-order')
  window.localStorage.removeItem('dsh-desktop:workspace:compact')
  // jsdom supplies DOM state; the Electron fixture verifies native visibility/layout.
  const original = Element.prototype.checkVisibility
  Element.prototype.checkVisibility = function () {
    return !this.closest('[hidden], [style="display: none;"], [style="visibility: hidden;"]')
  }
  disposers.push(() => {
    if (original) Element.prototype.checkVisibility = original
    else delete Element.prototype.checkVisibility
    document.querySelectorAll('[data-host-dialog-fixture]').forEach(element => element.remove())
  })
})
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = undefined
  container?.remove()
  document.documentElement.removeAttribute('data-dsh-safe-mode-page')
  document.documentElement.removeAttribute('data-dsh-about-open')
  document.documentElement.removeAttribute('data-platform')
  document.documentElement.removeAttribute('data-fullscreen')
  document.documentElement.removeAttribute('data-windows-titlebar')
  document.body.removeAttribute('data-ds-dark-theme')
  disposers.splice(0).reverse().forEach(dispose => dispose())
  delete window.dshEnterpriseChat
  delete window.dshDesktop
  delete window.__ModuleLoader__
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
async function mount(connected = false, collection = {}, inert = false, workbench, desktop = false, navigationOptions = {}) {
  if (navigationOptions.workspaceRoutes) {
    const stylesheet = document.createElement('link')
    stylesheet.href = '/desktop-workspace/workspace.css'
    document.head.append(stylesheet)
    disposers.push(() => stylesheet.remove())
  }
  if (desktop) window.dshDesktop = { restartHarness: vi.fn() }
  let workbenchSnapshot = workbench
  let bindWorkbench, disposeWorkbench
  const workbenchListeners = new Set()
  const attachWorkbench = () => bindWorkbench({
    desktopWorkbenches: {
      getSnapshot: () => workbenchSnapshot,
      subscribe: fn => { workbenchListeners.add(fn); return () => workbenchListeners.delete(fn) }
    },
    effect(fn) { disposeWorkbench = fn() }
  })
  disposers.push(() => disposeWorkbench?.())
  let snapshot = { connected, phase: 'ready', epoch: 1, conversationId: 'new', settingsProtocolVersion: 1 }
  let chatListener
  const dismissHostedApp = async () => {
    if (!snapshot.hostedApp) return
    snapshot = { ...snapshot, hostedApp: undefined }
    chatListener(snapshot)
  }
  window.dshEnterpriseChat = {
    subscribe: fn => { chatListener = fn; return () => { chatListener = undefined } },
    state: vi.fn(async () => ({ ...snapshot })),
    present: vi.fn(async () => ({ ...snapshot })),
    retry: vi.fn(async () => {}),
    history: vi.fn(async () => ({ epoch: 1, items: [{ id: 'cloud-a', title: 'Cloud chat', updatedAt: '2026-10-16' }], hasMore: false })),
    openPage: vi.fn(dismissHostedApp),
    open: vi.fn(dismissHostedApp),
    closeHostedApp: vi.fn(dismissHostedApp),
    retryHostedApp: vi.fn(async () => {
      snapshot = { ...snapshot, hostedApp: { ...snapshot.hostedApp, phase: 'loading' } }
      chatListener(snapshot)
    })
  }
  const resizeObservers = new Set()
  vi.stubGlobal('ResizeObserver', class {
    targets = new Set()
    constructor(callback) { this.callback = callback }
    observe(target) {
      this.targets.add(target)
      resizeObservers.add(this)
    }
    unobserve(target) { this.targets.delete(target) }
    disconnect() {
      this.targets.clear()
      resizeObservers.delete(this)
    }
  })
  let plugin, navigate
  let sessionList = navigationOptions.sessionList ?? { phase: 'ready', byId: { draft: { id: 'draft', blank: true, retainedBy: { mainView: 1 } } } }
  let liveState = { blank: true, pendingSubmissions: [], running: false, awaitingFirstTurn: false }
  const liveListeners = new Set()
  const liveSession = { getSnapshot: () => liveState, subscribe: fn => { liveListeners.add(fn); return () => liveListeners.delete(fn) } }
  let panelState = { activePanelId: null }
  const sessionListeners = new Set(), panelListeners = new Set()
  const localeListeners = new Set()
  const dictionaries = new Map()
  let activeLocale = 'en'
  const setSessions = value => { sessionList = value; sessionListeners.forEach(fn => fn()) }
  const setPanel = id => { panelState = { activePanelId: id }; panelListeners.forEach(fn => fn()) }
  const registrations = new Map()
  let sidebarEntries = []
  const sidebarListeners = new Set()
  const Menu = ({ anchor, open, items = [], onSelect, portal, side, getAnchorRect, listClassName, children }) => {
    const list = open && React.createElement('div', { className: listClassName, role: 'menu', 'data-side': side, 'data-anchor-right': getAnchorRect?.()?.right },
      children,
      items.map(item => React.createElement('button', { key: item.id, role: 'menuitem', onClick: () => onSelect(item.id) }, item.icon, item.label)))
    return React.createElement('div', null, anchor, list && (portal ? createPortal(list, document.body) : list))
  }
  const footerSlot = 'sidebar.footer.action'
  const slotCore = new SlotCore()
  slotCore.register({ name: 'root', children: { [footerSlot]: { kind: 'list', scope: 'root' }, main: { kind: 'keyed', scope: 'root' } } }, () => null)
  function SidebarFooter() {
    React.useSyncExternalStore(listener => slotCore.subscribe(footerSlot, listener), () => slotCore.getVersion(footerSlot))
    return React.createElement('footer', null, slotCore.entriesOfSlot(footerSlot).map(entry =>
      React.createElement(entry.component, { key: entry.options.id })))
  }
  window.__ModuleLoader__ = { load({ factory }) {
    plugin = factory(name => {
      if (name === 'react') return React
      if (name === 'react-dom') return { createPortal }
      if (name === '@deepseek-ai/dsh-client-ui-primitives') return {
        Button: ({ variant, size, ...props }) => React.createElement('button', props),
        Modal: ({ children, title, footer, onClose, closeLabel }) => createPortal(React.createElement('div', { role: 'dialog', 'aria-modal': true, 'aria-label': title }, React.createElement('button', { onClick: onClose, 'aria-label': closeLabel }, closeLabel), children, footer), document.body),
        IconUsersOutlineRegular: () => null, IconChevronLeftOutlineRegular: () => null,
        Menu, IconPanelLeftOutlineRegular: () => React.createElement('svg'),
        IconNewChatOutlineRegular: () => React.createElement('svg'), IconSearchOutlineRegular: () => React.createElement('svg'),
        MenuItemButton: ({ children, onSelect }) => React.createElement('button', { role: 'menuitem', onClick: onSelect }, children)
      }
      throw new Error(name)
    })
  } }
  const source = await readFile(process.env.DSH_TEST_HOST_DIALOG_CLIENT_SOURCE || 'packages/dsh-desktop-client-ui/client.js', 'utf8')
  const client = source.replace("import('/desktop-workspace/workspace-chrome.js')", 'loadWorkspaceChrome()')
    .replace("import('/desktop-workspace/chat-controls.js')", 'loadChatControls()')
  new Function('loadWorkspaceChrome', 'loadChatControls', client)(
    async () => workspaceChrome,
    async () => navigationOptions.chatControls ?? null
  )
  const uiWorkspaceStart = navigationOptions.startSession ?? (() => {
    if (navigate('new')) return
    setSessions({ phase: 'ready', byId: { draft: { id: 'draft', blank: true, retainedBy: { mainView: 1 } } } })
    setPanel(null)
  })
  plugin.apply({
    theme: { getTheme: () => ({ active: { colorScheme: 'light' } }) },
    on: () => () => {},
    get: name => name === 'workspaces' ? { list: { getSnapshot: () => ({ items: navigationOptions.folders ?? [{ workspaceId: 'work', sessionIds: ['draft'] }] }) } } : name === 'conversation' ? { input: { requestDraftInitialization: navigationOptions.initializeDraft } } : name === 'shortcuts' ? { catalog: { getSnapshot: () => [{ id: 'sidebar.left.toggle', binding: { code: 'KeyB', modifiers: ['meta'] } }] } } : undefined,
    inject(names, callback) {
      if (names.includes('desktopWorkbenches')) {
        bindWorkbench = callback
        if (workbenchSnapshot) attachWorkbench()
      }
    },
    uiWorkspace: { openWorkspace: navigationOptions.openWorkspace, openSession: navigationOptions.openSession, registerNavigationHandler: (fn) => { navigate = fn; return () => {} }, startSession: uiWorkspaceStart },
    sessions: { binding: id => id === 'draft' ? { session: liveSession } : undefined, list: { getSnapshot: () => sessionList, subscribe: fn => { sessionListeners.add(fn); return () => sessionListeners.delete(fn) } } },
    layout: { selectPanel: setPanel, panelInfo: { getSnapshot: () => panelState, subscribe: fn => { panelListeners.add(fn); return () => panelListeners.delete(fn) } } },
    remote: {}, locale: { register: (ns, copy) => dictionaries.set(ns, copy), bind: ns => key => key.startsWith('hostedApp') || key.startsWith('navigation') || key === 'reorderNavigation' || key === 'multiAgentCollaboration' ? dictionaries.get(ns)?.[activeLocale]?.[key] : key, getSnapshot: () => ({ active: activeLocale }), subscribe: fn => { localeListeners.add(fn); return () => localeListeners.delete(fn) } },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose) },
    slots: {
      inject(name, fn) { if ([footerSlot, 'shell.overlay', 'desktop.mode.content', 'sidebar.content', 'sidebar.workspaces.collection', 'sidebar.primaryNavigation', 'conversation.session.header.toolbar'].includes(name)) return fn() },
      register(options, component) {
        if (options.name === footerSlot) return slotCore.register(options, component)
        if (options.name === 'shell.overlay' && !['desktop-bot-sidebar-back', 'desktop-workspace-chrome'].includes(options.id)) return
        registrations.set(options.name === 'shell.overlay' ? options.id : options.name, { component, props: options.inject?.() })
      },
      entries: name => name === 'sidebar.workspaces' ? sidebarEntries : slotCore.entries(name),
      entriesOfSlot: name => name === 'sidebar.workspaces' ? sidebarEntries : slotCore.entriesOfSlot(name),
      subscribe(name, listener) {
        if (name !== 'sidebar.workspaces') return slotCore.subscribe(name, listener)
        sidebarListeners.add(listener)
        return () => sidebarListeners.delete(listener)
      }
    }
  })
  if (navigationOptions.workspaceRoutes && !navigationOptions.renderWorkspace) {
    const { navigation } = registrations.get('desktop.mode.content').props
    disposers.push(navigation.start())
    return {
      navigation,
      registerPanel: key => slotCore.register({ name: 'main', key }, () => null),
      async registerBot(mode) {
        const listeners = new Set()
        const surface = {
          getSnapshot: () => ({ mode }),
          subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) }
        }
        const setSurface = vi.fn(next => {
          if (mode === next) return
          mode = next
          listeners.forEach(listener => listener())
        })
        const unregister = slotCore.register({ name: footerSlot, id: 'bot-return', inject: () => ({ hooks: { surface }, actions: { setSurface } }) }, () => null)
        // SlotCore coalesces registration changes into one microtask.
        await Promise.resolve()
        return { setSurface, remove: async () => { unregister(); await Promise.resolve() }, surface }
      },
      selectPanel: setPanel
    }
  }
  container = document.createElement('div')
  container.id = 'root'
  // jsdom reflects the host interaction boundary through this browser property.
  Object.defineProperty(container, 'inert', { get() { return this.hasAttribute('inert') }, set(value) { this.toggleAttribute('inert', value) } })
  container.inert = inert
  document.body.append(container)
  root = createRoot(container)
  const content = registrations.get('desktop.mode.content'), history = registrations.get('sidebar.workspaces.collection'), primary = registrations.get('sidebar.primaryNavigation')
  const sidebar = registrations.get('sidebar.content')
  const botBack = registrations.get('desktop-bot-sidebar-back')
  const chrome = registrations.get('desktop-workspace-chrome')
  const sessionToolbar = registrations.get('conversation.session.header.toolbar')
  const workspaces = () => React.createElement(history.component, {
    ...history.props, mode: 'projects', query: '', archivedOnly: false,
    projects: () => React.createElement('div', { 'data-project': true }, 'Project task'),
    items: [{ id: 'local-a', updatedAt: Date.parse('2026-10-17'), render: active => React.createElement('button', {
      'data-local-row': true, 'aria-current': active ? 'page' : undefined, onClick: () => navigate('open')
    }, 'Local task') }], ...collection
  })
  await act(async () => root.render(React.createElement(React.Fragment, null,
    botBack && React.createElement(botBack.component, { ...botBack.props, t: key => dictionaries.get('desktop.chatWork')[activeLocale][key] }),
    chrome && React.createElement(chrome.component, chrome.props),
    React.createElement('aside', { className: navigationOptions.wide === false ? 'pI_x6G_sidebarCol' : undefined, 'data-dsh-sidebar-root': navigationOptions.wide === false ? '' : undefined },
      React.createElement(sidebar.component, {
        ...sidebar.props,
        renderContent: children => children,
        renderNewSession: render => render ? render({
          label: 'New session', ariaLabel: 'Start a new session', shortcut: 'Meta+N', shortcutKeys: ['⌘', 'N'], onClick: uiWorkspaceStart
        }) : React.createElement('button', { 'data-new-session': '', onClick: () => uiWorkspaceStart() }, 'New session'),
        renderWorkspaces: workspaces,
        renderSettings: () => React.createElement('button', null, 'Account'),
        defaultContent: React.createElement(React.Fragment, null,
          React.createElement('button', { 'data-navigation-id': 'new', onClick: () => navigate('new') }, 'New session'),
          React.createElement(primary.component, { ...primary.props, wide: navigationOptions.wide ?? true, expandSidebar: navigationOptions.expandSidebar, renderAction: ({ id, label, onClick, expanded, active }) => React.createElement('button', { 'data-navigation-id': id, 'aria-expanded': expanded, 'aria-current': active ? 'page' : undefined, 'aria-label': label, onClick }, label), panels: [{ id: 'plugins', label: 'Plugins' }, ...(navigationOptions.panels || [])], startSession: (...args) => { expect(args).toHaveLength(0); navigate('new') }, selectPanel: setPanel, renderPanelIcon: () => null }),
          workspaces(), React.createElement(SidebarFooter))
      })),
    React.createElement(content.component, { ...content.props, rightbarWidth: 420, work: React.createElement(React.Fragment, null,
      navigationOptions.sessionToolbar && React.createElement(sessionToolbar.component, { row: React.createElement('button', { onClick: navigationOptions.sessionToolbar }, 'Session action') }),
      React.createElement('textarea', { 'aria-label': 'work draft', defaultValue: 'retained draft' })) })
  )))
  return {
    async sidebarEntry(face) {
      await act(async () => {
        sidebarEntries = face ? [{ inject: () => face }] : []
        sidebarListeners.forEach(listener => listener())
      })
    },
    async footerAction(options, component) {
      let dispose
      await act(async () => { dispose = slotCore.register({ name: footerSlot, ...options }, component) })
      return () => act(async () => dispose())
    },
    async resize(element) {
      await act(async () => {
        for (const observer of [...resizeObservers]) {
          if (observer.targets.has(element)) observer.callback([{ target: element, contentRect: element.getBoundingClientRect() }], observer)
        }
      })
    },
    async workbench(active, enabled = true) {
      await act(async () => {
        workbenchSnapshot = { state: { active }, enabled }
        if (disposeWorkbench) workbenchListeners.forEach(fn => fn())
        else attachWorkbench()
      })
    },
    async unloadWorkbench() { await act(async () => { disposeWorkbench(); disposeWorkbench = undefined }) },
    workbenchListenerCount: () => workbenchListeners.size,
    async locale(value) { await act(async () => { activeLocale = value; localeListeners.forEach(fn => fn()) }) },
    localeListenerCount: () => localeListeners.size,
    async navigation(entries, path = '/skills') { snapshot = { ...snapshot, navigation: { entries, homeLabel: 'Welcome' }, path, conversationId: undefined }; await act(async () => chatListener(snapshot)) },
    navigate: (...args) => navigate(...args),
    controller: registrations.get('desktop.mode.content')?.props.navigation,
    async click(mode) { await act(async () => container.querySelector(`#dsh-mode-${mode}`).click()) },
    async account(next, epoch = 1) {
      snapshot = { connected: next, phase: 'ready', epoch, conversationId: 'new', settingsProtocolVersion: 1 }
      await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:enterprise-account-changed')))
    },
    async pushState(patch) { snapshot = { ...snapshot, ...patch }; await act(async () => chatListener(snapshot)) },
    selected: () => container.querySelector('#dsh-panel-chat').hidden ? 'work' : 'chat',
    picker: () => container.querySelector('[role=tablist]'),
    async panel(id) { await act(async () => setPanel(id)) },
    async workSession(blank) { await act(async () => setSessions({ phase: 'ready', byId: { current: { id: 'current', blank, retainedBy: { mainView: 1 } } } })) },
    async cloudSession(id) { snapshot = { ...snapshot, conversationId: id }; await act(async () => window.dispatchEvent(new Event('focus'))) },
    async workLive(patch) { await act(async () => { liveState = { ...liveState, ...patch }; liveListeners.forEach(fn => fn()) }) },
    liveListenerCount: () => liveListeners.size,
    async cloudLanding(landing) { snapshot = { ...snapshot, landing }; await act(async () => chatListener(snapshot)) },
    async chatState(patch) { snapshot = { ...snapshot, ...patch }; await act(async () => chatListener(snapshot)) },
    draft: () => container.querySelector('textarea')
  }
}
const mountWorkspaceRoutes = (connected = false) => mount(connected, {}, false, undefined, false, { workspaceRoutes: true })

it('routes the plugin entry to the existing plugins main panel', async () => {
  const { navigation, registerPanel } = await mountWorkspaceRoutes()
  registerPanel('plugins')
  await Promise.resolve()
  navigation.navigate('/plugins')
  expect(navigation.snapshot().workspacePath).toBe('/plugins')
  expect(navigation.snapshot().workspaceNative).toBe(true)
  expect(navigation.snapshot().activePanelId).toBe('plugins')
  navigation.navigate('/')
  expect(navigation.snapshot().workspacePath).toBe('/')
  expect(navigation.snapshot().workspaceNative).toBe(false)
})

it('places the AI Chat switch in the toolbar and keeps login gating and the original sidebar lists', async () => {
  const view = await mount(false, {}, false, undefined, false, { workspaceRoutes: true, renderWorkspace: true })
  expect(container.querySelector('.dshWorkspaceModePicker')).toBeNull()
  await act(async () => view.controller.navigate('/chat'))
  expect(view.selected()).toBe('work')
  expect(container.querySelectorAll('.dshWorkspaceToolbar .dshWorkspaceModePicker button')).toHaveLength(2)
  expect(container.querySelector('.dshModesHeader')).toBeNull()
  const newSession = container.querySelector('.dshChatSidebarNew button')
  expect(newSession.textContent).toBe('New session')
  expect(container.querySelector('.dshChatSidebarNew').nextElementSibling.className).toBe('dshChatWorkspaceList')
  await act(async () => container.querySelector('[data-workspace-sidebar-toggle]').click())
  expect(container.querySelector('.dshWorkspaceToolbar .dshWorkspaceModePicker')).not.toBeNull()
  expect(container.querySelector('.dshChatWorkspaceList [data-project]')).not.toBeNull()
  expect(container.querySelector('.dshChatWorkspaceList [data-local-row]')).not.toBeNull()
  expect(container.querySelector('.dshChatWorkspaceList .dshRecentHistory')).toBeNull()
  expect(container.querySelector('aside [data-navigation-id]')).toBeNull()
  expect(container.querySelector('aside').textContent).not.toContain('Account')
  expect(container.querySelector('aside [data-workspace-account-slot]')).toBeNull()
  expect(container.querySelector('.dshWorkHistoryDock')).toBeNull()
  const draft = view.draft()
  await view.click('chat')
  expect(document.querySelector('[aria-modal=true]')).not.toBeNull()
  expect(view.selected()).toBe('work')
  await view.account(true)
  expect(view.selected()).toBe('chat')
  expect(view.controller.snapshot().workspacePath).toBe('/chat')
  expect(container.querySelector('.dshChatWorkspaceList .dshRecentHistory').textContent).toContain('Cloud chat')
  await act(async () => newSession.click())
  expect(window.dshEnterpriseChat.open).toHaveBeenLastCalledWith('new')
  expect(container.querySelector('.dshRecentHistory [data-local-row]')).toBeNull()
  await view.click('work')
  expect(view.draft()).toBe(draft)
  await act(async () => view.controller.open('cloud-a'))
  expect(window.dshEnterpriseChat.open).toHaveBeenLastCalledWith('cloud-a')
  expect(view.selected()).toBe('chat')
  expect(container.querySelector('.dshWorkspaceModePicker')).toBeNull()
  await act(async () => container.querySelector('[data-local-row]').click())
  expect(view.selected()).toBe('work')
  await view.click('chat')
  await view.account(false, 2)
  expect(view.selected()).toBe('work')
  expect(view.controller.snapshot().workspacePath).toBe('/chat')
  expect(container.querySelector('.dshChatWorkspaceList .dshRecentHistory')).toBeNull()
})

it('moves the session actions into the Work toolbar and restores them when leaving', async () => {
  const action = vi.fn()
  const view = await mount(false, {}, false, undefined, false, { workspaceRoutes: true, renderWorkspace: true, sessionToolbar: action })
  const inlineAction = () => container.querySelector('#dsh-panel-work button')
  expect(inlineAction()?.textContent).toBe('Session action')
  await act(async () => view.controller.navigate('/chat'))
  const portalled = container.querySelector('[data-workspace-session-toolbar] button')
  expect(portalled?.textContent).toBe('Session action')
  expect(portalled.closest('.dshWorkspaceToolbarEnd').firstElementChild).toBe(portalled.parentElement)
  expect(inlineAction()).toBeNull()
  await act(async () => portalled.click())
  expect(action).toHaveBeenCalledOnce()
  await act(async () => view.controller.navigate('/'))
  expect(container.querySelector('[data-workspace-session-toolbar]')).toBeNull()
  expect(inlineAction()?.textContent).toBe('Session action')
})

it('passes the native new session action and shortcut to the Board UI sidebar button', async () => {
  const startSession = vi.fn()
  const ChatNewSession = vi.fn(({ label, ariaLabel, shortcut, onClick }) =>
    React.createElement('button', { 'aria-label': ariaLabel, 'aria-keyshortcuts': shortcut, onClick }, label))
  const view = await mount(false, {}, false, undefined, false, {
    workspaceRoutes: true, renderWorkspace: true, startSession, chatControls: { ChatNewSession, ChatSegment: () => null }
  })
  await act(async () => view.controller.navigate('/chat'))
  const button = container.querySelector('.dshChatSidebarNew button')
  expect(button.textContent).toBe('New session')
  expect(button.getAttribute('aria-label')).toBe('Start a new session')
  expect(button.getAttribute('aria-keyshortcuts')).toBe('Meta+N')
  expect(ChatNewSession.mock.lastCall[0].shortcutKeys).toEqual(['⌘', 'N'])
  startSession.mockClear()
  await act(async () => button.click())
  expect(startSession).toHaveBeenCalledTimes(1)
})

it('shows toolbar mode selection only for blank conversations on the AI Chat route', async () => {
  const view = await mount(true, {}, false, undefined, false, { workspaceRoutes: true, renderWorkspace: true })
  const picker = () => container.querySelector('.dshWorkspaceToolbar .dshWorkspaceModePicker')
  await act(async () => view.controller.navigate('/chat'))
  expect(picker()).not.toBeNull()
  await view.workLive({ pendingSubmissions: [{ requestId: 'sending' }] })
  expect(picker()).toBeNull()
  await view.workLive({ pendingSubmissions: [], blank: false })
  expect(picker()).toBeNull()
  await act(async () => container.querySelector('.dshChatSidebarNew button').click())
  await view.workLive({ blank: true })
  expect(picker()).not.toBeNull()
  await view.click('chat')
  expect(picker()).not.toBeNull()
  await view.cloudLanding(false)
  expect(picker()).toBeNull()
  await view.cloudLanding(true)
  expect(picker()).not.toBeNull()
})

it('sends the workspace card color to enterprise Chat and keeps the regular palette for settings', async () => {
  const computedStyle = globalThis.getComputedStyle
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(element => {
    const token = /^var\((--[\w-]+), rgb\(1, 2, 3\)\)$/.exec(element.style?.color)?.[1]
    if (!token) return computedStyle(element)
    const dark = document.body.hasAttribute('data-ds-dark-theme')
    return { color: token === '--dsh-workspace-card-surface'
      ? (dark ? 'rgb(53, 54, 56)' : 'rgb(245, 246, 247)')
      : (dark ? 'rgb(44, 44, 46)' : 'rgb(255, 255, 255)') }
  })
  const view = await mount(true, {}, false, undefined, false, { workspaceRoutes: true, renderWorkspace: true })
  const present = window.dshEnterpriseChat.present
  await act(async () => view.controller.navigate('/chat'))
  await view.click('chat')
  expect(present.mock.lastCall[0]).toMatchObject({ workspaceCard: true, palette: { surface: [245, 246, 247] } })
  await act(async () => document.body.setAttribute('data-ds-dark-theme', ''))
  expect(present.mock.lastCall[0]).toMatchObject({ theme: 'dark', palette: { surface: [53, 54, 56] } })
  await act(async () => {
    window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: true } }))
    window.dispatchEvent(new CustomEvent('dsh-desktop:settings-surface', { detail: { section: 'tools', bounds: { x: 200, y: 80, width: 500, height: 400 } } }))
  })
  expect(present.mock.lastCall[0]).toMatchObject({ settings: 'tools', palette: { surface: [44, 44, 46] } })
  expect(present.mock.lastCall[0]).not.toHaveProperty('workspaceCard')
})

it('routes registered workspace panels and their previews through the host selection', async () => {
  const { navigation, registerPanel, selectPanel } = await mountWorkspaceRoutes()
  for (const [path, panel] of [
    ['/ai-chat', 'code-workbench-layout'],
    ['/ai-image-generation', 'copylee-image-gen.paintings'],
    ['/project-board', 'super-kanban']
  ]) {
    navigation.navigate(path)
    expect(navigation.snapshot()).toMatchObject({ workspacePath: path, workspaceNative: false, activePanelId: null })
    const remove = registerPanel(panel)
    navigation.navigate(path)
    expect(navigation.snapshot()).toMatchObject({ workspacePath: path, workspaceNative: true, activePanelId: panel })
    navigation.navigate(path + '?preview=0')
    navigation.goBack()
    expect(navigation.snapshot().workspacePath).toBe('/')
    navigation.navigate(path + '?preview=0')
    expect(navigation.snapshot()).toMatchObject({ workspacePath: path, workspaceNative: true, activePanelId: panel })
    navigation.navigate(path + '?preview=1')
    expect(navigation.snapshot()).toMatchObject({ workspacePath: path + '?preview=1', workspaceNative: false, activePanelId: null })
    selectPanel(panel)
    expect(navigation.snapshot()).toMatchObject({ workspacePath: path, workspaceNative: true, activePanelId: panel })
    selectPanel(null)
    expect(navigation.snapshot()).toMatchObject({ workspacePath: '/', workspaceNative: false, activePanelId: null })
    remove()
  }
})

it('keeps workspace routes until the user explicitly enters the Bot and releases it on exit or unload', async () => {
  const { navigation, registerBot } = await mountWorkspaceRoutes()
  const initial = await registerBot('bot')
  expect(initial.setSurface).toHaveBeenCalledWith('agent')
  expect(navigation.snapshot().workspacePath).toBe('/')
  await initial.remove()
  navigation.navigate('/multi-agent-chat?preview=1')
  const reloaded = await registerBot('bot')
  expect(navigation.snapshot()).toMatchObject({ workspacePath: '/multi-agent-chat?preview=1', workspaceNative: false })
  expect(reloaded.surface.getSnapshot().mode).toBe('agent')
  navigation.navigate('/multi-agent-chat')
  expect(reloaded.surface.getSnapshot().mode).toBe('bot')
  expect(navigation.snapshot()).toMatchObject({ workspacePath: '/multi-agent-chat', workspaceNative: true })
  navigation.navigate('/multi-agent-chat?preview=1')
  expect(reloaded.surface.getSnapshot().mode).toBe('agent')
  expect(navigation.snapshot()).toMatchObject({ workspacePath: '/multi-agent-chat?preview=1', workspaceNative: false })
  reloaded.setSurface('bot')
  reloaded.setSurface('agent')
  expect(navigation.snapshot()).toMatchObject({ workspacePath: '/', workspaceNative: false })
  navigation.navigate('/multi-agent-chat')
  await reloaded.remove()
  expect(navigation.snapshot()).toMatchObject({ workspacePath: '/multi-agent-chat', workspaceNative: false })
})

it('switches exclusively between workspace panels and the Bot for external host actions', async () => {
  const { navigation, registerBot, registerPanel, selectPanel } = await mountWorkspaceRoutes()
  registerPanel('code-workbench-layout')
  const bot = await registerBot('agent')
  selectPanel('code-workbench-layout')
  bot.setSurface('bot')
  expect(navigation.snapshot()).toMatchObject({ workspacePath: '/multi-agent-chat', workspaceNative: true, activePanelId: null })
  selectPanel('code-workbench-layout')
  expect(bot.surface.getSnapshot().mode).toBe('agent')
  expect(navigation.snapshot()).toMatchObject({ workspacePath: '/ai-chat', workspaceNative: true, activePanelId: 'code-workbench-layout' })
  navigation.openDesktop()
  expect(navigation.snapshot()).toMatchObject({ workspacePath: undefined, workspaceNative: false, activePanelId: null })
  navigation.navigate('/multi-agent-chat')
  navigation.openDesktop()
  expect(bot.surface.getSnapshot().mode).toBe('agent')
  expect(navigation.snapshot()).toMatchObject({ workspacePath: undefined, workspaceNative: false, activePanelId: null })
})

it('keeps a newly selected workspace panel when an earlier workbench exit rejects', async () => {
  const { navigation, registerPanel, selectPanel } = await mountWorkspaceRoutes()
  registerPanel('super-kanban')
  const leaving = Promise.withResolvers()
  const workbench = {
    getSnapshot: () => ({ enabled: true, state: { active: 'writer' } }),
    subscribe: () => () => {},
    leave: vi.fn(() => leaving.promise),
    run: vi.fn(report => report.catch(() => {}))
  }
  disposers.push(navigation.bindWorkbench(workbench))
  navigation.navigate('/chat')
  expect(workbench.leave).toHaveBeenCalledOnce()
  selectPanel('super-kanban')
  leaving.reject(new Error('workbench save failed'))
  await Promise.resolve()
  expect(navigation.snapshot()).toMatchObject({ workspacePath: '/project-board', workspaceNative: true, activePanelId: 'super-kanban' })
  expect(workbench.run).not.toHaveBeenCalled()
})

it('starts a template draft after the chat navigation and ignores a superseded workbench exit', async () => {
  const initializeDraft = vi.fn(() => 'applied')
  const openWorkspace = vi.fn(async (_workspace, prepare) => prepare('draft'))
  const { navigation } = await mount(false, {}, false, undefined, false, { workspaceRoutes: true, openWorkspace, initializeDraft })
  const leaving = Promise.withResolvers()
  const workbench = {
    getSnapshot: () => ({ enabled: true, state: { active: 'writer' } }),
    subscribe: () => () => {},
    leave: () => leaving.promise,
    run: vi.fn()
  }
  const unbind = navigation.bindWorkbench(workbench)
  try {
    const abandoned = navigation.host.openCapability('code', { prompt: 'old draft' })
    navigation.navigate('/settings')
    const current = navigation.host.openCapability('code', { prompt: 'current draft' })
    expect(openWorkspace).not.toHaveBeenCalled()
    initializeDraft.mockImplementation(() => {
      expect(navigation.snapshot().workspacePath).toBe('/chat')
      return 'applied'
    })
    leaving.resolve()
    await Promise.all([abandoned, current])
    expect(initializeDraft.mock.calls.map(([, options]) => options)).toEqual([{ prompt: 'current draft' }])
  } finally { unbind() }
})

it('restores the template form when the native workspace reuses an occupied blank from another conversation', async () => {
  const native = { text: 'an unsent note', attachments: ['file-1'] }
  const initializeDraft = vi.fn((_binding, { prompt }) => {
    if (native.text || native.attachments.length) return 'preserved'
    native.text = prompt
    return 'applied'
  })
  const openWorkspace = vi.fn(async (workspace, prepare) => {
    expect(workspace).toBe('active')
    prepare('draft')
  })
  const openSession = vi.fn()
  const ui = await mount(false, {}, false, undefined, false, { workspaceRoutes: true, openWorkspace, openSession, initializeDraft,
    sessionList: { phase: 'ready', byId: { current: { id: 'current', blank: false, retainedBy: { mainView: 1 } } } },
    folders: [{ workspaceId: 'other', sessionIds: [] }, { workspaceId: 'active', sessionIds: ['current', 'draft'] }] })
  const navigation = ui.navigation
  navigation.navigate('/ai-chat?preview=1')
  navigation.host.setTaskDraft('code', ' new template task ')
  await navigation.host.openCapability('code', { prompt: 'new template task' })
  expect(navigation.snapshot().workspacePath).toBe('/ai-chat?preview=1')
  expect(navigation.host.getTaskDraft('code')).toEqual({ prompt: ' new template task ', error: 'taskDraftConflict', sessionId: 'draft' })
  expect(native).toEqual({ text: 'an unsent note', attachments: ['file-1'] })
  navigation.goBack()
  expect(navigation.snapshot().workspacePath).toBe('/')
  await navigation.host.openTask('draft')
  expect(openSession).toHaveBeenCalledWith('draft')
  navigation.navigate('/ai-chat?preview=1')
  expect(navigation.host.getTaskDraft('code').prompt).toBe(' new template task ')
  native.text = ''
  await navigation.host.openCapability('code', { prompt: 'new template task' })
  expect(navigation.snapshot().workspacePath).toBe('/ai-chat?preview=1')
  native.attachments = []
  await navigation.host.openCapability('code', { prompt: 'new template task' })
  expect(native.text).toBe('new template task')
  expect(navigation.host.getTaskDraft('code')).toBeUndefined()
  expect(navigation.snapshot().workspacePath).toBe('/chat')
})

it('keeps the workspace home on enterprise startup and releases the Bot for explicit enterprise Chat', async () => {
  const { navigation, registerBot } = await mountWorkspaceRoutes(true)
  expect(navigation.snapshot()).toMatchObject({ connected: true, workspacePath: '/', mode: 'work' })
  const bot = await registerBot('agent')
  navigation.navigate('/multi-agent-chat')
  navigation.select('chat')
  expect(bot.surface.getSnapshot().mode).toBe('agent')
  expect(navigation.snapshot()).toMatchObject({ mode: 'chat', workspacePath: undefined, workspaceNative: false })
})

it('opens the desktop workspace directly from Settings and retains its enterprise chat entrance', async () => {
  const { navigation } = await mountWorkspaceRoutes()
  navigation.navigate('/settings')
  expect(navigation.snapshot().workspacePath).toBe('/settings')
  navigation.host.openCapability('desktop')
  expect(navigation.snapshot()).toMatchObject({ mode: 'work', workspacePath: undefined, workspaceNative: false })
  navigation.select('chat')
  expect(navigation.snapshot().signInPromptOpen).toBe(true)
})

it('shows mode selection on the native landing page and restores it after leaving a workbench', async () => {
  const ui = await mount()
  const draft = ui.draft()
  expect(ui.picker()).not.toBeNull()
  await ui.workbench('writer')
  expect(container.querySelector('.dshModesHeader')).toBeNull()
  await ui.workSession(false)
  await ui.workSession(true)
  expect(ui.picker()).toBeNull()
  await ui.workbench('research')
  expect(ui.picker()).toBeNull()
  await ui.workbench(null)
  expect(ui.picker()).not.toBeNull()
  expect(ui.draft()).toBe(draft)
  expect(draft.value).toBe('retained draft')
})

it('respects a restored workbench, the feature switch and optional service unload/reload', async () => {
  const ui = await mount(false, {}, false, { enabled: true, state: { active: 'writer' } })
  expect(ui.picker()).toBeNull()
  await ui.workbench('writer', false)
  expect(ui.picker()).not.toBeNull()
  await ui.workbench('writer')
  expect(ui.picker()).toBeNull()
  expect(ui.workbenchListenerCount()).toBe(1)
  await ui.unloadWorkbench()
  expect(ui.picker()).not.toBeNull()
  expect(ui.workbenchListenerCount()).toBe(0)
  await ui.workbench('writer')
  expect(ui.picker()).toBeNull()
  expect(ui.workbenchListenerCount()).toBe(1)
})

it('keeps Chat landing navigation available while a workbench is retained in Work', async () => {
  const ui = await mount(true, {}, false, { enabled: true, state: { active: 'writer' } })
  expect(ui.selected()).toBe('chat')
  expect(ui.picker()).not.toBeNull()
  await ui.click('work')
  expect(ui.selected()).toBe('work')
  expect(ui.picker()).toBeNull()
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
})

it('explains Chat sign-in before opening account settings while keeping the Work draft mounted', async () => {
  const ui = await mount(false, { items: [] })
  expect(ui.selected()).toBe('work')
  const history = container.querySelector('.dshRecentHistory')
  expect(history.textContent).toBe('recentrecentEmpty')
  expect(history.querySelectorAll('button')).toHaveLength(0)
  const draft = ui.draft()
  const open = vi.fn()
  window.addEventListener('dsh-desktop:open-settings-section', open)
  disposers.push(() => window.removeEventListener('dsh-desktop:open-settings-section', open))
  await ui.click('chat')
  expect(open).toHaveBeenCalledTimes(0)
  const dialog = document.querySelector('[role=dialog]')
  expect(dialog.getAttribute('aria-label')).toBe('signInTitle')
  expect(dialog.textContent).toContain('signInDescription')
  await act(async () => [...dialog.querySelectorAll('button')].find(button => button.textContent === 'signIn').click())
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(open.mock.calls[0][0].detail).toEqual({ id: 'enterprise-account' })
  expect(ui.selected()).toBe('work')
  expect(ui.draft()).toBe(draft)
  expect(container.querySelector('#dsh-panel-chat').hidden).toBe(true)
  expect(container.querySelector('#dsh-panel-chat button')).toBeNull()
})
it('opens Chat after enterprise sign-in, respects Work selection on refresh, and returns to Work after logout', async () => {
  const ui = await mount()
  const draft = ui.draft()
  await ui.account(true)
  expect(ui.selected()).toBe('chat')
  await ui.click('work')
  await ui.account(true)
  expect(ui.selected()).toBe('work')
  await ui.click('chat')
  await ui.account(false)
  expect(ui.selected()).toBe('work')
  expect(ui.draft()).toBe(draft)
  expect(draft.value).toBe('retained draft')
})
it('restores the existing enterprise login directly into Chat', async () => {
  const ui = await mount(true)
  expect(ui.selected()).toBe('chat')
  expect(window.dshEnterpriseChat.present).toHaveBeenCalledWith(expect.objectContaining({ visible: true }))
})

it('delivers the active Harness language while settings hides Chat and cleans up its subscription', async () => {
  const ui = await mount(true)
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ locale: 'en' }))
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: true } })))
  await ui.locale('zh')
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false, locale: 'zh' }))
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: false } })))
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, locale: 'zh' }))
  expect(ui.localeListenerCount()).toBe(1)
  await act(async () => root.unmount())
  root = undefined
  expect(ui.localeListenerCount()).toBe(0)
  const calls = window.dshEnterpriseChat.present.mock.calls.length
  await ui.locale('en')
  expect(window.dshEnterpriseChat.present).toHaveBeenCalledTimes(calls)
})

it('hides Chat while a sidebar account dialog is open and restores it afterwards', async () => {
  await mount(true)
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:account-dialog-visibility', { detail: { open: true } })))
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:account-dialog-visibility', { detail: { open: false } })))
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
})

it('keeps one shared history across modes and routes records to their owner', async () => {
  const ui = await mount(true)
  const sidebar = container.querySelector('aside')
  expect(sidebar.textContent).toContain('Cloud chat')
  expect(sidebar.textContent).toContain('Local task')
  await act(async () => container.querySelector('[data-local-row]').click())
  expect(ui.selected()).toBe('work')
  expect(container.querySelector('aside')).toBe(sidebar)
  await act(async () => container.querySelector('.dshHistoryRow').click())
  expect(ui.selected()).toBe('chat')
  expect(window.dshEnterpriseChat.open).toHaveBeenLastCalledWith('cloud-a')
  expect(container.querySelector('aside')).toBe(sidebar)
  await ui.account(false)
  expect(sidebar.textContent).not.toContain('Cloud chat')
  expect(sidebar.textContent).toContain('Local task')
  expect([...sidebar.querySelectorAll('.dshRecentHistory button')].map(button => button.textContent)).toEqual(['Local task'])
})
it('creates cloud chats through the shared New Session action and clears the view for settings', async () => {
  const ui = await mount(true)
  let handled
  await act(async () => { handled = ui.navigate('new') })
  expect(handled).toBe(true)
  expect(window.dshEnterpriseChat.open).toHaveBeenCalledWith('new')
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: true } })))
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: false } })))
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  await ui.click('work')
  await act(async () => { handled = ui.navigate('new') })
  expect(handled).toBeUndefined()
})

it('interleaves recent cloud and unassigned local rows while projects appear once', async () => {
  const ui = await mount(true)
  const rows = [...container.querySelectorAll('[data-history-kind]')]
  expect(rows.map(row => row.dataset.historyKind)).toEqual(['work', 'chat'])
  expect(container.querySelectorAll('[data-project]')).toHaveLength(1)
  expect(container.querySelector('.dshRecentHistory').textContent).not.toContain('Project task')
  expect(container.querySelector('[data-local-row]').getAttribute('aria-current')).toBeNull()
  await act(async () => container.querySelector('[data-local-row]').click())
  expect(container.querySelector('[data-local-row]').getAttribute('aria-current')).toBe('page')
  expect(ui.selected()).toBe('work')
})

it('searches cloud titles with local results and keeps archived-only views local', async () => {
  await mount(true, { mode: 'search', query: 'missing phrase', projects: () => null, items: [] })
  expect(container.querySelectorAll('[data-history-kind]')).toHaveLength(0)
  expect(container.textContent).toContain('recentSearchEmpty')
})
it('includes cloud search matches in the shared search collection', async () => {
  await mount(true, { mode: 'search', query: 'CLOUD', projects: () => null, items: [] })
  expect(container.querySelectorAll('[data-history-kind=chat]')).toHaveLength(1)
})
it('preserves archive filtering when cloud history has no archive metadata', async () => {
  await mount(true, { archivedOnly: true })
  expect(container.querySelectorAll('[data-history-kind=chat]')).toHaveLength(0)
  expect(container.querySelectorAll('[data-history-kind=work]')).toHaveLength(1)
})

it('switches modes without a transient light zero-sized presentation', async () => {
  const ui = await mount(true)
  window.dshEnterpriseChat.present.mockClear()
  await ui.click('work')
  expect(window.dshEnterpriseChat.present).toHaveBeenCalledTimes(1)
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  window.dshEnterpriseChat.present.mockClear()
  await ui.click('chat')
  expect(window.dshEnterpriseChat.present).toHaveBeenCalledTimes(1)
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  expect(window.dshEnterpriseChat.open).not.toHaveBeenCalled()
})

it('removes the shared host card only while the enterprise workspace is docked in Chat', async () => {
  const ui = await mount(true)
  const modes = container.querySelector('.dshModes')
  expect(modes.hasAttribute('data-dsh-workspace-dock')).toBe(false)
  await ui.pushState({ workspaceDockOpen: true })
  expect(modes.hasAttribute('data-dsh-workspace-dock')).toBe(true)
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ radius: 0 }))
  await ui.click('work')
  expect(modes.hasAttribute('data-dsh-workspace-dock')).toBe(false)
  await ui.click('chat')
  expect(modes.hasAttribute('data-dsh-workspace-dock')).toBe(true)
  await ui.pushState({ workspaceDockOpen: false })
  expect(modes.hasAttribute('data-dsh-workspace-dock')).toBe(false)
})

it('keeps Chat and Work clear of the dynamically mounted DS Bot column', async () => {
  let tick = 0
  const frames = new Map()
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++tick, callback); return tick })
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id))
  const advanceFrame = async () => act(async () => {
    for (const [id, callback] of [...frames]) { frames.delete(id); callback() }
  })
  const ui = await mount(true)
  const modes = container.querySelector('.dshModes')
  const chat = container.querySelector('#dsh-panel-chat')
  const inset = () => Number.parseFloat(modes.style.getPropertyValue('--dsh-plugin-rail-inset')) || 0
  modes.getBoundingClientRect = () => ({ left: 24 + inset() })
  chat.getBoundingClientRect = () => ({ x: 25 + inset(), y: 100, right: 1000, height: 500 })
  const rail = document.createElement('div')
  rail.className = 'bt-leftcol'
  let width = 280
  let translate = 0
  const motion = { playState: 'finished' }
  rail.getAnimations = () => [motion]
  rail.getBoundingClientRect = () => ({ width, height: 600, right: 12 + width + translate })
  const check = (expectedInset, x) => {
    expect(inset()).toBe(expectedInset)
    expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({
      visible: true, bounds: { x, y: 100, width: 1000 - x, height: 500 }
    }))
  }
  await act(async () => document.body.append(rail))
  try {
    check(280, 305)
    width = 72
    await ui.resize(rail)
    check(72, 97)
    await ui.click('work')
    expect(inset()).toBe(72)
    expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
    width = 280
    await ui.resize(rail)
    expect(inset()).toBe(280)
    expect(modes.hasAttribute('data-dsh-plugin-rail-inset')).toBe(true)
    motion.playState = 'running'
    rail.dispatchEvent(new Event('transitionrun'))
    translate = -100
    await advanceFrame()
    expect(inset()).toBe(180)
    await ui.click('chat')
    check(180, 205)
    translate = -200
    await advanceFrame()
    check(80, 105)
    translate = -280
    motion.playState = 'finished'
    await advanceFrame()
    check(0, 25)
    expect(modes.hasAttribute('data-dsh-plugin-rail-inset')).toBe(true)
    expect(frames.size).toBe(0)
  } finally {
    await act(async () => rail.remove())
  }
  check(0, 25)
  expect(modes.hasAttribute('data-dsh-plugin-rail-inset')).toBe(false)
})


it('shows the picker only on the Work landing page and releases the header space on panels and active sessions', async () => {
  const ui = await mount()
  expect(ui.picker()).not.toBeNull()
  await ui.panel('plugins')
  expect(ui.picker()).toBeNull()
  expect(container.querySelector('.dshModesHeader')).toBeNull()
  await ui.panel(null)
  expect(ui.picker()).not.toBeNull()
  await ui.workSession(false)
  expect(ui.picker()).toBeNull()
  await ui.workSession(true)
  expect(ui.picker()).not.toBeNull()
})

it('hides the picker after cloud submission or history navigation and restores it for New Session', async () => {
  const ui = await mount(true)
  expect(ui.picker()).not.toBeNull()
  await ui.cloudSession('cloud-created')
  expect(ui.picker()).toBeNull()
  await act(async () => ui.navigate('new'))
  expect(ui.picker()).not.toBeNull()
  await act(async () => container.querySelector('.dshHistoryRow').click())
  expect(ui.picker()).toBeNull()
})

it('chooses a new Work session when the previously selected local session is active', async () => {
  const ui = await mount(true)
  await ui.workSession(false)
  await ui.click('work')
  expect(ui.selected()).toBe('work')
  expect(ui.picker()).not.toBeNull()
})

it('hides Work mode selection on the local submission echo before catalog admission and restores after rejected send', async () => {
  const ui = await mount()
  expect(ui.picker()).not.toBeNull()
  await ui.workLive({ pendingSubmissions: [{ requestId: 'pending' }] })
  expect(ui.picker()).toBeNull()
  await ui.workLive({ pendingSubmissions: [], blank: false, awaitingFirstTurn: true })
  expect(ui.picker()).toBeNull()
  await ui.workLive({ blank: true, awaitingFirstTurn: false })
  expect(ui.picker()).not.toBeNull()
  await ui.workSession(false)
  expect(ui.liveListenerCount()).toBe(0)
})

it('hides Chat mode selection on pushed local state while the URL is still new', async () => {
  const ui = await mount(true)
  expect(ui.picker()).not.toBeNull()
  await ui.cloudLanding(false)
  expect(ui.picker()).toBeNull()
  await ui.cloudLanding(true)
  expect(ui.picker()).not.toBeNull()
})

it('shares account navigation across Chat and Work and keeps Plugins directly accessible alongside More', async () => {
  const ui = await mount(true)
  await ui.navigation([
    { id: 'knowledge', label: 'Knowledge', path: '/knowledge', primary: true, active: false },
    { id: 'skills', label: 'Skills', path: '/skills', primary: false, active: true }
  ])
  expect(ui.picker()).toBeNull()
  const sidebar = container.querySelector('aside')
  expect(sidebar.textContent).not.toContain('Welcome')
  expect(sidebar.querySelector('[data-navigation-id="web:knowledge"]')).not.toBeNull()
  expect(sidebar.querySelector('[data-navigation-id="web:skills"]').getAttribute('aria-current')).toBe('page')
  const openMore = () => act(async () => sidebar.querySelector('[data-navigation-id=more]').click())
  await openMore()
  expect([...sidebar.querySelectorAll('[role=menuitem]')].map(node => node.textContent)).toEqual(['Reorder navigation'])
  expect(sidebar.querySelector('[role=menuitem] svg[aria-hidden=true]')).not.toBeNull()
  await act(async () => sidebar.querySelector('[data-navigation-id="web:knowledge"]').click())
  expect(window.dshEnterpriseChat.openPage).toHaveBeenLastCalledWith('knowledge')
  await act(async () => sidebar.querySelector('[data-navigation-id=plugins]').click())
  expect(sidebar.querySelector('[data-navigation-id=plugins]').getAttribute('aria-current')).toBe('page')
  expect(sidebar.querySelector('[data-navigation-id=more]').getAttribute('aria-current')).toBeNull()
  expect(ui.selected()).toBe('work')
  expect(ui.picker()).toBeNull()
  await act(async () => sidebar.querySelector('[data-navigation-id="web:skills"]').click())
  expect(window.dshEnterpriseChat.openPage).toHaveBeenLastCalledWith('skills')
  expect(ui.selected()).toBe('chat')
  await ui.account(false)
  expect(sidebar.querySelector('[data-navigation-id=plugins]')).not.toBeNull()
  expect(sidebar.querySelector('[data-navigation-id=more]')).toBeNull()
})

it('opens an enterprise module inside the workspace chrome without unmounting the flat menu', async () => {
  const ui = await mount(true)
  await ui.navigation([
    { id: 'knowledge', label: '知识点', path: '/knowledge', primary: true, active: true }
  ], '/knowledge')
  await act(async () => { await ui.controller.openRemoteModule('knowledge') })
  const state = ui.controller.snapshot()
  expect(state.remotePageId).toBe('knowledge')
  expect(state.workspacePath).toBe('/knowledge')
  expect(state.mode).toBe('chat')
  expect(window.dshEnterpriseChat.openPage).toHaveBeenLastCalledWith('knowledge')
  expect(container.querySelector('#dsh-panel-work').hidden).toBe(true)
  expect(container.querySelector('#dsh-panel-chat').hidden).toBe(true)
  expect(container.querySelector('#dsh-panel-remote').dataset.dshRemoteModule).toBe('knowledge')
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))

  await act(async () => { ui.controller.navigate('/') })
  expect(ui.controller.snapshot().remotePageId).toBeUndefined()
  expect(container.querySelector('#dsh-panel-remote')).toBeNull()
  expect(ui.controller.snapshot().workspacePath).toBe('/')
})

it('opens the tools-and-skills module reported as capabilities or legacy skills', async () => {
  const ui = await mount(true)
  await ui.navigation([
    { id: 'capabilities', label: '工具与技能', path: '/capabilities', primary: true, active: true }
  ], '/capabilities')
  await act(async () => { await ui.controller.openRemoteModule('capabilities') })
  expect(ui.controller.snapshot().remotePageId).toBe('capabilities')
  expect(ui.controller.snapshot().workspacePath).toBe('/capabilities')
  expect(window.dshEnterpriseChat.openPage).toHaveBeenLastCalledWith('capabilities')

  await ui.navigation([
    { id: 'skills', label: '工具与技能', path: '/skills', primary: true, active: true }
  ], '/skills')
  await act(async () => { await ui.controller.openRemoteModule('capabilities') })
  expect(ui.controller.snapshot().remotePageId).toBe('skills')
  expect(ui.controller.snapshot().workspacePath).toBe('/skills')
  expect(window.dshEnterpriseChat.openPage).toHaveBeenLastCalledWith('skills')
})

it('removes an embedded enterprise module when the account changes or signs out', async () => {
  const ui = await mount(true)
  await ui.navigation([
    { id: 'knowledge', label: '知识点', path: '/knowledge', primary: true, active: true }
  ], '/knowledge')
  await act(async () => { await ui.controller.openRemoteModule('knowledge') })
  expect(ui.controller.snapshot().remotePageId).toBe('knowledge')

  await ui.navigation([
    { id: 'skills', label: 'Skills', path: '/skills', primary: true, active: true }
  ], '/skills')
  expect(ui.controller.snapshot().remotePageId).toBeUndefined()
  expect(ui.controller.snapshot().workspacePath).toBe('/')

  await act(async () => { await ui.controller.openRemoteModule('skills') })
  expect(ui.controller.snapshot().remotePageId).toBe('skills')
  await ui.account(false)
  expect(ui.controller.snapshot().remotePageId).toBeUndefined()
  expect(ui.controller.snapshot().workspacePath).toBe('/')
})

it('bounds the embedded enterprise view by the workspace content seat', async () => {
  const seat = { x: 240, y: 48, left: 240, top: 48, right: 1240, bottom: 848, width: 1000, height: 800, toJSON: () => ({}) }
  const empty = { x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }
  const original = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () {
    return this.id === 'dsh-panel-remote' ? seat : empty
  }
  try {
    const ui = await mount(true)
    await ui.navigation([
      { id: 'knowledge', label: '知识点', path: '/knowledge', primary: true, active: true }
    ], '/knowledge')
    await act(async () => { await ui.controller.openRemoteModule('knowledge') })
    expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({
      visible: true,
      bounds: expect.objectContaining({ x: 240, y: 48, width: 1000, height: 800 })
    }))
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original
  }
})

const navigationEntries = count => Array.from({ length: count }, (_, index) => ({ id: `page-${index + 1}`, label: `Page ${index + 1}`, active: false }))
const directNavigation = () => [...container.querySelectorAll('nav [data-navigation-id]')].map(node => node.dataset.navigationId)
const orderedNavigation = () => [...document.querySelectorAll('[data-navigation-order-id]')].map(node => node.dataset.navigationOrderId)
async function navigationMenu(label) {
  await act(async () => container.querySelector('[data-navigation-id=more]').click())
  if (label) await act(async () => [...document.querySelectorAll('[role=menuitem]')].find(node => node.textContent === label).click())
}
async function dialogButton(label) {
  await act(async () => [...document.querySelectorAll('[role=dialog] button')].find(node => node.textContent === label).click())
}
async function dragNavigation(from, to) {
  const row = id => document.querySelector(`[data-navigation-order-id="${id}"]`)
  const dataTransfer = { setData: vi.fn() }
  const fire = async (node, type) => act(async () => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
    node.dispatchEvent(event)
  })
  await fire(row(from), 'dragstart')
  await fire(row(to), 'dragover')
  expect(row(to).dataset.dropTarget).toBe('true')
  await fire(row(to), 'drop')
  await fire(row(from), 'dragend')
  expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', from)
}

it('shows five mixed entries directly and highlights More only for an overflow entry', async () => {
  const ui = await mount(true, {}, false, undefined, false, { panels: [{ id: 'files', label: 'Files' }, { id: 'tasks', label: 'Tasks' }] })
  const pages = navigationEntries(4)
  await ui.navigation(pages)
  expect(directNavigation()).toEqual(['plugins', 'web:page-1', 'web:page-2', 'web:page-3', 'web:page-4', 'local:files', 'more'])
  await act(async () => container.querySelector('[data-navigation-id="local:files"]').click())
  expect(ui.selected()).toBe('work')
  expect(container.querySelector('[data-navigation-id="local:files"]').getAttribute('aria-current')).toBe('page')
  expect(container.querySelector('[data-navigation-id=more]').getAttribute('aria-current')).toBeNull()
  await navigationMenu('Tasks')
  expect(container.querySelector('[data-navigation-id=more]').getAttribute('aria-current')).toBe('page')
  await ui.navigation([...pages, { id: 'extra', label: 'Extra', active: true }])
  await act(async () => container.querySelector('[data-navigation-id="web:extra"]').click())
  expect(container.querySelector('[data-navigation-id="web:extra"]').getAttribute('aria-current')).toBe('page')
  expect(container.querySelector('[data-navigation-id=more]').getAttribute('aria-current')).toBeNull()
  await ui.navigation([...pages, { id: 'extra', label: 'Extra' }, { id: 'hidden', label: 'Hidden', active: true }])
  expect(container.querySelector('[data-navigation-id=more]').getAttribute('aria-current')).toBe('page')
  await navigationMenu()
  expect([...container.querySelectorAll('[role=menuitem]')].map(node => node.textContent)).toEqual(['Hidden', 'Files', 'Tasks', 'Reorder navigation'])
  await act(async () => [...container.querySelectorAll('[role=menuitem]')].find(node => node.textContent === 'Hidden').click())
  expect(window.dshEnterpriseChat.openPage).toHaveBeenLastCalledWith('hidden')
})

it('saves drag ordering, promotes a hidden item and restores the order after remount', async () => {
  let ui = await mount(true)
  const pages = navigationEntries(6)
  await ui.navigation(pages)
  await navigationMenu('Reorder navigation')
  await dragNavigation('web:page-6', 'web:page-1')
  expect(orderedNavigation()).toEqual(['web:page-6', 'web:page-1', 'web:page-2', 'web:page-3', 'web:page-4', 'web:page-5'])
  expect(directNavigation()).toContain('web:page-5')
  await dialogButton('Save')
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(directNavigation()).toEqual(['plugins', 'web:page-6', 'web:page-1', 'web:page-2', 'web:page-3', 'web:page-4', 'more'])
  await act(async () => root.unmount())
  container.remove()
  disposers.splice(0).reverse().forEach(dispose => dispose())
  ui = await mount(true)
  await ui.navigation([...pages.slice(1), { id: 'new', label: 'New' }])
  expect(directNavigation()).toEqual(['plugins', 'web:page-6', 'web:page-2', 'web:page-3', 'web:page-4', 'web:page-5', 'more'])
  await navigationMenu()
  expect([...container.querySelectorAll('[role=menuitem]')].map(node => node.textContent)).toEqual(['New', 'Reorder navigation'])
  await ui.account(false, 2)
  expect(directNavigation()).toEqual(['plugins'])
  await ui.account(true, 3)
  await ui.navigation(pages)
  expect(directNavigation()[1]).toBe('web:page-6')
})

it('supports keyboard movement and cancel, and keeps unsaved changes available after a storage failure', async () => {
  const ui = await mount(true)
  await ui.navigation(navigationEntries(2))
  await navigationMenu('Reorder navigation')
  expect(document.querySelector('[aria-label="Move up: Page 1"]').disabled).toBe(true)
  expect(document.querySelector('[aria-label="Move down: Page 2"]').disabled).toBe(true)
  await act(async () => document.querySelector('[aria-label="Move down: Page 1"]').click())
  expect(orderedNavigation()).toEqual(['web:page-2', 'web:page-1'])
  await dialogButton('Cancel')
  expect(directNavigation()).toEqual(['plugins', 'web:page-1', 'web:page-2', 'more'])
  expect(window.localStorage.getItem('dsh-desktop-navigation-order')).toBeNull()
  await navigationMenu('Reorder navigation')
  await act(async () => document.querySelector('[aria-label="Move up: Page 2"]').click())
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  await dialogButton('Save')
  expect(document.querySelector('[role=alert]').textContent).toBe('Could not save the order. Try again.')
  expect(orderedNavigation()).toEqual(['web:page-2', 'web:page-1'])
  expect(directNavigation()[1]).toBe('web:page-1')
  storage.mockRestore()
  await dialogButton('Save')
  expect(directNavigation()[1]).toBe('web:page-2')
  await navigationMenu('Reorder navigation')
  await ui.account(false, 2)
  expect(document.querySelector('[role=dialog]')).toBeNull()
})

it.each(['invalid json', '{}', '[null, 5, "web:page-2", "web:page-2", "local:missing"]'])('handles stored order %s and keeps the collapsed navigation usable', async stored => {
  window.localStorage.setItem('dsh-desktop-navigation-order', stored)
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const expandSidebar = vi.fn()
  const ui = await mount(true, {}, false, undefined, false, { wide: false, expandSidebar })
  await ui.navigation(navigationEntries(2))
  expect(directNavigation()).toEqual(stored.startsWith('[') ? ['plugins', 'web:page-2', 'web:page-1', 'more'] : ['plugins', 'web:page-1', 'web:page-2', 'more'])
  await ui.locale('zh')
  await navigationMenu('调整顺序')
  expect(expandSidebar).not.toHaveBeenCalled()
  expect(document.querySelector('[role=dialog]').getAttribute('aria-label')).toBe('调整顺序')
  await ui.navigation([{ id: 'new', label: 'New' }])
  expect(orderedNavigation()).toEqual(['web:new'])
  await dialogButton('保存')
  expect(directNavigation()).toEqual(['plugins', 'web:new', 'more'])
  if (stored === 'invalid json') expect(warning).toHaveBeenCalled()
})

it('opens More beside the collapsed rail and keeps native Chat visible', async () => {
  const expandSidebar = vi.fn()
  const ui = await mount(true, {}, false, undefined, false, { wide: false, expandSidebar })
  await ui.navigation(navigationEntries(6))
  const sidebar = container.querySelector('aside')
  const trigger = sidebar.querySelector('[data-navigation-id=more]')
  sidebar.getBoundingClientRect = () => new DOMRect(12, 12, 56, 700)
  trigger.getBoundingClientRect = () => new DOMRect(20, 120, 40, 30)
  const panel = container.querySelector('#dsh-panel-chat')
  panel.getBoundingClientRect = () => new DOMRect(80, 80, 880, 640)
  await ui.resize(panel)

  await navigationMenu()
  const menu = document.body.querySelector(':scope > [role=menu]')
  expect(menu.dataset.side).toBe('right')
  expect(menu.dataset.anchorRight).toBe('68')
  expect([...menu.querySelectorAll('[role=menuitem]')].map(row => row.textContent)).toEqual(['Page 6', 'Reorder navigation'])
  menu.getBoundingClientRect = () => new DOMRect(72, 120, 144, 60)
  await ui.resize(menu)
  const present = window.dshEnterpriseChat.present
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, bounds: { x: 224, y: 80, width: 736, height: 640 } }))

  await act(async () => menu.querySelector('[role=menuitem]').click())
  expect(expandSidebar).not.toHaveBeenCalled()
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(window.dshEnterpriseChat.openPage).toHaveBeenLastCalledWith('page-6')
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, bounds: { x: 80, y: 80, width: 880, height: 640 } }))
})

it('floats the native More menu over Chat without changing its presentation', async () => {
  const ui = await mount(true, {}, false, undefined, false, { wide: false })
  await ui.navigation(navigationEntries(6))
  const sidebar = container.querySelector('aside')
  const trigger = sidebar.querySelector('[data-navigation-id=more]')
  sidebar.getBoundingClientRect = () => new DOMRect(12, 12, 56, 700)
  trigger.getBoundingClientRect = () => new DOMRect(20, 120, 40, 30)
  const panel = container.querySelector('#dsh-panel-chat')
  panel.getBoundingClientRect = () => new DOMRect(80, 80, 880, 640)
  await ui.resize(panel)
  const bridge = window.dshEnterpriseChat
  const initial = bridge.present.mock.lastCall[0]
  let closeMenu
  bridge.popupSidebarMenu = vi.fn(() => new Promise(resolve => { closeMenu = resolve }))
  await ui.navigation(navigationEntries(6))
  bridge.present.mockClear()

  await navigationMenu()
  expect(bridge.popupSidebarMenu).toHaveBeenCalledWith({ x: 72, y: 120, labels: ['Page 6', 'Reorder navigation'] })
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  expect(document.querySelector('[role=menu]')).toBeNull()
  await ui.resize(panel)
  expect(bridge.present).toHaveBeenLastCalledWith(initial)

  await act(async () => closeMenu(null))
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(bridge.openPage).not.toHaveBeenCalled()
  await navigationMenu()
  await act(async () => closeMenu(0))
  expect(bridge.openPage).toHaveBeenLastCalledWith('page-6')
  expect(bridge.present.mock.calls.every(([presentation]) => presentation.visible && presentation.bounds.x === 80 && presentation.bounds.width === 880)).toBe(true)

  await navigationMenu()
  await act(async () => closeMenu(1))
  expect(document.querySelector('[role=dialog]').getAttribute('aria-label')).toBe('Reorder navigation')
})

it('moves a compatible DS Bot return action into primary navigation and releases it with the plugin', async () => {
  const ui = await mount()
  const rows = () => [...container.querySelectorAll('[data-navigation-id]')].map(node => node.dataset.navigationId)
  const entry = () => container.querySelector('nav [data-navigation-id=bot-return]')
  const footer = container.querySelector('footer')
  expect(rows()).toEqual(['new', 'plugins'])
  await ui.locale('zh')
  await ui.footerAction({ id: 'bot-account' }, () => React.createElement('button', null, 'Bot account'))
  const removeOldReturn = await ui.footerAction({ id: 'bot-return', inject: () => ({}) }, () => React.createElement('button', null, 'Back to DS Bot'))
  expect(entry()).toBeNull()
  expect(footer.textContent).toBe('Bot accountBack to DS Bot')
  await removeOldReturn()

  let mode = 'agent'
  const listeners = new Set()
  const surface = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => ({ mode })
  }
  const setSurface = vi.fn(next => {
    mode = next
    listeners.forEach(listener => listener())
  })
  function NativeBotReturn() {
    const current = React.useSyncExternalStore(surface.subscribe, () => surface.getSnapshot().mode)
    return current === 'agent' ? React.createElement('button', null, 'Back to DS Bot') : null
  }
  const uninstall = await ui.footerAction({ id: 'bot-return', order: -300, inject: () => ({ hooks: { surface }, actions: { setSurface } }) }, NativeBotReturn)
  expect(rows()).toEqual(['new', 'plugins', 'bot-return', 'more'])
  expect(entry().textContent).toBe('多代理协作')
  expect(entry().getAttribute('aria-label')).toBe('多代理协作')
  expect(footer.textContent).toBe('Bot account')
  await act(async () => entry().click())
  expect(setSurface).toHaveBeenCalledTimes(1)
  expect(setSurface).toHaveBeenCalledWith('bot')
  expect(entry()).toBeNull()
  expect(footer.textContent).toBe('Bot account')
  await act(async () => setSurface('agent'))
  expect(entry()).not.toBeNull()
  expect(footer.textContent).toBe('Bot account')
  await uninstall()
  expect(entry()).toBeNull()
  expect(listeners.size).toBe(0)
  const removeReplacement = await ui.footerAction({ id: 'bot-return', order: -300 }, () => React.createElement('button', null, 'Updated plugin'))
  expect(footer.textContent).toBe('Updated pluginBot account')
  await removeReplacement()
})

it('appends DS Bot to sortable navigation and restores its saved position', async () => {
  const listeners = new Set()
  const surface = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => ({ mode: 'agent' })
  }
  const setSurface = vi.fn()
  const install = ui => ui.footerAction({ id: 'bot-return', inject: () => ({ hooks: { surface }, actions: { setSurface } }) }, () => null)

  let ui = await mount(true)
  await install(ui)
  await ui.navigation(navigationEntries(2))
  expect(directNavigation()).toEqual(['plugins', 'web:page-1', 'web:page-2', 'bot-return', 'more'])
  await navigationMenu('Reorder navigation')
  expect(orderedNavigation()).toEqual(['web:page-1', 'web:page-2', 'bot-return'])
  await act(async () => document.querySelector('[aria-label="Move up: Multi-Agent Collaboration"]').click())
  expect(orderedNavigation()).toEqual(['web:page-1', 'bot-return', 'web:page-2'])
  await dialogButton('Save')
  expect(directNavigation()).toEqual(['plugins', 'web:page-1', 'bot-return', 'web:page-2', 'more'])

  await act(async () => root.unmount())
  container.remove()
  disposers.splice(0).reverse().forEach(dispose => dispose())
  ui = await mount(true)
  const uninstall = await install(ui)
  await ui.navigation(navigationEntries(2))
  expect(directNavigation()).toEqual(['plugins', 'web:page-1', 'bot-return', 'web:page-2', 'more'])
  await uninstall()
  expect(directNavigation()).toEqual(['plugins', 'web:page-1', 'web:page-2', 'more'])
})

it('returns from the Bot header and removes only the recognized switch from keyboard navigation', async () => {
  document.documentElement.setAttribute('data-windows-titlebar', '')
  const ui = await mount(false, {}, false, undefined, true)
  const watchers = new Set()
  const surface = { subscribe(fn) { watchers.add(fn); return () => watchers.delete(fn) }, getSnapshot: () => ({ mode }) }
  let mode = 'bot'
  const setSurface = vi.fn(next => { mode = next; watchers.forEach(fn => fn()) })
  const uninstall = await ui.footerAction({ id: 'bot-return', inject: () => ({ hooks: { surface }, actions: { setSurface } }) }, () => null)
  const sidebar = document.createElement('div')
  sidebar.dataset.hostDialogFixture = ''
  sidebar.className = 'bt-leftcol'
  sidebar.dataset.left = 'open'
  sidebar.innerHTML = '<div class="bt-side"><div class="bt-side-top"><span class="bt-brand"><span>DS Bot</span></span></div></div>'
  const menu = document.createElement('div')
  menu.dataset.hostDialogFixture = ''
  menu.className = 'bt-account-menu'
  menu.setAttribute('role', 'menu')
  menu.innerHTML = '<button role="menuitem">Settings</button><div class="bt-menu-sep" role="separator"></div>' +
    '<button role="menuitem"><svg><path d="M4 7h9.5M10.5 3.5L14 7l-3.5 3.5"></path><path d="M16 13H6.5M9.5 9.5L6 13l3.5 3.5"></path></svg><span class="bt-menu-label">Classic Agent mode</span></button>' +
    '<div class="bt-menu-sep" role="separator"></div><button role="menuitem">Sign out</button>'
  const old = menu.querySelector('button:nth-of-type(2)')
  const beforeOld = old.previousElementSibling
  await act(async () => { document.body.append(menu) })
  expect(old.disabled).toBe(false)
  await act(async () => { document.body.append(sidebar) })
  const back = () => sidebar.querySelector('.dshBotSidebarBack')
  expect(back().closest('.bt-brand')).not.toBeNull()
  expect(back().textContent).toBe('Back')
  expect(back().getAttribute('aria-label')).toBe('Back to classic Agent')
  expect(back().nextElementSibling?.textContent).toBe('Multi-Agent Collaboration')
  expect(old.disabled).toBe(true)
  expect(old.hasAttribute('data-dsh-bot-menu-hidden')).toBe(true)
  expect(beforeOld.hasAttribute('data-dsh-bot-menu-hidden')).toBe(true)
  expect([...menu.querySelectorAll('button[role="menuitem"]:not(:disabled)')].map(button => button.textContent)).toEqual(['Settings', 'Sign out'])
  const path = old.querySelector('path')
  const glyph = path.getAttribute('d')
  await act(async () => path.setAttribute('d', 'M0 0'))
  expect(old.disabled).toBe(false)
  expect(beforeOld.hasAttribute('data-dsh-bot-menu-hidden')).toBe(false)
  await act(async () => path.setAttribute('d', glyph))
  expect(old.disabled).toBe(true)
  await act(async () => { sidebar.hidden = true })
  expect(back()).toBeNull()
  expect(old.disabled).toBe(false)
  await act(async () => {
    sidebar.hidden = false
    sidebar.dataset.left = 'rail'
    sidebar.querySelector('.bt-side').innerHTML = '<div class="bt-rail-top"></div>'
  })
  expect(back().closest('.bt-rail-top')).not.toBeNull()
  expect(back().textContent).toBe('')
  expect(sidebar.querySelector('.dshBotSidebarTitle')).toBeNull()
  await act(async () => back().click())
  expect(setSurface).toHaveBeenCalledExactlyOnceWith('agent')
  expect(back()).toBeNull()
  expect(container.querySelector('nav [data-navigation-id=bot-return]')).not.toBeNull()
  await uninstall()
  expect(watchers.size).toBe(0)
})

it('starts a new conversation without forwarding the click event as a workspace identity', async () => {
  const ui = await mount(true)
  await ui.cloudSession('existing')
  await act(async () => container.querySelector('[data-navigation-id=new]').click())
  expect(ui.picker()).not.toBeNull()
})


it('reserves the native opener after collapse on an active Chat and restores full bounds on expansion', async () => {
  const original = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.hasAttribute('data-shell-leading')) return { left: 80, right: 156, bottom: 48 }
    return { x: 0, y: 0, right: 960, width: 960, height: 748 }
  }
  try {
    const ui = await mount(true)
    await ui.cloudSession('existing')
    expect(ui.picker()).toBeNull()
    const present = window.dshEnterpriseChat.present
    expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ bounds: { x: 0, y: 0, width: 960, height: 748 } }))
    const leading = document.createElement('div')
    leading.dataset.shellLeading = 'true'
    const opener = document.createElement('button')
    opener.textContent = 'Open sidebar'
    opener.onclick = () => leading.remove()
    leading.append(opener)
    await act(async () => container.append(leading))
    expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ bounds: { x: 156, y: 0, width: 804, height: 748 } }))
    // The retained host chrome invokes the original action; no duplicate controls.
    await act(async () => opener.click())
    expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ bounds: { x: 0, y: 0, width: 960, height: 748 } }))
    await act(async () => root.unmount())
    root = undefined
    const calls = present.mock.calls.length
    await act(async () => container.append(leading))
    expect(present).toHaveBeenCalledTimes(calls)
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original
  }
})

it('keeps the native sidebar visible when the embedded pane spans the frame', async () => {
  const sidebar = document.createElement('div')
  sidebar.dataset.dshSidebarRoot = ''
  sidebar.getBoundingClientRect = () => ({ right: 56 })
  document.body.append(sidebar)
  const original = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () { return { x: 0, y: 48, right: 960, width: 960, height: 700 } }
  try {
    await mount(true)
    expect(window.dshEnterpriseChat.present).toHaveBeenCalledWith(expect.objectContaining({ bounds: { x: 56, y: 48, width: 904, height: 700 } }))
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original
    sidebar.remove()
  }
})

it('reserves a docked DS Bot sidebar mounted in the body and follows its lifecycle', async () => {
  const nativeSidebar = document.createElement('div')
  nativeSidebar.dataset.dshSidebarRoot = ''
  nativeSidebar.getBoundingClientRect = () => new DOMRect(0, 0, 20, 748)
  document.body.append(nativeSidebar)
  const portal = document.createElement('div')
  portal.className = 'bt-leftcol'
  portal.dataset.left = 'open'
  let portalWidth = 280
  let portalLeft = -280
  portal.getBoundingClientRect = () => new DOMRect(portalLeft, 0, portalWidth, 748)
  const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => new DOMRect(0, 56, 960, 692))
  try {
    const ui = await mount(true, { archivedOnly: true })
    const present = window.dshEnterpriseChat.present
    const expectLeft = x => expect(present).toHaveBeenLastCalledWith(expect.objectContaining({
      visible: true,
      bounds: { x, y: 56, width: 960 - x, height: 692 }
    }))
    expectLeft(20)

    // The entrance transform changes the right edge without firing a size notification.
    await act(async () => document.body.append(portal))
    expectLeft(280)
    portalLeft = 0
    portalWidth = 320
    await ui.resize(portal)
    expectLeft(320)

    portalWidth = 88
    await act(async () => { portal.dataset.left = 'rail' })
    await ui.resize(portal)
    expectLeft(88)

    await act(async () => { portal.dataset.left = 'drawer' })
    expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
    const settingsBounds = { x: 200, y: 80, width: 500, height: 400 }
    await act(async () => {
      window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: true } }))
      window.dispatchEvent(new CustomEvent('dsh-desktop:settings-surface', { detail: { section: 'tools', bounds: settingsBounds } }))
    })
    expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, settings: 'tools', bounds: settingsBounds }))
    await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: false } })))
    expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
    await act(async () => { portal.dataset.left = 'rail' })
    expectLeft(88)

    await act(async () => portal.setAttribute('data-leaving', ''))
    expectLeft(20)
    await act(async () => portal.removeAttribute('data-leaving'))
    expectLeft(88)
    await act(async () => portal.remove())
    expectLeft(20)
  } finally {
    bounds.mockRestore()
    portal.remove()
    nativeSidebar.remove()
  }
})

it('switches DS Bot between its existing icon rail and expanded sidebar in both macOS window modes', async () => {
  document.documentElement.dataset.platform = 'darwin'
  const ui = await mount(true, {}, false, undefined, true)
  const leading = document.createElement('div')
  leading.dataset.shellLeading = ''
  leading.innerHTML = '<div class="IW6AQa_controls"><button>Toggle</button><button>New</button></div>'
  container.append(leading)
  const rail = document.createElement('aside')
  rail.className = 'bt-leftcol'
  rail.dataset.left = 'hidden'
  rail.style.width = '88px'
  rail.innerHTML = '<div class="bt-side bt-rail"><div class="bt-rail-top"><button class="bt-side-collapse">Bot toggle</button><button>Chief</button></div><button class="bt-rail-folder">Folder</button><div class="bt-leftcol-foot-rail"><button class="bt-round">Footer new</button></div></div>'
  document.body.append(rail)
  let preference = 'hidden'
  let drawer = false
  const listeners = new Set()
  const actions = {
    surfaceMode: () => 'bot',
    setSurface: vi.fn(),
    openNewChat: vi.fn(), openPalette: vi.fn(),
    setSidebarPref: vi.fn(value => {
      preference = value
      rail.dataset.left = value
      listeners.forEach(listener => listener())
    }),
    setLeftDrawer: vi.fn(value => {
      drawer = value
      listeners.forEach(listener => listener())
    })
  }
  let frame = { viewport: 1200, sidebarWidth: 280 }
  const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
  const surface = { mode: 'bot' }
  const uninstall = await ui.footerAction({ id: 'bot-return', inject: () => ({ actions, hooks: { surface: { subscribe, getSnapshot: () => surface } } }) }, () => null)
  try {
    expect(getComputedStyle(leading.querySelector('button:last-child')).display).not.toBe('none')
    await ui.sidebarEntry({ actions, hooks: { sidebarPref: { subscribe, getSnapshot: () => preference }, frame: { subscribe, getSnapshot: () => frame }, ui: { subscribe, getSnapshot: () => ({ leftDrawer: drawer }) } } })
    const button = container.querySelector('[data-dsh-bot-sidebar-toggle]')
    expect(actions.setSidebarPref).toHaveBeenLastCalledWith('rail')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(getComputedStyle(leading).display).toBe('none')
    expect(getComputedStyle(rail.querySelector('.bt-side-collapse')).display).toBe('none')
    const railActions = rail.querySelector('.bt-rail-top .dshBotRailActions')
    expect(railActions).not.toBeNull()
    expect([...railActions.querySelectorAll('button')].map(action => action.getAttribute('aria-label'))).toEqual(['Back to classic Agent', 'create', 'search'])
    expect(getComputedStyle(rail.querySelector('.bt-leftcol-foot-rail button')).display).toBe('none')
    await act(async () => { railActions.querySelector('[aria-label="create"]').click(); railActions.querySelector('[aria-label="search"]').click() })
    expect(actions.openNewChat).toHaveBeenCalledWith('new')
    expect(actions.openPalette).toHaveBeenCalledOnce()
    expect(getComputedStyle(button).left).toBe('88px')

    await act(async () => button.click())
    expect(rail.dataset.left).toBe('open')
    expect(rail.querySelector('.dshBotRailActions')).toBeNull()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    document.documentElement.dataset.fullscreen = 'true'
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', metaKey: true, cancelable: true })))
    expect(rail.dataset.left).toBe('rail')
    expect(getComputedStyle(button).left).toBe('26px')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await act(async () => button.click())
    expect(rail.dataset.left).toBe('open')
    await act(async () => {
      frame = { viewport: 620, sidebarWidth: 280 }
      listeners.forEach(listener => listener())
    })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await act(async () => button.click())
    expect(actions.setLeftDrawer).toHaveBeenLastCalledWith(true)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    await act(async () => button.click())
    expect(actions.setLeftDrawer).toHaveBeenLastCalledWith(false)
    await ui.sidebarEntry(null)
    expect(container.querySelector('[data-dsh-bot-sidebar-toggle]')).toBeNull()
  } finally {
    await uninstall()
    await act(async () => rail.remove())
  }
})

it('keeps the Chat layout bounds when the floating sidebar opens and closes', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.id === 'dsh-panel-chat') return new DOMRect(0, 56, 960, 700)
    if (this.classList.contains('pI_x6G_sidebarCol') && this.parentElement.hasAttribute('data-dsh-sidebar-preview')) {
      return new DOMRect(8, 46, 280, 700)
    }
    return new DOMRect()
  })
  await mount(true, {}, false, undefined, false, { wide: false })
  const presentation = window.dshEnterpriseChat.present
  const initial = presentation.mock.lastCall[0]
  expect(initial).toMatchObject({ visible: true, bounds: { x: 0, y: 56, width: 960, height: 700 } })
  await act(async () => container.setAttribute('data-dsh-sidebar-preview', ''))
  expect(presentation.mock.lastCall[0]).toMatchObject({ bounds: initial.bounds, coveredLeft: 294 })
  await act(async () => container.removeAttribute('data-dsh-sidebar-preview'))
  expect(presentation.mock.lastCall[0].bounds).toEqual(initial.bounds)
  expect(presentation.mock.lastCall[0]).not.toHaveProperty('coveredLeft')
})

it('reserves the hosted app toolbar, yields to host overlays and returns to the existing app directory', async () => {
  const sidebar = document.createElement('div')
  sidebar.className = 'bt-leftcol'
  sidebar.dataset.left = 'open'
  sidebar.getBoundingClientRect = () => new DOMRect(0, 0, 240, 748)
  const geometry = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const inset = Number.parseFloat(this.closest('.dshModes')?.style.getPropertyValue('--dsh-plugin-rail-inset')) || 0
    if (this.classList.contains('dshModes') || this.id === 'dsh-panel-chat') return new DOMRect(inset, 48, 960 - inset, 700)
    if (this.hasAttribute('data-shell-leading')) return { left: 80, right: 156, bottom: 70 }
    if (this.parentElement?.id === 'dsh-panel-chat') return { x: 0, y: 100, right: 960, width: 960, height: 648 }
    return { x: 0, y: 48, right: 960, width: 960, height: 700 }
  })
  try {
    const ui = await mount(true)
    const bridge = window.dshEnterpriseChat
    const draft = ui.draft()
    await ui.navigation([{ id: 'apps', label: 'Apps', path: '/apps', primary: true, active: true }], '/apps')
    await ui.pushState({ hostedApp: { slug: 'fixture-app', phase: 'loading' } })
    const modes = container.querySelector('.dshModes')
    modes.style.borderTopLeftRadius = '16px'
    modes.style.borderTopWidth = '1px'
    const chat = container.querySelector('#dsh-panel-chat')
    const leading = document.createElement('div')
    leading.dataset.shellLeading = ''
    await act(async () => container.append(leading))
    expect(chat.querySelector('header button').textContent).toBe('Back to App Center')
    expect(chat.querySelector('[role=status]').textContent).toBe('Opening app…')
    expect(bridge.present).toHaveBeenLastCalledWith(expect.objectContaining({
      visible: true, radius: 15, bounds: { x: 156, y: 48, width: 804, height: 700 },
      hostedAppBounds: { x: 156, y: 100, width: 804, height: 648 }
    }))
    await ui.pushState({ hostedApp: { slug: 'fixture-app', phase: 'ready' } })
    expect(chat.querySelector('[role=status]')).toBeNull()
    await act(async () => document.body.append(sidebar))
    expect(bridge.present.mock.lastCall[0]).toMatchObject({ hostedAppBounds: { x: 252, y: 100, width: 708, height: 648 } })
    expect(modes.style.getPropertyValue('--dsh-plugin-rail-inset')).toBe('252px')
    await act(async () => { sidebar.dataset.left = 'drawer' })
    expect(bridge.present.mock.lastCall[0]).toMatchObject({ visible: false })
    expect(bridge.present.mock.lastCall[0]).not.toHaveProperty('hostedAppBounds')
    expect(modes.style.getPropertyValue('--dsh-plugin-rail-inset')).toBe('')
    await act(async () => sidebar.remove())
    expect(bridge.present.mock.lastCall[0]).toMatchObject({ hostedAppBounds: { x: 156, y: 100, width: 804, height: 648 } })
    await act(async () => { container.inert = true })
    expect(bridge.present.mock.lastCall[0]).toMatchObject({ visible: false })
    expect(bridge.present.mock.lastCall[0]).not.toHaveProperty('hostedAppBounds')
    await act(async () => { container.inert = false })
    await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: true } })))
    expect(chat.querySelector('header')).toBeNull()
    expect(bridge.present.mock.lastCall[0]).not.toHaveProperty('hostedAppBounds')
    await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: false } })))
    expect(bridge.present.mock.lastCall[0]).toHaveProperty('hostedAppBounds')
    await act(async () => chat.querySelector('header button').click())
    expect(bridge.closeHostedApp).toHaveBeenCalledOnce()
    expect(bridge.openPage).not.toHaveBeenCalled()
    expect(chat.querySelector('header')).toBeNull()
    expect(bridge.present.mock.lastCall[0]).not.toHaveProperty('hostedAppBounds')
    expect(ui.draft()).toBe(draft)
  } finally { geometry.mockRestore(); sidebar.remove() }
})

it('reserves the docked Bot sidebar layout width while its visual edge is sliding', async () => {
  const rail = document.createElement('aside')
  rail.className = 'bt-leftcol'
  rail.dataset.left = 'open'
  Object.defineProperties(rail, { offsetLeft: { value: 8 }, offsetWidth: { value: 280 } })
  rail.getBoundingClientRect = () => new DOMRect(-160, 0, 280, 700)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const inset = Number.parseFloat(this.closest('.dshModes')?.style.getPropertyValue('--dsh-plugin-rail-inset')) || 0
    return new DOMRect(inset, 56, 960 - inset, 700)
  })
  await mount(true)
  try {
    await act(async () => document.body.append(rail))
    expect(container.querySelector('.dshModes').style.getPropertyValue('--dsh-plugin-rail-inset')).toBe('300px')
    expect(window.dshEnterpriseChat.present.mock.lastCall[0].bounds.x).toBe(300)
  } finally { await act(async () => rail.remove()) }
})

it('retries a hosted app and routes closing through the destination owner', async () => {
  const ui = await mount(true)
  const bridge = window.dshEnterpriseChat
  await ui.navigation([
    { id: 'apps', label: 'Apps', path: '/apps', primary: true, active: true },
    { id: 'knowledge', label: 'Knowledge', path: '/knowledge', primary: false, active: false }
  ], '/apps')
  await ui.locale('zh')
  await ui.pushState({ hostedApp: { slug: 'fixture-app', phase: 'error' } })
  const chat = container.querySelector('#dsh-panel-chat')
  expect(chat.querySelector('header button').textContent).toBe('返回应用中心')
  expect(chat.querySelector('[role=alert]').textContent).toBe('应用加载失败。')
  await act(async () => [...chat.querySelectorAll('button')].find(button => button.textContent === '重试').click())
  expect(bridge.retryHostedApp).toHaveBeenCalledOnce()
  expect(chat.querySelector('[role=status]').textContent).toBe('正在打开应用…')
  const choose = async label => {
    await act(async () => [...container.querySelectorAll('nav [data-navigation-id]')].find(item => item.textContent === label).click())
  }
  await choose('Apps')
  expect(bridge.closeHostedApp).toHaveBeenCalledOnce()
  expect(bridge.openPage).not.toHaveBeenCalled()
  await ui.pushState({ path: '/square', hostedApp: { slug: 'fixture-app', phase: 'ready' } })
  expect(chat.querySelector('header button').textContent).toBe('返回应用广场')
  await choose('Apps')
  expect(bridge.openPage).toHaveBeenCalledWith('apps')
  await ui.pushState({ hostedApp: { slug: 'fixture-app', phase: 'ready' } })
  await choose('Knowledge')
  expect(bridge.closeHostedApp).toHaveBeenCalledOnce()
  expect(bridge.openPage).toHaveBeenLastCalledWith('knowledge')
  await ui.pushState({ hostedApp: { slug: 'fixture-app', phase: 'ready' } })
  await act(async () => container.querySelector('[data-navigation-id=plugins]').click())
  expect(ui.selected()).toBe('work')
  expect(bridge.closeHostedApp).toHaveBeenCalledTimes(2)
  expect(bridge.closeHostedApp).toHaveBeenLastCalledWith(false)
  expect(bridge.present.mock.lastCall[0]).toMatchObject({ visible: false })
  expect(bridge.present.mock.lastCall[0]).not.toHaveProperty('hostedAppBounds')
})


async function mountOnboarding({ acknowledged = false, save = async () => ({ ok: true, json: async () => ({ acknowledged: true }) }) } = {}) {
  let notice
  window.__ModuleLoader__ = { load({ factory }) {
    const plugin = factory(name => {
      if (name === 'react') return React
      if (name === '@deepseek-ai/dsh-client-ui-primitives') return {
        Button: ({ children, variant, ...props }) => React.createElement('button', props, children),
        IconGlobeOutlineRegular: () => null,
        Modal: ({ children, title }) => createPortal(React.createElement('div', { role: 'dialog', 'aria-modal': true, 'aria-label': title }, children), document.body)
      }
      throw new Error(name)
    })
    const scope = {
      locale: { register() {}, bind: () => key => key },
      configForms: { get: () => ({ getSnapshot: () => ({ mode: 'memory', value: { eligible: true, wizardVersion: acknowledged ? '1' : '' } }), subscribe: () => () => {} }) },
      slots: { inject: (_name, fn) => fn(), register: (options, component) => { notice = { component, props: options.inject() } } }
    }
    plugin.apply({ inject: (_deps, fn) => fn(scope) })
  } }
  vi.stubGlobal('fetch', vi.fn(save))
  new Function(await readFile('packages/dsh-desktop-onboarding/client.js', 'utf8'))()
  const host = document.createElement('div')
  document.body.append(host)
  const noticeRoot = createRoot(host)
  const complete = vi.fn(() => noticeRoot.render(null))
  const openSection = vi.fn(() => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: true } })))
  await act(async () => noticeRoot.render(React.createElement(notice.component, { ...notice.props, complete, openSection })))
  return {
    complete, openSection,
    async click(label) { await act(async () => [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent === label).click()) },
    async dispose() { await act(async () => noticeRoot.unmount()); host.remove() }
  }
}

it('keeps native Chat behind the initial host modal boundary and follows its release', async () => {
  const ui = await mount(true, {}, true)
  const present = window.dshEnterpriseChat.present
  expect(present.mock.calls.every(([value]) => value.visible === false)).toBe(true)
  await ui.locale('zh')
  await act(async () => window.dispatchEvent(new Event('resize')))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false, locale: 'zh' }))
  await act(async () => { container.inert = false })
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  await act(async () => root.unmount())
  root = undefined
  present.mockClear()
  await act(async () => { container.inert = true })
  expect(present).toHaveBeenCalledTimes(0)
})

it('yields native Chat to onboarding and restores the same chat and Work draft after acknowledgment', async () => {
  const ui = await mount(true)
  const draft = ui.draft()
  const notice = await mountOnboarding()
  try {
    expect(container.inert).toBe(true)
    expect(document.querySelector('[role=dialog]')).toBeTruthy()
    expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
    await notice.click('later')
    expect(fetch).toHaveBeenCalledWith('/api/desktop-onboarding/acknowledge', expect.objectContaining({ method: 'POST' }))
    expect(notice.complete).toHaveBeenCalledTimes(1)
    expect(container.inert).toBe(false)
    expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
    expect(ui.selected()).toBe('chat')
    expect(ui.draft()).toBe(draft)
  } finally { await notice.dispose() }
})

it('hands onboarding directly to model settings while native Chat stays hidden', async () => {
  await mount(true)
  const notice = await mountOnboarding()
  try {
    const present = window.dshEnterpriseChat.present
    present.mockClear()
    await notice.click('configureModel')
    expect(notice.openSection).toHaveBeenCalledWith('models')
    expect(container.inert).toBe(false)
    expect(present.mock.calls.length).toBeGreaterThan(0)
    expect(present.mock.calls.every(([value]) => value.visible === false)).toBe(true)
    await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: false } })))
    expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  } finally { await notice.dispose() }
})

it('keeps onboarding in front through acknowledgment failure and releases its boundary on unmount', async () => {
  await mount(true)
  const notice = await mountOnboarding({ save: async () => ({ ok: false }) })
  try {
    await notice.click('later')
    expect(document.querySelector('[role=alert]').textContent).toBe('saveFailed')
    expect(notice.complete).toHaveBeenCalledTimes(0)
    expect(container.inert).toBe(true)
    expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  } finally { await notice.dispose() }
  expect(container.inert).toBe(false)
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
})

it('lets returning users continue in Chat when onboarding is already acknowledged', async () => {
  await mount(true)
  const notice = await mountOnboarding({ acknowledged: true })
  try {
    expect(notice.complete).toHaveBeenCalledTimes(1)
    expect(container.inert).toBe(false)
    expect(document.querySelector('[role=dialog]')).toBeNull()
    expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  } finally { await notice.dispose() }
})


it.each(['continueWork', 'close'])('returns to the existing Work draft when the sign-in prompt is dismissed with %s', async action => {
  const ui = await mount()
  const draft = ui.draft()
  await ui.click('chat')
  await act(async () => [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent === action).click())
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(ui.selected()).toBe('work')
  expect(ui.draft()).toBe(draft)
  await ui.click('chat')
  expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1)
})

it('dismisses the sign-in prompt and enters Chat when the account becomes available', async () => {
  const ui = await mount()
  await ui.click('chat')
  expect(document.querySelector('[role=dialog]')).toBeTruthy()
  await ui.account(true)
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(ui.selected()).toBe('chat')
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
})

it.each([false, true])('gives the recovery page the pane, including restored state=%s', async (alreadyOpen) => {
  document.documentElement.toggleAttribute('data-dsh-safe-mode-page', alreadyOpen)
  const ui = await mount(true)
  const present = window.dshEnterpriseChat.present
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: !alreadyOpen }))
  await act(async () => document.documentElement.setAttribute('data-dsh-safe-mode-page', ''))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  const draft = ui.draft()
  await ui.locale('zh')
  await act(async () => {
    window.dispatchEvent(new Event('resize'))
    document.body.toggleAttribute('data-ds-dark-theme', true)
  })
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false, locale: 'zh', theme: 'dark' }))
  // Remote settings are a foreground surface above the recovery iframe.
  await act(async () => {
    window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: true } }))
    window.dispatchEvent(new CustomEvent('dsh-desktop:settings-surface', { detail: { section: 'tools', bounds: { x: 200, y: 80, width: 500, height: 400 } } }))
  })
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, settings: 'tools' }))
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: false } })))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => document.documentElement.removeAttribute('data-dsh-safe-mode-page'))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  expect(ui.draft()).toBe(draft)
  await act(async () => document.documentElement.setAttribute('data-dsh-safe-mode-page', ''))
  await ui.click('work')
  await act(async () => document.documentElement.removeAttribute('data-dsh-safe-mode-page'))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => root.unmount())
  root = undefined
  present.mockClear()
  await act(async () => document.documentElement.setAttribute('data-dsh-safe-mode-page', ''))
  expect(present).toHaveBeenCalledTimes(0)
})

it.each([false, true])('gives About the foreground including initial state=%s', async initial => {
  document.documentElement.toggleAttribute('data-dsh-about-open', initial)
  const ui = await mount(true)
  const present = window.dshEnterpriseChat.present
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: !initial }))
  await act(async () => document.documentElement.setAttribute('data-dsh-about-open', ''))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await ui.locale('zh')
  await act(async () => {
    window.dispatchEvent(new Event('resize'))
    document.body.setAttribute('data-ds-dark-theme', '')
    window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: true } }))
    window.dispatchEvent(new CustomEvent('dsh-desktop:settings-surface', { detail: { section: 'tools', bounds: { x: 200, y: 80, width: 500, height: 400 } } }))
  })
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false, settings: 'tools', locale: 'zh', theme: 'dark' }))
  await act(async () => document.documentElement.removeAttribute('data-dsh-about-open'))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, settings: 'tools' }))
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-desktop:settings-visibility', { detail: { open: false } })))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  await act(async () => document.documentElement.setAttribute('data-dsh-about-open', ''))
  await ui.click('work')
  await act(async () => document.documentElement.removeAttribute('data-dsh-about-open'))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => { container.inert = true; document.documentElement.setAttribute('data-dsh-about-open', '') })
  await ui.click('chat')
  await act(async () => document.documentElement.removeAttribute('data-dsh-about-open'))
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => { container.inert = false })
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  await act(async () => root.unmount())
  root = undefined
  present.mockClear()
  await act(async () => document.documentElement.setAttribute('data-dsh-about-open', ''))
  expect(present).toHaveBeenCalledTimes(0)
})

function hostDialog(markup = '<div role="dialog" aria-modal="true"><button>Cancel</button></div>') {
  const portal = document.createElement('section')
  portal.dataset.hostDialogFixture = 'true'
  portal.innerHTML = markup
  document.body.append(portal)
  return portal
}

it('yields native Chat to an existing host dialog and restores the same conversation after dismissal', async () => {
  const dialog = hostDialog()
  const view = await mount(true)
  await view.click('chat')
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => dialog.remove())
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  expect(container.querySelector('[aria-label="work draft"]').value).toBe('retained draft')
})

it('keeps native Chat behind nested host confirmations until their final removal', async () => {
  const view = await mount(true)
  await view.click('chat')
  let first, second
  await act(async () => { first = hostDialog() })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => { second = hostDialog('<div role="alertdialog" aria-modal="true">Confirm</div>'); first.remove() })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => second.remove())
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
})

it('shows the native notifications view inside its owning dialog and yields to other modals', async () => {
  await mount(true)
  const present = window.dshEnterpriseChat.present
  const bounds = { x: 250, y: 100, width: 600, height: 420 }
  let approvals
  await act(async () => {
    approvals = hostDialog('<div role="dialog" aria-modal="true"><div data-dsh-approvals-content></div></div>')
    const element = approvals.querySelector('[data-dsh-approvals-content]')
    window.dispatchEvent(new CustomEvent('dsh-desktop:approvals-visibility', { detail: { open: true } }))
    window.dispatchEvent(new CustomEvent('dsh-desktop:settings-surface', { detail: { token: 'notifications', section: 'notifications', bounds, element } }))
  })
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, settings: 'notifications', bounds }))

  let confirmation
  await act(async () => { confirmation = hostDialog() })
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false, settings: 'notifications' }))
  await act(async () => confirmation.remove())
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, settings: 'notifications', bounds }))

  await act(async () => {
    approvals.remove()
    window.dispatchEvent(new CustomEvent('dsh-desktop:settings-surface', { detail: { token: 'notifications', close: true } }))
    window.dispatchEvent(new CustomEvent('dsh-desktop:approvals-visibility', { detail: { open: false } }))
  })
  expect(present.mock.lastCall[0]).not.toHaveProperty('settings')
})

it('keeps native Chat hidden through the DS Bot picker and creation form until close', async () => {
  const view = await mount(true)
  await view.click('chat')
  let portal
  await act(async () => {
    portal = hostDialog('<div class="bt-pane"><div class="bt-newchat" role="dialog"><input aria-label="Recipient"></div></div>')
  })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => {
    portal.firstElementChild.innerHTML = '<div class="bt-create" role="dialog"><input aria-label="Bot name"></div>'
  })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => portal.remove())
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
})

it('tracks modal visibility and semantics within surviving portal containers', async () => {
  const view = await mount(true)
  await view.click('chat')
  let portal
  await act(async () => { portal = hostDialog('<div role="dialog" aria-modal="true" hidden>Confirm</div><div role="menu">Menu</div><div role="dialog" aria-modal="false">Popover</div>') })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  await act(async () => { portal.firstElementChild.hidden = false })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => { portal.firstElementChild.style.visibility = 'hidden' })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
  await act(async () => { portal.firstElementChild.style.visibility = '' })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => { portal.firstElementChild.setAttribute('aria-modal', 'false') })
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }))
})

it('fits sidebar tooltips and conversation menus beside Chat without hiding it', async () => {
  const view = await mount(true)
  await view.click('chat')
  const sidebar = container.querySelector('aside')
  sidebar.setAttribute('data-dsh-sidebar-root', '')
  sidebar.getBoundingClientRect = () => new DOMRect(12, 48, 280, 660)
  const panel = container.querySelector('#dsh-panel-chat')
  panel.getBoundingClientRect = () => new DOMRect(304, 80, 656, 628)
  await view.resize(panel)
  const present = window.dshEnterpriseChat.present
  const base = { visible: true, bounds: { x: 304, y: 80, width: 656, height: 628 } }
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining(base))
  present.mockClear()
  const offset = '--dsh-sidebar-overlay-offset'
  const rectAt = (element, x, y, width, height) => () =>
    new DOMRect(x + (Number.parseFloat(element.style.getPropertyValue(offset)) || 0), y, width, height)
  const tip = document.createElement('span')
  tip.setAttribute('role', 'tooltip')
  tip.getBoundingClientRect = rectAt(tip, 230, 140, 138, 28)
  await act(async () => sidebar.append(tip))
  expect(tip.style.getPropertyValue(offset)).toBe('-72px')
  expect(present).not.toHaveBeenCalled()

  const hoverCard = document.createElement('div')
  hoverCard.setAttribute('data-dsh-hover-card', '')
  hoverCard.getBoundingClientRect = rectAt(hoverCard, 230, 175, 244, 42)
  await act(async () => document.body.append(hoverCard))
  expect(hoverCard.style.getPropertyValue(offset)).toBe('-178px')
  expect(present).not.toHaveBeenCalled()

  const actions = sidebar.querySelector('.dshCloudHistoryActions')
  await act(async () => actions.click())
  const menu = document.body.querySelector(':scope > [role="menu"]')
  menu.getBoundingClientRect = rectAt(menu, 150, 240, 140, 40)
  await view.resize(menu)
  expect(menu.style.getPropertyValue(offset)).toBe('')
  expect(present).not.toHaveBeenCalled()

  menu.getBoundingClientRect = rectAt(menu, 20, 240, 420, 40)
  await view.resize(menu)
  expect(menu.style.getPropertyValue(offset)).toBe('-8px')
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true, bounds: { x: 440, y: 80, width: 520, height: 628 } }))

  await act(async () => { window.dispatchEvent(new Event('blur')); tip.remove(); hoverCard.remove() })
  expect(actions.getAttribute('aria-expanded')).toBe('false')
  expect(tip.style.getPropertyValue(offset)).toBe('')
  expect(hoverCard.style.getPropertyValue(offset)).toBe('')
  expect(menu.style.getPropertyValue(offset)).toBe('')
  expect(present).toHaveBeenLastCalledWith(expect.objectContaining(base))
  expect(present.mock.calls.every(([value]) => value.visible)).toBe(true)
})

it('fits the bundled workspace hover card inside the sidebar without resizing Chat', async () => {
  const view = await mount(true)
  await view.click('chat')
  const sidebar = container.querySelector('aside')
  sidebar.setAttribute('data-dsh-sidebar-root', '')
  sidebar.dataset.dshSidebarWide = 'true'
  sidebar.getBoundingClientRect = () => new DOMRect(13, 59, 280, 800)
  const panel = container.querySelector('#dsh-panel-chat')
  panel.getBoundingClientRect = () => new DOMRect(305, 115, 900, 740)
  await view.resize(panel)
  const present = window.dshEnterpriseChat.present
  present.mockClear()
  const card = document.createElement('div')
  card.setAttribute('role', 'button')
  card.style.setProperty('--dsh-hover-preview-fade', '120ms')
  const offset = axis => Number.parseFloat(card.style.getPropertyValue(`--dsh-sidebar-overlay-offset${axis}`)) || 0
  card.getBoundingClientRect = () => new DOMRect(294 + offset(''), 445 + offset('-y'), 244, 108)
  try {
    await act(async () => document.body.append(card))
    expect(card.hasAttribute('data-dsh-hover-card')).toBe(false)
    expect(card.getBoundingClientRect().right).toBe(285)
    expect(card.getBoundingClientRect().top).toBe(477)
    expect(present).not.toHaveBeenCalled()
  } finally {
    await act(async () => card.remove())
  }
  expect(offset('')).toBe(0)
  expect(offset('-y')).toBe(0)
})

it('passes the right panel width to its resize handle without changing the work grid tracks', async () => {
  await mount(false)
  const panel = container.querySelector('#dsh-panel-work')
  expect(panel.style.getPropertyValue('--dsh-work-rightbar-width')).toBe('420px')
  expect(panel.style.gridTemplateColumns).toBe('')
  const styles = [...document.querySelectorAll('style')].map(style => style.textContent).join('\n')
  expect(styles).toContain('grid-template:minmax(0,1fr) / minmax(0,1fr) 0px')
  expect(styles).toContain('right:calc(var(--dsh-work-rightbar-width) - 4px)')
})

it('keeps Work selected when its confirmation closes and releases modal observers on unmount', async () => {
  const view = await mount(true)
  await view.click('chat')
  let portal
  await act(async () => { portal = hostDialog() })
  await view.click('work')
  await act(async () => portal.remove())
  expect(window.dshEnterpriseChat.present).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  await act(async () => root.unmount())
  root = undefined
  window.dshEnterpriseChat.present.mockClear()
  await act(async () => { hostDialog() })
  expect(window.dshEnterpriseChat.present).toHaveBeenCalledTimes(0)
})

it('keeps native presentation stable while conversation content streams inside the app root', async () => {
  const view = await mount(true)
  await view.click('chat')
  window.dshEnterpriseChat.present.mockClear()
  await act(async () => {
    const stream = document.createElement('div')
    container.querySelector('[aria-label="work draft"]').parentElement.append(stream)
    for (let i = 0; i < 100; i++) stream.append(document.createTextNode('token '))
  })
  expect(window.dshEnterpriseChat.present).toHaveBeenCalledTimes(0)
})

function deferredHistory() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const cloudRows = () => [...container.querySelectorAll('[data-history-kind=chat]')]
const historyResult = (items, epoch = 1, hasMore = false) => ({ epoch, items, hasMore })
const historyItem = (id, title = id) => ({ id, title, updatedAt: '2026-10-18' })

it('keeps cached rows and scroll position during same-account refresh, then replaces the list', async () => {
  const ui = await mount(true)
  const row = cloudRows()[0]
  const scroll = container.querySelector('.dshRecentHistory')
  scroll.scrollTop = 48
  const pending = deferredHistory()
  window.dshEnterpriseChat.history.mockReturnValueOnce(pending.promise)
  await ui.account(true)
  expect(cloudRows()[0]).toBe(row)
  expect(scroll.scrollTop).toBe(48)
  expect(scroll.textContent).not.toContain('historyLoading')
  await act(async () => pending.resolve(historyResult([historyItem('cloud-a', 'Renamed chat'), historyItem('cloud-b')])))
  expect(cloudRows().map(item => item.title)).toEqual(['Renamed chat', 'cloud-b'])
  expect(cloudRows()[0]).toBe(row)
})

it('keeps cached rows on refresh failure and replaces them with a successful empty response', async () => {
  const ui = await mount(true)
  const row = cloudRows()[0]
  window.dshEnterpriseChat.history.mockRejectedValueOnce(new Error('offline'))
  await ui.account(true)
  expect(cloudRows()[0]).toBe(row)
  const retry = [...container.querySelectorAll('button')].find(button => button.textContent === 'historyError')
  expect(retry).toBeDefined()
  window.dshEnterpriseChat.history.mockResolvedValueOnce(historyResult([]))
  await act(async () => retry.click())
  expect(cloudRows()).toHaveLength(0)
  expect(container.querySelector('[data-local-row]')).not.toBeNull()
})

it('keeps the last list while an account-state read fails', async () => {
  const ui = await mount(true)
  const row = cloudRows()[0]
  window.dshEnterpriseChat.state.mockRejectedValueOnce(new Error('state unavailable'))
  await ui.account(true)
  expect(cloudRows()[0]).toBe(row)
})

it('coalesces repeated account refresh notifications while history is pending', async () => {
  const ui = await mount(true)
  const pending = deferredHistory()
  window.dshEnterpriseChat.history.mockClear().mockReturnValue(pending.promise)
  await ui.account(true)
  await ui.account(true)
  await ui.account(true)
  expect(window.dshEnterpriseChat.history).toHaveBeenCalledTimes(1)
  expect(cloudRows()).toHaveLength(1)
  await act(async () => pending.resolve(historyResult([historyItem('fresh')])))
  expect(cloudRows()[0].title).toBe('fresh')
})

it.each(['poll', 'push'])('clears account-owned history on %s identity changes and rejects old responses', async source => {
  const ui = await mount(true)
  const oldRequest = deferredHistory(), newRequest = deferredHistory()
  window.dshEnterpriseChat.history.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise)
  await ui.account(true)
  if (source === 'poll') await ui.account(true, 2)
  else await ui.pushState({ connected: true, epoch: 2 })
  expect(cloudRows()).toHaveLength(0)
  await act(async () => oldRequest.resolve(historyResult([historyItem('old-account')], 1)))
  expect(cloudRows()).toHaveLength(0)
  await act(async () => newRequest.resolve(historyResult([historyItem('new-account')], 2)))
  expect(cloudRows().map(row => row.title)).toEqual(['new-account'])
})

it('clears cloud rows immediately on pushed logout and keeps local work rows', async () => {
  const ui = await mount(true)
  await ui.pushState({ connected: false, epoch: 2 })
  expect(cloudRows()).toHaveLength(0)
  expect(container.querySelector('[data-local-row]')).not.toBeNull()
})

it('keeps loaded pages visible until the entire refresh has completed', async () => {
  const ui = await mount(true)
  const firstPage = Array.from({ length: 40 }, (_, i) => historyItem(`page-1-${i}`))
  window.dshEnterpriseChat.history.mockResolvedValueOnce(historyResult(firstPage, 1, true))
  await ui.account(true)
  window.dshEnterpriseChat.history.mockResolvedValueOnce(historyResult([historyItem('page-2')]))
  await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'more').click())
  const secondPage = deferredHistory()
  window.dshEnterpriseChat.history.mockResolvedValueOnce(historyResult(firstPage.map(item => ({ ...item, title: 'updated' })), 1, true)).mockReturnValueOnce(secondPage.promise)
  await ui.account(true)
  expect(cloudRows()).toHaveLength(41)
  expect(cloudRows().some(row => row.title === 'updated')).toBe(false)
  await act(async () => secondPage.resolve(historyResult([historyItem('page-2-new')])))
  expect(cloudRows()).toHaveLength(41)
  expect(cloudRows().some(row => row.title === 'page-2-new')).toBe(true)
})

it('keeps a confirmed empty state visible while refreshing an empty history', async () => {
  const ui = await mount(true, { items: [] })
  window.dshEnterpriseChat.history.mockResolvedValueOnce(historyResult([]))
  await ui.account(true)
  const history = container.querySelector('.dshRecentHistory')
  expect(history.textContent).toBe('recentrecentEmpty')
  const pending = deferredHistory()
  window.dshEnterpriseChat.history.mockReturnValueOnce(pending.promise)
  await ui.account(true)
  expect(history.textContent).toBe('recentrecentEmpty')
  await act(async () => pending.resolve(historyResult([])))
})

it('refreshes cloud history on push transitions and focus without periodic state polling', async () => {
  const ui = await mount(true)
  const bridge = window.dshEnterpriseChat
  expect(bridge.history).toHaveBeenCalledTimes(1)
  const stateCalls = bridge.state.mock.calls.length
  vi.useFakeTimers()
  try {
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(bridge.state).toHaveBeenCalledTimes(stateCalls)
    expect(bridge.history).toHaveBeenCalledTimes(1)
    await ui.chatState({ conversationId: 'another' })
    expect(bridge.history).toHaveBeenCalledTimes(2)
    await ui.chatState({ connected: false })
    expect(container.querySelectorAll('[data-history-kind=chat]')).toHaveLength(0)
    await ui.chatState({ connected: true, epoch: 2 })
    expect(bridge.history).toHaveBeenCalledTimes(3)
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(bridge.history).toHaveBeenCalledTimes(4)
  } finally { vi.useRealTimers() }
})
