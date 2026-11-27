// The work view borrows the same authenticated session controller and React
// runtime as the native composer. It never persists a competing transcript.
const empty = Object.freeze([])
const absent = { subscribe: () => () => {}, getSnapshot: () => null }
const toolbarSlot = () => document.querySelector('[data-workspace-right-sidebar-slot]')
function subscribeToolbar(listener) {
  document.addEventListener('luokui:workspace-right-sidebar-slot-ready', listener)
  return () => document.removeEventListener('luokui:workspace-right-sidebar-slot-ready', listener)
}

function useSource(React, source) {
  // Harness workspace snapshots are methods on the controller; keep their receiver.
  const subscribe = React.useCallback(listener => source.subscribe(listener), [source])
  const snapshot = React.useCallback(() => source.getSnapshot(), [source])
  return React.useSyncExternalStore(subscribe, snapshot)
}

function currentRow(list) {
  return Object.values(list.byId).find(row => row.retainedBy?.mainView > 0)
}

export function recentRows(list, archived, visible) {
  const hidden = new Set(archived)
  return (list.ids ?? empty).map(id => list.byId[id]).filter(row =>
    row && !row.blank && row.origin !== 'subagent' && !hidden.has(row.id) && visible(row.id)
  ).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function submitSuggestion(services, prompt) {
  const row = currentRow(services.sessions.list.getSnapshot())
  const scope = row && services.sessions.scope(row.id)
  const input = scope && services.getInput(scope)
  if (!input) {
    // The first workspace, or a reused blank with an existing draft, is
    // deliberately selected by Harness. Never manufacture a session identity.
    const folders = services.workspaces?.getSnapshot().items
    if (folders?.length) services.workspace.startSession(undefined, { prompt })
    else return 'workSelectFolder'
    return
  }
  const state = input.state.getSnapshot()
  if (state.phase !== 'plain' || state.draft || state.attachmentIds.length || state.occurrences.length) {
    input.focus()
    return 'workDraft'
  }
  input.setDraft(prompt)
  input.submit(undefined, 'click')
}

export function WorkWelcome({ React, services, t, title }) {
  const [notice, setNotice] = React.useState(null)
  const h = React.createElement
  return h('span', { className: 'dshWorkWelcome' },
    h('strong', { 'data-dsh-welcome-title': true }, title || t('workWelcome')),
    h('span', { className: 'dshWorkIntro' }, t('workIntro')),
    h('span', { className: 'dshWorkPrompts' }, ...['workAsk1', 'workAsk2', 'workAsk3'].map(key =>
      h('button', { key, type: 'button', onClick: () => {
        try { setNotice(submitSuggestion(services, t(key)) ?? null) }
        catch { setNotice('workFailed') }
      } }, t(key)))),
    notice && h('span', { role: 'status', className: 'dshWorkIntro' }, t(notice)))
}

// Read complete history via the same paged window as the conversation view.
// Only visible user and assistant text is exported, never hidden instructions,
// tool arguments, credentials in run metadata, or model reasoning.
export async function readTranscript(sessions, row, signal) {
  return sessions.using(row.id, { source: 'desktopHistoryExport', signal }, async ref => {
    const { session, eventSource } = await ref.ready
    if (session.getSnapshot().openState !== 'open') throw new Error('Unable to read conversation')
    while (eventSource.getSnapshot().hasMore) {
      signal.throwIfAborted()
      const before = eventSource.getSnapshot().entries[0]?.event.seq
      await session.loadOlder()
      const after = eventSource.getSnapshot()
      if (after.hasMore && before === after.entries[0]?.event.seq) throw new Error('Unable to read earlier messages')
    }
    signal.throwIfAborted()
    const messages = []
    for (const entry of eventSource.getSnapshot().entries) {
      if (entry.type !== 'event') continue
      const { type, data, time } = entry.event
      const message = type === 'assistant/message' ? data.message : type === 'user/message' && data.source?.kind === 'user' ? data : null
      if (!message) continue
      const text = message.content.filter(block => block.type === 'text').map(block => block.text).join('')
      if (text) messages.push({ role: message.role, text, time })
    }
    return { id: row.id, title: row.title || row.displayTitle, updatedAt: row.updatedAt, messages }
  })
}

function saveTranscripts(threads) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(threads, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'chat-history.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function age(time, locale, justNow) {
  if (!Number.isFinite(time)) return ''
  const minutes = Math.floor((Date.now() - time) / 60000)
  if (minutes < 1) return justNow
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return new Intl.RelativeTimeFormat(locale, { style: 'narrow' }).format(hours ? -hours : -minutes, hours ? 'hour' : 'minute')
  }
  return new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format(time)
}

const iconPaths = {
  "speak": "M6.60282 10.0001L10 7.22056V16.7796L6.60282 14.0001H3V10.0001H6.60282ZM2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.887 3.73857C11.7121 3.52485 11.3971 3.49335 11.1834 3.66821L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 10.0883 17.106 8.38548 15.7133 7.28673L14.2842 8.71584C15.3213 9.43855 16 10.64 16 12C16 13.36 15.3213 14.5614 14.2842 15.2841L15.7133 16.7132C17.106 15.6145 18 13.9116 18 12Z",
  "mute": "M10 7.22056L6.60282 10.0001H3V14.0001H6.60282L10 16.7796V7.22056ZM5.88889 16.0001H2C1.44772 16.0001 1 15.5524 1 15.0001V9.00007C1 8.44778 1.44772 8.00007 2 8.00007H5.88889L11.1834 3.66821C11.3971 3.49335 11.7121 3.52485 11.887 3.73857C11.9601 3.8279 12 3.93977 12 4.05519V19.9449C12 20.2211 11.7761 20.4449 11.5 20.4449C11.3846 20.4449 11.2727 20.405 11.1834 20.3319L5.88889 16.0001ZM20.4142 12.0001L23.9497 15.5356L22.5355 16.9498L19 13.4143L15.4645 16.9498L14.0503 15.5356L17.5858 12.0001L14.0503 8.46454L15.4645 7.05032L19 10.5859L22.5355 7.05032L23.9497 8.46454L20.4142 12.0001Z",
  "sidebar": "M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM9 5V19H20V5H9Z",
  "plus": "M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z",
  "close": "M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z",
  "download": "M3 19H21V21H3V19ZM13 13.1716L19.0711 7.1005L20.4853 8.51472L12 17L3.51472 8.51472L4.92893 7.1005L11 13.1716V2H13V13.1716Z",
  "check": "M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z",
  "user": "M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM6.02332 15.4163C7.49083 17.6069 9.69511 19 12.1597 19C14.6243 19 16.8286 17.6069 18.2961 15.4163C16.6885 13.9172 14.5312 13 12.1597 13C9.78821 13 7.63095 13.9172 6.02332 15.4163ZM12 11C13.6569 11 15 9.65685 15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8C9 9.65685 10.3431 11 12 11Z",
  "moreVertical": "M12 3C10.9 3 10 3.9 10 5C10 6.1 10.9 7 12 7C13.1 7 14 6.1 14 5C14 3.9 13.1 3 12 3ZM12 17C10.9 17 10 17.9 10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19C14 17.9 13.1 17 12 17ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
}
function icon(h, name, size = 18) {
  return h('svg', { viewBox: '0 0 24 24', fill: 'currentColor', width: size, height: size, 'aria-hidden': true },
    h('path', { d: iconPaths[name] }))
}

export function WorkHistory({ React, createPortal, Menu, services, t }) {
  const h = React.createElement
  const list = useSource(React, services.sessions.list)
  const workspaceList = services.workspaces ?? absent
  const folders = useSource(React, workspaceList)
  const visibility = services.workspace.sessionVisibility ?? absent
  const visibleRevision = useSource(React, visibility)
  const readStatus = services.workspace.readStatus ?? absent
  const unread = useSource(React, readStatus) ?? empty
  const rows = React.useMemo(() => recentRows(list, folders?.archivedSessionIds ?? empty,
    id => services.workspace.isSessionVisible?.(id) !== false), [list, folders, services, visibleRevision])
  const current = currentRow(list)
  const slot = React.useSyncExternalStore(subscribeToolbar, toolbarSlot)
  const [canDock, setCanDock] = React.useState(false)
  const [inspectorOpen, setInspectorOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState(true)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [motion, setMotion] = React.useState(false)
  const [menuId, setMenuId] = React.useState(null)
  const [editing, setEditing] = React.useState(null)
  const [draft, setDraft] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState(null)
  const operation = React.useRef(null)
  const panel = React.useRef(null)
  const trigger = React.useRef(null)
  const triggerSeat = React.useRef(null)
  const [triggerHost] = React.useState(() => document.createElement('span'))
  const drawer = React.useRef(null)
  const historyId = React.useId()
  const docked = canDock && !inspectorOpen
  const open = docked ? expanded : drawerOpen

  React.useLayoutEffect(() => {
    panel.current.toggleAttribute('inert', !(docked && expanded))
  }, [docked, expanded])

  React.useLayoutEffect(() => {
    const region = panel.current.parentElement
    // normal.rightbar is the remembered drag width, even when the inspector is
    // collapsed. The layout frame owns whether that width actually occupies a track.
    const frame = region.closest('.pI_x6G_frame')
    const syncInspector = () => setInspectorOpen(Boolean(frame && !frame.hasAttribute('data-rightbar-collapsed')))
    syncInspector()
    const inspector = new MutationObserver(syncInspector)
    if (frame) inspector.observe(frame, { attributes: true, attributeFilter: ['data-rightbar-collapsed'] })
    let previous
    const measure = () => {
      const width = region.clientWidth - 20 // exclude the workspace frame padding
      panel.current.style.setProperty('--dsh-work-history-width', Math.max(216, Math.min(260, width * .28)) + 'px')
      const next = width >= 720
      if (next === previous) return
      previous = next
      if (panel.current.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true })
      setMotion(false)
      setCanDock(next)
      setDrawerOpen(false)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(region)
    return () => { observer.disconnect(); inspector.disconnect() }
  }, [])

  React.useLayoutEffect(() => {
    const seat = triggerSeat.current
    const dialog = drawer.current
    if (!dialog || docked || !drawerOpen) {
      if (triggerHost.parentNode !== seat) seat.append(triggerHost)
      return () => triggerHost.remove()
    }
    // A native modal makes the entire toolbar inert. Move the same button into
    // its top layer, preserving the toolbar seat for hit testing and focus return.
    const place = () => {
      const rect = seat.getBoundingClientRect()
      Object.assign(triggerHost.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px' })
    }
    triggerHost.className = 'dshWorkHistoryModalControl'
    place()
    dialog.prepend(triggerHost)
    dialog.showModal()
    trigger.current?.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('resize', place)
      if (dialog.open) dialog.close()
      triggerHost.className = ''
      triggerHost.removeAttribute('style')
      seat.append(triggerHost)
      trigger.current?.focus({ preventScroll: true })
    }
  }, [docked, drawerOpen, slot, triggerHost])
  React.useEffect(() => () => operation.current?.abort(), [])

  const closeDrawer = () => {
    setDrawerOpen(false)
    setMenuId(null)
  }
  const run = async task => {
    if (operation.current) return
    const controller = new AbortController()
    operation.current = controller
    setBusy(true)
    setNotice(null)
    try { await task(controller.signal) }
    catch { if (!controller.signal.aborted) setNotice('workFailed') }
    finally {
      if (!controller.signal.aborted) setBusy(false)
      operation.current = null
    }
  }
  const save = targets => run(async signal => {
    const result = []
    for (const row of targets) result.push(await readTranscript(services.sessions, row, signal))
    if (!signal.aborted) saveTranscripts(result)
  })
  const copy = row => run(async signal => {
    const result = await readTranscript(services.sessions, row, signal)
    await navigator.clipboard.writeText(result.messages.map(message => message.text).join('\n\n'))
    if (!signal.aborted) setNotice('workCopied')
  })
  const rename = row => run(async signal => {
    const title = draft.trim()
    if (!title) return
    const result = await services.sessions.using(row.id, { source: 'workspaceOperation', signal }, ref => ref.binding.session.rename(title))
    if (!result.ok) throw new Error(result.error.message)
    if (!signal.aborted) setEditing(null)
  })
  const handle = (action, row) => {
    setMenuId(null)
    if (action === 'rename') {
      setEditing(row.id)
      setDraft(row.title || row.displayTitle)
    } else if (action === 'read') readStatus.setUnread(row.id, !unread.includes(row.id))
    else if (action === 'copy') void copy(row)
    else if (action === 'export') void save([row])
    else if (action === 'delete') {
      if (!docked) closeDrawer()
      services.deletion.request(row.id, row.title || row.displayTitle)
    }
  }
  const rowMenu = row => h(Menu, {
    dense: true, open: menuId === row.id, align: 'end', autoFocus: true, portal: docked,
    onClose: () => setMenuId(null), onSelect: id => handle(id, row),
    items: [
      { id: 'rename', label: t('workRename') },
      ...(readStatus.setUnread ? [{ id: 'read', label: t(unread.includes(row.id) ? 'workMarkRead' : 'workMarkUnread') }] : []),
      { id: 'copy', label: t('workCopy') }, { id: 'export', label: t('workExport') },
      { id: 'delete', label: t('workDelete'), danger: true }
    ],
    anchor: h('button', { type: 'button', disabled: busy, className: 'dshWorkHistoryMore',
      'aria-haspopup': 'menu', 'aria-expanded': menuId === row.id, 'aria-label': t('workActions'),
      onClick: () => setMenuId(row.id) }, icon(h, 'moreVertical', 16))
  })
  const panelContent = h(React.Fragment, null,
    h('button', { className: 'dshWorkHistoryNew', type: 'button', onClick: () => {
      services.workspace.startSession()
      if (!docked) closeDrawer()
    } }, icon(h, 'plus', 20), t('newConversation')),
    h('div', { className: 'dshWorkRecent' },
      h('div', { className: 'dshWorkHistoryLabel' }, t('workRecent')),
      list.phase !== 'ready' && !rows.length && h('span', { role: 'status', className: 'dshWorkHistoryEmpty' }, t('historyLoading')),
      list.phase === 'ready' && !rows.length && h('span', { className: 'dshWorkHistoryEmpty' }, t('workHistoryEmpty')),
      ...rows.map(row => h('div', { key: row.id, className: 'dshWorkHistoryRow', 'data-selected': row.id === current?.id || undefined },
        editing === row.id ? h('form', { onSubmit: event => { event.preventDefault(); void rename(row) } },
          h('input', { autoFocus: true, value: draft, disabled: busy, 'aria-label': t('workRenameTitle'),
            onChange: event => setDraft(event.target.value), onFocus: event => event.target.select(),
            onKeyDown: event => { if (event.key === 'Escape') { event.stopPropagation(); setEditing(null) } } }),
          h('button', { type: 'submit', disabled: busy || !draft.trim(), 'aria-label': t('workSave') }, icon(h, 'check', 16))) :
          h(React.Fragment, null,
            h('button', { className: 'dshWorkHistoryTitle', type: 'button', title: row.displayTitle, 'aria-current': row.id === current?.id ? 'page' : undefined,
              onClick: () => { services.workspace.openSession(row.id); if (!docked) closeDrawer() } },
              unread.includes(row.id) && h('i', { 'aria-label': t('workMarkRead') }), h('span', null, row.title || row.displayTitle)),
            h('span', { className: 'dshWorkHistoryEnd' }, h('time', null, age(row.updatedAt, document.documentElement.lang || undefined, t('justNow'))), rowMenu(row)))))),
    notice && h('span', { role: notice === 'workFailed' ? 'alert' : 'status', className: 'dshWorkHistoryNotice' }, t(notice)),
    h('footer', { className: 'dshWorkHistoryFooter' },
      h('button', { type: 'button', title: t('workAccount'), onClick: () => {
        if (!docked) closeDrawer()
        window.dispatchEvent(new CustomEvent('dsh-desktop:open-settings-section', { detail: { id: 'enterprise-account' } }))
      } }, icon(h, 'user', 22), t('workLocal')),
      h('button', { type: 'button', className: 'dshWorkExport', disabled: busy || !rows.length,
        'aria-label': t('workExportAll'), title: t('workExportAll'), onClick: () => save(rows) }, icon(h, 'download', 16))))
  const toggle = h('button', { ref: trigger, type: 'button', 'data-workspace-right-sidebar-toggle': '', 'data-chat-history-toggle': '',
    className: 'dshWorkHistoryToggle sidebar-tool-button', 'aria-expanded': open, 'aria-controls': historyId,
    title: t(open ? 'workCloseHistory' : 'workOpenHistory'), 'aria-label': t(open ? 'workCloseHistory' : 'workOpenHistory'),
    'aria-haspopup': docked ? undefined : 'dialog', onKeyDown: event => { if (!docked && drawerOpen) event.stopPropagation() }, onClick: () => {
      setMotion(true)
      if (docked) setExpanded(!expanded)
      else if (drawerOpen) closeDrawer()
      else setDrawerOpen(true)
    } }, icon(h, 'sidebar'))
  const seat = h('span', { ref: triggerSeat, className: 'dshWorkHistoryToggleSeat' })
  return h(React.Fragment, null,
    h('div', { ref: panel, className: 'dshWorkHistoryDock', 'data-motion': motion || undefined, 'data-open': docked && expanded || undefined,
      'aria-hidden': !(docked && expanded), id: docked ? historyId : undefined },
      docked && h('aside', { className: 'dshWorkHistoryCard', 'aria-label': t('workHistory') }, panelContent)),
    h('div', { className: 'dshWorkChatBlankTitle' }, t('newConversation')),
    slot ? createPortal(seat, slot) : h('div', { className: 'dshWorkHistoryFallback' }, seat),
    createPortal(toggle, triggerHost),
    !docked && drawerOpen && h('dialog', { id: historyId, className: 'dshWorkHistoryDrawer', ref: drawer, 'aria-label': t('workHistory'),
      'aria-modal': 'true', onKeyDown: event => event.stopPropagation(), onCancel: event => { event.preventDefault(); closeDrawer() },
      onClick: event => { if (event.target === drawer.current) closeDrawer() } },
      h('aside', { className: 'dshWorkHistoryCard' },
        h('header', null, h('strong', null, t('workHistory'))),
        panelContent)))
}

// One utterance owns playback. A late end event from another message must
// never cancel the response that just replaced it.
let speakingUtterance
export function WorkSpeech({ React, sessionId, messageId, services, t }) {
  const [active, setActive] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const own = React.useRef(null)
  React.useEffect(() => () => {
    if (own.current) {
      own.current.onend = own.current.onerror = null
      if (speakingUtterance === own.current) {
        window.speechSynthesis.cancel()
        speakingUtterance = undefined
      }
      own.current = null
    }
  }, [sessionId, messageId])
  const toggle = () => {
    const synth = window.speechSynthesis
    if (active && speakingUtterance === own.current) {
      synth.cancel()
      setActive(false)
      return
    }
    const source = services.sessions.binding(sessionId)?.eventSource
    const record = source?.getSnapshot().entries.find(({ event }) => event.type === 'assistant/message' && event.data.message.id === messageId)
    const text = record?.event.data.message.content.filter(block => block.type === 'text').map(block => block.text).join('')
    if (!text) return
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = document.documentElement.lang || navigator.language
    utterance.onend = () => {
      if (speakingUtterance === utterance) speakingUtterance = undefined
      if (own.current === utterance) setActive(false)
    }
    utterance.onerror = event => {
      utterance.onend()
      if (!['canceled', 'interrupted'].includes(event.error)) setFailed(true)
    }
    own.current = speakingUtterance = utterance
    setFailed(false)
    setActive(true)
    synth.speak(utterance)
  }
  const h = React.createElement
  return h(React.Fragment, null,
    h('button', { type: 'button', className: 'dshWorkSpeak', 'aria-pressed': active,
      'aria-label': t(active ? 'workStopSpeech' : 'workSpeak'), title: t(active ? 'workStopSpeech' : 'workSpeak'),
      onClick: toggle }, icon(h, active ? 'mute' : 'speak', 16)),
    failed && h('span', { role: 'alert', className: 'dshWorkHistoryNotice' }, t('workFailed')))
}
