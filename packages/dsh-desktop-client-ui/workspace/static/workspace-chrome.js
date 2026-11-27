// The titlebar is loaded independently of the heavier page catalogue. The two
// surfaces share Harness's React instance and navigation controller.
const groups = [
  ['/'],
  ['/chat', '/multi-agent-chat', '/ai-chat', '/ai-image-generation', '/project-board']
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

  function RouteButton({ dest, active, t, navigate, compact = false }) {
    const name = pageKey(dest)
    const label = t(name)
    return h('button', {
      type: 'button', className: 'dshWorkspaceRoute', 'data-workspace-route': dest,
      title: compact ? label : undefined, 'aria-label': label, 'aria-current': activeRoute(active, dest) ? 'page' : undefined,
      onClick: () => navigate(dest)
    }, h(Icon, { name }), !compact && h('span', null, label))
  }

  // The Harness host and template builds can use different React majors.
  // Set the native boolean attribute directly so hidden controls are inert in both.
  const navigationRef = (ref, inactive) => node => {
    if (ref) ref.current = node
    node?.toggleAttribute('inert', inactive)
  }

  function DirectoryNav({ compact, path, t, navigate, navRef, inactive }) {
    return h('aside', {
      ref: navigationRef(navRef, inactive), className: compact ? 'dshWorkspaceRail' : 'dshWorkspaceDirectory',
      'aria-hidden': inactive || undefined
    }, compact && h('button', { type: 'button', className: 'dshWorkspaceRailBrand',
      title: t('home'), 'aria-label': t('home'), onClick: () => navigate('/') }, h('img', { src: mark, alt: '' })),
    h('nav', { 'aria-label': compact ? t('quickNavigation') : t('navigation') },
      groups.map((group, index) => h(React.Fragment, { key: group[0] },
        index > 0 && (compact
          ? h('span', { className: 'dshWorkspaceRailDivider', 'aria-hidden': true })
          : h('div', { className: 'dshWorkspaceNavGroup' }, t('spaces'))),
        group.map(dest => h(RouteButton, { key: dest, active: path, dest, t, navigate, compact }))))))
  }

  function ChatNav({ path, navigation, t, compact, navRef }) {
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
    return h('div', { ref: navigationRef(navRef, compact), className: 'dshWorkspaceChatNav', 'aria-hidden': compact || undefined },
      Sidebar ? h(Sidebar, { path, navigate: navigation.navigate, host: navigation.host })
        : h(DirectoryNav, { path, t, navigate: navigation.navigate, inactive: compact }))
  }

  return function WorkspaceChrome({ path, native = false, navigation, theme, shortcuts, expandBotSidebar, t }) {
    const [compact, setCompact] = React.useState(readCompact)
    const dark = React.useSyncExternalStore(theme.subscribe, theme.snapshot) === 'dark'
    const toggleRef = React.useRef(null)
    const navRef = React.useRef(null)
    const railRef = React.useRef(null)
    const moving = React.useRef(null)
    const scene = workspaceScene(path)
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
    const labelKey = pageKey(path)
    const title = t(labelKey)
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
          ['/', '/chat'].map(dest => h(RouteButton, { key: dest, dest, active: path, navigate, t })),
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
      h(DirectoryNav, { compact: true, path, t, navigate, navRef: railRef, inactive: !compact }),
      scene === 'workspace' && h(DirectoryNav, { path, t, navigate, navRef, inactive: compact }),
      scene === 'chat' && h(ChatNav, { path, navigation, compact, t, navRef }),
      accountPlacement && h('div', { className: 'dshWorkspaceAccount', 'data-workspace-account-slot': accountPlacement }))
  }
}
