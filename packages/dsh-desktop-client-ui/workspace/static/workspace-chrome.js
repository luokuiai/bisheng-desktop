// The titlebar is loaded independently of the heavier page catalogue. The two
// surfaces share Harness's React instance and navigation controller.
const localEntries = [
  { id: '/', kind: 'local', route: '/', icon: 'home' },
  { id: '/chat', kind: 'local', route: '/chat', icon: 'chat' },
  { id: '/multi-agent-chat', kind: 'local', route: '/multi-agent-chat', icon: 'multi-agent-chat' },
  { id: '/ai-chat', kind: 'local', route: '/ai-chat', icon: 'ai-chat' },
  { id: '/ai-image-generation', kind: 'local', route: '/ai-image-generation', icon: 'ai-image-generation' },
  { id: '/project-board', kind: 'local', route: '/project-board', icon: 'project-board' }
]
const pluginEntry = { id: 'plugins', kind: 'panel', route: '/plugins', panelId: 'plugins', icon: 'plugins' }
// The original platform menu keeps its published order. Entries are emitted
// only after the enterprise document authorizes them for the current account.
const remoteEntries = [
  { moduleIds: ['knowledge'], icon: 'knowledge' },
  { moduleIds: ['channel'], icon: 'channel' },
  { moduleIds: ['apps'], icon: 'apps' },
  // 1.2.0 reports the tools-and-skills page as `capabilities`; keep the older
  // `skills` identity as an alias so both platform revisions use one menu item.
  { moduleIds: ['capabilities', 'skills'], icon: 'skills', labelKey: 'skills' },
  { moduleIds: ['square'], icon: 'square' }
]
const pageSidebars = new Set(['/multi-agent-chat', '/ai-chat', '/ai-image-generation', '/ai-profile', '/project-board', '/components'])
const nativeSurfaces = new Map([
  ['/ai-chat', 'code'], ['/ai-image-generation', 'image'], ['/project-board', 'board'], ['/multi-agent-chat', 'agents']
])
const compactKey = 'dsh-desktop:workspace:compact'

export function workspaceScene(path) {
  if (path === '/chat') return 'chat'
  return pageSidebars.has(path) || path.startsWith('/templates/') ? 'page' : 'workspace'
}

export function sidebarShortcut(event, binding, macos) {
  if (event.defaultPrevented || event.isComposing) return false
  if (event.code === 'Backslash' && !event.altKey && !event.shiftKey &&
    event.metaKey === macos && event.ctrlKey === !macos) return true
  return binding?.code === event.code &&
    ['control', 'meta', 'alt', 'shift'].every((name, i) =>
      binding.modifiers.includes(name) === [event.ctrlKey, event.metaKey, event.altKey, event.shiftKey][i])
}

const pageKey = path => path.startsWith('/admin/') ? 'admin' : path.slice(1) || 'home'
const activeRoute = (path, dest) => path === dest || (dest !== '/' && path.startsWith(dest + '/'))
const mark = '/desktop-workspace/luokui-ai-logo.png'
const iconFile = '/desktop-workspace/workspace-icons.svg'
const EMPTY_STATE = {}
const EMPTY_SUBSCRIBE = () => () => {}
const EMPTY_SNAPSHOT = () => EMPTY_STATE

/**
 * One flat destination list for the whole shell. New workbench entries come
 * first, then the native plugin panel and the authorized enterprise modules.
 * The caller renders this list as-is: no group headings and no replacement of
 * either set by the other.
 */
export function buildDestinations({ entries = [], navigationReported = false, hasPanel } = {}) {
  const destinations = localEntries.map(entry => ({ ...entry }))
  if (hasPanel ? hasPanel('plugins') : true) destinations.push({ ...pluginEntry })
  for (const { moduleIds, icon, labelKey } of remoteEntries) {
    const entry = moduleIds.map(moduleId => entries.find(item => item?.id === moduleId)).find(Boolean)
    // Until the enterprise document reports its menu, keep every original
    // entry visible. Once it does, only hide what this account cannot use.
    if (navigationReported && !entry) continue
    const moduleId = entry?.id ?? moduleIds[0]
    destinations.push({
      id: 'remote:' + moduleId, kind: 'remote', moduleId, icon, labelKey,
      route: '/' + moduleId, ...(entry ? { label: entry.label } : {})
    })
  }
  return destinations
}

/** The flat list as sidebar rows for the `/chat` scene. */
export function sidebarDestinations(React, destinations, t) {
  return destinations.map(destination => ({
    key: destination.id,
    label: destination.label || t(destination.labelKey || pageKey(destination.route)),
    icon: sidebarIcon(React, destination.icon),
    href: destination.route
  }))
}

function sidebarIcon(React, name) {
  return function SidebarGlyph({ className, 'aria-hidden': hidden }) {
    return React.createElement('svg', { className, viewBox: '0 0 24 24', 'aria-hidden': hidden ?? true },
      React.createElement('use', { href: iconFile + '#' + name }))
  }
}

// Some template sidebars sit inside their own padded flex item. Animate its
// occupied width, preserving the authored panel width and any focused editor.
function preparePageMotion() {
  const body = document.body
  const sidebar = document.querySelector('[data-desktop-workspace-path] [data-titlebar-sidebar="desktop"]')
  if (!sidebar || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  const parent = sidebar.parentElement
  const wrapped = parent?.childElementCount === 1 && getComputedStyle(parent.parentElement).display.includes('flex')
  const column = wrapped ? parent : sidebar
  const density = body.dataset.dshWorkspaceDensity
  body.dataset.dshWorkspaceDensity = 'compact'
  const closed = column.getBoundingClientRect()
  const closedMargin = Number.parseFloat(getComputedStyle(column).marginInlineEnd) || 0
  body.dataset.dshWorkspaceDensity = density
  body.dataset.dshWorkspaceNavMotion = ''
  const style = getComputedStyle(column)
  const width = column.getBoundingClientRect().width
  const margin = Number.parseFloat(style.marginInlineEnd) || 0
  const gap = Number.parseFloat(getComputedStyle(column.parentElement).columnGap) || 0
  const end = wrapped ? closed.width + closedMargin : -gap
  column.style.setProperty('--dsh-workspace-column-end', margin + 'px')
  column.style.setProperty('--dsh-workspace-column-closed', (end - width) + 'px')
  column.dataset.dshWorkspaceNavColumn = ''
  column.getBoundingClientRect()
  return {
    column, sidebar,
    dispose() {
      delete column.dataset.dshWorkspaceNavColumn
      delete body.dataset.dshWorkspaceNavMotion
      column.style.removeProperty('--dsh-workspace-column-end')
      column.style.removeProperty('--dsh-workspace-column-closed')
      sidebar.inert = false
    }
  }
}

export function createWorkspaceChrome(React, loadPages) {
  const h = React.createElement

  function Icon({ name }) {
    return h('svg', { 'aria-hidden': true, viewBox: '0 0 24 24', fill: 'currentColor', focusable: false },
      h('use', { href: iconFile + '#' + name }))
  }

  // The local-storage implementation in the desktop preload survives changes
  // to Harness's loopback port. Storage-less webviews still support toggling.
  function readCompact() {
    try { return window.localStorage.getItem(compactKey) === 'true' }
    catch { return false }
  }

  function RouteButton({ destination, active, t, navigate, openRemote, compact = false }) {
    const label = destination.label || t(destination.labelKey || pageKey(destination.route))
    const dest = destination.route
    const open = () => destination.kind === 'remote'
      ? (openRemote ? openRemote(destination.moduleId) : navigate(dest))
      : navigate(dest)
    return h('button', {
      type: 'button', className: 'dshWorkspaceRoute', 'data-workspace-route': dest,
      'data-workspace-kind': destination.kind,
      title: compact ? label : undefined, 'aria-label': label, 'aria-current': active ? 'page' : undefined,
      onClick: open
    }, h(Icon, { name: destination.icon }), !compact && h('span', null, label))
  }

  // The Harness host and template builds can use different React majors.
  // Set the native boolean attribute directly so hidden controls are inert in both.
  const navigationRef = (ref, inactive) => node => {
    if (ref) ref.current = node
    node?.toggleAttribute('inert', inactive)
  }

  function DirectoryNav({ compact, destinations, activeId, t, navigate, openRemote, navRef, inactive }) {
    return h('aside', {
      ref: navigationRef(navRef, inactive), className: compact ? 'dshWorkspaceRail' : 'dshWorkspaceDirectory',
      'aria-hidden': inactive || undefined
    }, compact && h('button', { type: 'button', className: 'dshWorkspaceRailBrand',
      title: t('home'), 'aria-label': t('home'), onClick: () => navigate('/') }, h('img', { src: mark, alt: '' })),
    h('nav', { 'aria-label': compact ? t('quickNavigation') : t('navigation') },
      destinations.map(destination => h(RouteButton, {
        key: destination.id, destination, active: destination.id === activeId, t, navigate, openRemote, compact
      }))))
  }

  function ChatNav({ navigation, destinations, activeId, t, compact, navRef }) {
    const [Sidebar, setSidebar] = React.useState(null)
    React.useEffect(() => {
      let mounted = true
      loadPages().then(mod => {
        if (mounted) setSidebar(() => mod.ChatSidebar)
      }, error => {
        // Keep directory navigation and the live conversation usable if a
        // template chunk fails. Leaving and reopening the chat retries it.
        console.warn('[desktop-workspace] Loading chat navigation failed', error)
      })
      return () => { mounted = false }
    }, [])
    const items = sidebarDestinations(React, destinations, t)
    return h('div', { ref: navigationRef(navRef, compact), className: 'dshWorkspaceChatNav', 'aria-hidden': compact || undefined },
      Sidebar ? h(Sidebar, { path: '/chat', navigate: navigation.navigate, host: navigation.host, items, selected: activeId })
        : h(DirectoryNav, { destinations, activeId, t, navigate: navigation.navigate,
          openRemote: moduleId => navigation.openRemoteModule?.(moduleId), inactive: compact }))
  }

  return function WorkspaceChrome({ path, native = false, navigation, theme, shortcuts, expandBotSidebar, t }) {
    const [compact, setCompact] = React.useState(readCompact)
    const dark = React.useSyncExternalStore(theme.subscribe, theme.snapshot) === 'dark'
    const state = React.useSyncExternalStore(navigation.subscribe ?? EMPTY_SUBSCRIBE, navigation.snapshot ?? EMPTY_SNAPSHOT)
    const destinations = buildDestinations({
      entries: state.navigation?.entries,
      navigationReported: state.navigation !== undefined,
      hasPanel: navigation.hasPanel
    })
    const activeId = (state.remotePageId && 'remote:' + state.remotePageId) ||
      (state.mode === 'work' && state.activePanelId &&
        destinations.find(destination => destination.panelId === state.activePanelId)?.id) ||
      destinations.find(destination => destination.kind !== 'remote' && activeRoute(path, destination.route))?.id
    const toggleRef = React.useRef(null)
    const navRef = React.useRef(null)
    const railRef = React.useRef(null)
    const moving = React.useRef(null)
    // Native panels replace the page body entirely, so their routes keep the
    // shared directory instead of falling back to a page-owned sidebar.
    const scene = native ? 'workspace' : workspaceScene(path)
    const surface = native ? nativeSurfaces.get(path) : undefined
    const accountPlacement = compact ? 'compact' : scene === 'workspace' ? 'expanded' : undefined
    const toggle = () => {
      const active = document.activeElement
      const inPageSidebar = active?.closest('[data-titlebar-sidebar]') || (surface === 'agents' && active?.closest('.bt-leftcol'))
      if ((compact ? railRef.current : navRef.current)?.contains(active) || inPageSidebar) {
        toggleRef.current?.focus({ preventScroll: true })
      }
      if (scene === 'page' && !moving.current) moving.current = preparePageMotion()
      try { window.localStorage.setItem(compactKey, String(!compact)) } catch { /* Session-only navigation preference. */ }
      setCompact(!compact)
    }
    React.useLayoutEffect(() => {
      const body = document.body
      body.dataset.dshWorkspaceScene = scene
      if (surface) body.dataset.dshWorkspaceNative = surface
      body.dataset.dshWorkspaceDensity = compact ? 'compact' : 'expanded'
      return () => {
        delete body.dataset.dshWorkspaceScene
        delete body.dataset.dshWorkspaceNative
        delete body.dataset.dshWorkspaceDensity
      }
    }, [scene, compact, surface])
    React.useLayoutEffect(() => {
      if (surface === 'agents' && !compact) expandBotSidebar?.()
    }, [surface, compact, expandBotSidebar])
    React.useLayoutEffect(() => {
      const motion = moving.current
      if (!motion) return
      let current = true
      motion.sidebar.inert = compact
      const animations = motion.column.getAnimations().filter(animation =>
        animation.transitionProperty === 'margin-inline-end' || animation.transitionProperty === 'margin-right' ||
        animation.transitionProperty === 'clip-path')
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (current && moving.current === motion) {
          motion.dispose()
          moving.current = null
        }
      })
      return () => { current = false }
    }, [compact])
    React.useLayoutEffect(() => () => {
      moving.current?.dispose()
      moving.current = null
    }, [path])
    React.useLayoutEffect(() => {
      // Templates portal their right-side history or inspector control into
      // this seat. Notify on both edges, including a switch back to native UI.
      const signal = () => document.dispatchEvent(new Event('luokui:workspace-right-sidebar-slot-ready'))
      signal()
      return () => queueMicrotask(signal)
    }, [])
    React.useLayoutEffect(() => {
      const signal = () => document.dispatchEvent(new Event('luokui:workspace-account-slot-ready'))
      signal()
      return () => queueMicrotask(signal)
    }, [accountPlacement])
    React.useEffect(() => {
      const macos = document.documentElement.dataset.platform === 'darwin'
      const handle = event => {
        if (event.target?.closest?.('.xterm') || document.querySelector('[aria-modal="true"], dialog:modal, #root[inert]')) return
        const binding = shortcuts?.catalog.getSnapshot().find(row => row.id === 'sidebar.left.toggle')?.binding
        if (!sidebarShortcut(event, binding, macos)) return
        event.preventDefault()
        event.stopImmediatePropagation()
        if (!event.repeat) toggle()
      }
      window.addEventListener('keydown', handle, true)
      return () => window.removeEventListener('keydown', handle, true)
    }, [compact, shortcuts, scene, surface])
    const navigate = navigation.navigate
    const openRemote = moduleId => navigation.openRemoteModule?.(moduleId)
    const labelKey = pageKey(path)
    const title = destinations.find(destination => destination.id === activeId)?.label || t(labelKey)
    const tool = (icon, label, activate, extra = {}) => h('button', {
      type: 'button', className: 'dshWorkspaceTool', 'aria-label': label, title: label, onClick: activate, ...extra
    }, h(Icon, { name: icon }))
    return h(React.Fragment, null,
      h('header', { className: 'dshWorkspaceToolbar', 'aria-label': t('toolbar') },
        tool('sidebar', t(compact ? 'expand' : 'collapse'), toggle, {
          ref: toggleRef, 'aria-expanded': !compact, 'data-workspace-sidebar-toggle': '',
          onMouseDown: event => {
            if (event.button === 0 && document.activeElement?.matches('textarea,input,[contenteditable="true"]')) event.preventDefault()
          }
        }),
        compact ? h('nav', { className: 'dshWorkspaceTabs', 'aria-label': t('views') },
          destinations.filter(destination => destination.route === '/' || destination.route === '/chat')
            .map(destination => h(RouteButton, { key: destination.id, destination, active: destination.id === activeId,
              navigate, openRemote, t })),
          path !== '/' && path !== '/chat' && h('span', { className: 'dshWorkspaceCurrentTab' }, title))
        : h('div', { className: 'dshWorkspaceBreadcrumb' },
          h('button', { type: 'button', className: 'dshWorkspaceBrand', 'aria-label': t('home'), onClick: () => navigate('/') },
            h('img', { src: mark, alt: '' }), h('strong', null, 'LUOKUI-AI')),
          h('span', { className: 'dshWorkspaceDivider', 'aria-hidden': true }),
          path.startsWith('/templates/')
            ? h(React.Fragment, null,
              h('button', { type: 'button', className: 'dshWorkspaceParent dshWorkspaceParentLink', onClick: () => navigate('/templates') }, t('templates')),
              h('span', { className: 'dshWorkspaceParent', 'aria-hidden': true }, '   /   '))
            : h('span', { className: 'dshWorkspaceParent' }, t('workspace') + '   /   '),
          h('strong', { className: 'dshWorkspaceTitle' }, title)),
        h('div', { className: 'dshWorkspaceTools' },
          h('span', { 'data-workspace-actions-slot': '', className: 'dshWorkspacePortal dshWorkspaceActions' }),
          tool('settings', t('settings'), () => navigate('/settings')),
          tool(dark ? 'sun' : 'moon', t(dark ? 'light' : 'dark'), () => theme.set(dark ? 'light' : 'dark')),
          h('span', { 'data-workspace-right-sidebar-slot': '' }))),
      h(DirectoryNav, { compact: true, destinations, activeId, t, navigate, openRemote, navRef: railRef, inactive: !compact }),
      scene === 'workspace' && h(DirectoryNav, { destinations, activeId, t, navigate, openRemote, navRef, inactive: compact }),
      scene === 'chat' && h(ChatNav, { navigation, destinations, activeId, compact, t, navRef }),
      accountPlacement && h('div', { className: 'dshWorkspaceAccount', 'data-workspace-account-slot': accountPlacement }))
  }
}
