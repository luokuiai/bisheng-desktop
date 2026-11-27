window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { Menu, MenuItemButton, Modal, Button, ReferenceIconRegular, IconPanelLeftOutlineRegular, IconNewChatOutlineRegular, IconSearchOutlineRegular, IconUsersOutlineRegular, IconChevronLeftOutlineRegular } = require('@deepseek-ai/dsh-client-ui-primitives')

    // luokui-ui:list-section:start
    /** A host can inject its own React runtime (including classic script loaders). */
    function createListSection(h) {
        return function ListSection({ heading, headingClassName, before, after, children, ...props }) {
            return h('section', props, heading == null ? null : h('div', { className: headingClassName }, heading), before, children, after);
        };
    }
    // luokui-ui:list-section:end
    const ListSection = createListSection(React.createElement)


    function BishengMark(props = {}) {
      const { size = 17, dark = false, ...imageProps } = props
      return React.createElement(
        'img',
        {
          width: size,
          height: size,
          src: dark ? '/dsh-desktop-logo-dark.png' : '/dsh-desktop-logo-light.png',
          alt: '',
          'aria-hidden': 'true',
          ...imageProps
        }
      )
    }

    function DesktopBrandMark({ themeStore }) {
      const dark = React.useSyncExternalStore(themeStore.subscribe, themeStore.snapshot) === 'dark'
      return BishengMark({ size: 17, dark })
    }

    function DesktopBrandName() {
      return null
    }

    function ConversationBrandMark({ navigation, themeStore, ...props }) {
      const dark = React.useSyncExternalStore(themeStore.subscribe, themeStore.snapshot) === 'dark'
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const icon = state.navigation?.branding?.assistantIcon
      const [failedImage, setFailedImage] = React.useState(null)
      if (icon?.enabled === false) return null
      if (icon?.image && failedImage !== icon.image) {
        return React.createElement('img', { width: props.size, height: props.size, className: props.className,
          src: icon.image, alt: '', style: { objectFit: 'contain', flex: 'none' }, referrerPolicy: 'no-referrer',
          onError: () => setFailedImage(icon.image) })
      }
      return BishengMark({ ...props, dark })
    }

    function WorkConversationPart({ component, t, ...props }) {
      const [source, setSource] = React.useState(null)
      const [attempt, setAttempt] = React.useState(0)
      React.useEffect(() => {
        let current = true
        import('/desktop-workspace/work-conversation.js')
          .then(module => { if (current) setSource(module) })
          .catch(() => { if (current) setSource(false) })
        return () => { current = false }
      }, [attempt])
      if (source === false) return React.createElement('button', { type: 'button', onClick: () => setAttempt(value => value + 1) }, t('workspaceRetry'))
      return source && React.createElement(source[component], { ...props, t, React, Menu, createPortal: require('react-dom').createPortal })
    }

    function WorkSpeechAction(props) {
      const onChatPage = React.useSyncExternalStore(props.navigation.subscribe, () => props.navigation.snapshot().workspacePath === '/chat')
      if (!onChatPage || !window.speechSynthesis) return null
      return React.createElement(WorkConversationPart, { ...props, component: 'WorkSpeech' })
    }

    function ConversationBrandTitle({ navigation, services, t }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      if (state.workspacePath === '/chat' && services) return React.createElement(WorkConversationPart, {
        component: 'WorkWelcome', services, t, title: state.navigation?.branding?.welcomeMessage
      })
      return React.createElement('span', { 'data-dsh-welcome-title': true }, state.navigation?.branding?.welcomeMessage || t('welcomeMessage'))
    }

    const LOCAL_OPEN_NS = 'desktop.localOpen'
    const LOCAL_OPEN_COPY = {
      zh: {
        label: '用本地应用打开',
        pending: '正在打开…',
        revealedDarwin: '已在访达中显示',
        revealedWindows: '已在文件资源管理器中显示',
        revealedOther: '已在文件管理器中显示',
        failed: '无法用本地应用打开'
      },
      en: {
        label: 'Open with local app',
        pending: 'Opening…',
        revealedDarwin: 'Shown in Finder',
        revealedWindows: 'Shown in File Explorer',
        revealedOther: 'Shown in the file manager',
        failed: 'Could not open with a local app'
      }
    }
    // macOS Archive Utility extracts a zip and then closes, so a successful
    // default open looks like a no-op. Revealing the archive keeps a visible result.
    const ARCHIVE_EXTENSIONS = new Set(['zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'bz2'])

    function isArchivePath(absolutePath) {
      if (typeof absolutePath !== 'string' || absolutePath.length === 0) return false
      const name = absolutePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? ''
      const dot = name.lastIndexOf('.')
      if (dot < 0 || dot === name.length - 1) return false
      return ARCHIVE_EXTENSIONS.has(name.slice(dot + 1))
    }

    function revealedCopyKey() {
      const platform = document.documentElement?.dataset?.platform
      if (platform === 'darwin') return 'revealedDarwin'
      if (platform === 'windows') return 'revealedWindows'
      return 'revealedOther'
    }

    function feedbackMessage(reason) {
      if (typeof reason === 'string') return reason.trim()
      if (reason instanceof Error) return reason.message.trim()
      if (reason && typeof reason === 'object' && typeof reason.message === 'string') {
        return reason.message.trim()
      }
      return ''
    }

    function OpenUnpreviewableFile({ absolutePath, openWorkspacePath, t }) {
      const [phase, setPhase] = React.useState('idle')
      const [feedback, setFeedback] = React.useState(null)
      const alive = React.useRef(true)
      const generation = React.useRef(0)
      const timer = React.useRef(0)
      const copy = (key) => t(key)
      React.useEffect(() => {
        setPhase('idle')
        setFeedback(null)
        return () => {
          generation.current += 1
          window.clearTimeout(timer.current)
        }
      }, [absolutePath])
      React.useEffect(() => {
        alive.current = true
        return () => {
          alive.current = false
        }
      }, [])
      const label = phase === 'pending' ? copy('pending') : copy('label')
      return React.createElement(
        'div',
        { 'data-textpreview-open-local-wrap': true },
        React.createElement('button', {
          type: 'button',
          'data-textpreview-open-local': true,
          'aria-busy': phase === 'pending' || undefined,
          disabled: phase === 'pending',
          onClick: () => {
            if (phase === 'pending') return
            const ticket = generation.current + 1
            generation.current = ticket
            window.clearTimeout(timer.current)
            setFeedback(null)
            setPhase('pending')
            const request = isArchivePath(absolutePath)
              ? { path: absolutePath, action: 'reveal' }
              : { path: absolutePath }
            let opened
            try {
              opened = openWorkspacePath(request)
            } catch (reason) {
              if (!alive.current || generation.current !== ticket) return
              setPhase('idle')
              setFeedback({
                kind: 'error',
                message: feedbackMessage(reason) || copy('failed')
              })
              return
            }
            void Promise.resolve(opened).then((result) => {
                if (!alive.current || generation.current !== ticket) return
                if (result && result.ok === false) {
                  setPhase('idle')
                  setFeedback({
                    kind: 'error',
                    message: feedbackMessage(result.error) || copy('failed')
                  })
                  return
                }
                setPhase('idle')
                if (!isArchivePath(absolutePath)) return
                setFeedback({ kind: 'success', message: copy(revealedCopyKey()) })
                timer.current = window.setTimeout(() => {
                  if (!alive.current || generation.current !== ticket) return
                  setFeedback((current) => current && current.kind === 'success' ? null : current)
                }, 2000)
              }, (reason) => {
                if (!alive.current || generation.current !== ticket) return
                setPhase('idle')
                setFeedback({
                  kind: 'error',
                  message: feedbackMessage(reason) || copy('failed')
                })
              })
          }
        },
          React.createElement('span', { 'data-textpreview-open-local-label': true }, label),
          React.createElement('span', {
            'data-textpreview-open-local-sizer': true,
            'aria-hidden': 'true'
          }, copy('label'))
        ),
        feedback && React.createElement('span', {
          role: feedback.kind === 'error' ? 'alert' : 'status',
          'data-textpreview-open-local-feedback': true,
          'data-kind': feedback.kind
        }, feedback.message)
      )
    }

    const DELETE_SESSION_NS = 'dsh-desktop-delete-session'

    // The shell owns the request: closing a row menu unmounts its occupants.
    function createSessionDeletion(deleteSession) {
      let state = null
      let active = true
      const listeners = new Set()
      const publish = (next) => {
        state = next
        listeners.forEach(listener => listener())
      }
      return {
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
        getSnapshot: () => state,
        request: (sessionId, displayTitle, context) => {
          if (active && state === null) publish({ sessionId, displayTitle, context, busy: false, error: null })
        },
        close: () => { if (state && state.busy === false) publish(null) },
        confirm: async () => {
          if (state === null || state.busy || active === false) return
          const pending = { ...state, busy: true, error: null }
          publish(pending)
          try {
            await deleteSession(pending.sessionId, pending.context)
            if (active && state === pending) publish(null)
          } catch (reason) {
            if (active && state === pending) {
              publish({ ...pending, busy: false, error: reason instanceof Error ? reason.message : String(reason) })
            }
          }
        },
        reset: () => publish(null),
        dispose: () => { active = false; publish(null); listeners.clear() }
      }
    }

    function DeleteSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, deletion, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      return React.createElement(MenuItemButton, {
        danger: true,
        onSelect: () => {
          setMenuOpen(false)
          // Let Menu restore its trigger focus before Modal captures return focus.
          setTimeout(() => deletion.request(sessionId, displayTitle), 0)
        }
      }, t('menu'))
    }

    function DeleteSessionDialog({ deletion, t }) {
      const request = React.useSyncExternalStore(deletion.subscribe, deletion.getSnapshot)
      return React.createElement(Modal, {
        open: request !== null,
        onClose: deletion.close,
        title: t('title'),
        closeLabel: t('close'),
        description: request ? t('description', { name: request.displayTitle || request.sessionId }) : '',
        footer: request && React.createElement(React.Fragment, null,
          React.createElement(Button, {
            variant: 'outline', disabled: request.busy, onClick: deletion.close,
            'data-modal-autofocus': true
          }, t('cancel')),
          React.createElement(Button, {
            variant: 'primary', disabled: request.busy, onClick: deletion.confirm
          }, t(request.busy ? 'pending' : 'confirm')))
      }, request?.busy && React.createElement('p', { role: 'status' }, t('pending')),
      request && request.error !== null && React.createElement('div', { role: 'alert' },
        React.createElement('p', null, t('failed')),
        React.createElement('p', null, request.error)))
    }

    function OpenSessionFolderMenuItem({ sessionId, useMenuOpenState, openInFinder }) {
      const [, setMenuOpen] = useMenuOpenState()
      if (typeof window.dshDesktop?.openInFinder !== 'function') return null
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      const label = chinese ? '在文件管理器中打开' : 'Open in file manager'
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          void Promise.resolve().then(() => openInFinder(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function UnreadSessionMenuItem({ sessionId, unread, onUnreadChange, useMenuOpenState }) {
      const [, setMenuOpen] = useMenuOpenState()
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          onUnreadChange(sessionId, !unread)
        }
      }, unread ? (chinese ? '标为已读' : 'Mark as read') : (chinese ? '标为未读' : 'Mark as unread'))
    }

    const CLOUD_DELETE_NS = 'desktop.cloudChatDelete'
    const CLOUD_DELETE_COPY = {
      zh: { menu: '删除', actions: '会话操作', title: '删除会话', close: '关闭', cancel: '取消', confirm: '删除会话', description: '确定删除“{name}”？会话及其聊天记录将被永久删除。', pending: '正在删除会话…', failed: '删除失败，请重试。' },
      en: { menu: 'Delete', actions: 'Conversation actions', title: 'Delete conversation', close: 'Close', cancel: 'Cancel', confirm: 'Delete conversation', description: 'Permanently delete “{name}” and its chat history?', pending: 'Deleting conversation…', failed: 'Deletion failed. Please try again.' }
    }
    const MODES_NS = 'desktop.chatWork'
    const BOT_SIDEBAR_NS = 'desktop.botSidebar'
    const BOT_SIDEBAR_COPY = {
      zh: { expand: '展开侧栏', collapse: '收起侧栏', create: '新建', search: '搜索' },
      en: { expand: 'Expand sidebar', collapse: 'Collapse sidebar', create: 'New…', search: 'Search' }
    }
    const WORK_CONVERSATION_COPY = {
      zh: {
        workWelcome: '有什么可以帮你？',
        workIntro: '对话使用已配置的模型。历史记录保存在当前工作区。',
        workAsk1: '介绍这个工作台能做什么',
        workAsk2: '用三句话写一份产品更新',
        workAsk3: '给排程应用取五个名字',
        workSelectFolder: '请先选择工作区。',
        workDraft: '请先发送或清空当前草稿。',
        workHistory: '会话历史',
        workOpenHistory: '打开会话历史',
        workCloseHistory: '收起会话历史',
        workRecent: '最近',
        workHistoryEmpty: '你发起的对话会显示在这里。',
        workRename: '重命名',
        workMarkRead: '标为已读',
        workMarkUnread: '标为未读',
        workDelete: '删除对话',
        workExport: '导出对话',
        workExportAll: '导出会话历史',
        workCopy: '复制对话',
        workCopied: '已复制',
        workActions: '更多对话操作',
        workLocal: '当前工作区',
        workRenameTitle: '对话标题',
        workSave: '保存',
        workFailed: '操作失败，请重试。',
        workSpeak: '朗读回复',
        workStopSpeech: '停止朗读',
        workAccount: '账户设置'
      },
      en: {
        workWelcome: 'How can I help?',
        workIntro: 'Chat with your configured model. History is saved in this workspace.',
        workAsk1: 'What can this workspace do?',
        workAsk2: 'Write a product update in three sentences',
        workAsk3: 'Suggest five names for a scheduling app',
        workSelectFolder: 'Choose a workspace first.',
        workDraft: 'Send or clear your current draft first.',
        workHistory: 'Chat history',
        workOpenHistory: 'Open chat history',
        workCloseHistory: 'Collapse chat history',
        workRecent: 'Recent',
        workHistoryEmpty: 'Your conversations will appear here.',
        workRename: 'Rename',
        workMarkRead: 'Mark as read',
        workMarkUnread: 'Mark as unread',
        workDelete: 'Delete conversation',
        workExport: 'Export conversation',
        workExportAll: 'Export chat history',
        workCopy: 'Copy conversation',
        workCopied: 'Copied',
        workActions: 'More conversation actions',
        workLocal: 'Current workspace',
        workRenameTitle: 'Conversation title',
        workSave: 'Save',
        workFailed: 'Action failed. Try again.',
        workSpeak: 'Read response aloud',
        workStopSpeech: 'Stop reading',
        workAccount: 'Account settings'
      }
    }
    const MODES_COPY = {
      zh: { ...WORK_CONVERSATION_COPY.zh,  workspaceImagePrompt: '请生成图像：{prompt}', workspaceAgentsUnavailable: '请先在插件管理中启用多代理协作。', workspaceLoading: '正在打开工作台…', workspaceFailed: '工作台页面加载失败。', workspaceRetry: '重新加载', welcomeMessage: '来一起创造', welcome: '欢迎来到', newConversation: '新建对话', navigation: '导航', moreNavigation: '更多', recent: '对话', projects: '工作区', all: '所有会话', results: '搜索结果', cloud: '云端聊天', local: '本地工作', recentEmpty: '暂无最近会话', recentSearchEmpty: '当前列表没有匹配的会话', chat: '聊天', work: '工作', label: '聊天与工作', loading: '正在连接企业聊天…', error: '企业聊天连接失败，请重试', retry: '重新连接', refresh: '刷新聊天记录', historyLoading: '正在加载聊天记录…', historyError: '加载失败，点击重试', empty: '暂无聊天记录', more: '加载更多', newChat: '新聊天', signIn: '登录企业账号', signInTitle: '登录后使用聊天', signInDescription: '聊天由企业平台提供。登录后，即可使用平台中的模型和对话记录。', continueWork: '继续使用工作', close: '关闭', justNow: '刚刚',
        reorderNavigation: '调整顺序', navigationOrderDescription: '拖动调整顺序，前 5 个显示在侧栏，其余放入“更多”。也可以使用上移、下移按钮。', navigationMoveUp: '上移', navigationMoveDown: '下移', navigationDirect: '侧栏', navigationOverflow: '更多', navigationOrderSave: '保存', navigationOrderCancel: '取消', navigationOrderError: '保存顺序失败，请重试。',
        multiAgentCollaboration: '多代理协作', botBack: '返回', botBackToAgent: '返回经典 Agent 界面', hostedAppBack: '返回应用中心', hostedAppBackToSquare: '返回应用广场', hostedAppLoading: '正在打开应用…', hostedAppError: '应用加载失败。', hostedAppActionError: '操作失败，请重试。', hostedAppRetry: '重试' },
      en: { ...WORK_CONVERSATION_COPY.en,  workspaceImagePrompt: 'Generate an image: {prompt}', workspaceAgentsUnavailable: 'Enable the agent team in Plugins first.', workspaceLoading: 'Opening workspace…', workspaceFailed: 'Could not load the workspace.', workspaceRetry: 'Reload', welcomeMessage: "Let's Create Together", welcome: 'Welcome', newConversation: 'New conversation', navigation: 'Navigation', moreNavigation: 'More', recent: 'Conversations', projects: 'Workspaces', all: 'All conversations', results: 'Search results', cloud: 'Cloud chat', local: 'Local work', recentEmpty: 'No recent conversations', recentSearchEmpty: 'No matches in the current list', chat: 'Chat', work: 'Work', label: 'Chat and Work', loading: 'Connecting to enterprise Chat…', error: 'Could not connect to enterprise Chat. Try again.', retry: 'Reconnect', refresh: 'Refresh Chat history', historyLoading: 'Loading history…', historyError: 'Loading failed. Retry', empty: 'No chats yet', more: 'Load more', newChat: 'New chat', signIn: 'Sign in to your enterprise account', signInTitle: 'Sign in to use Chat', signInDescription: 'Chat is provided by your enterprise platform. Sign in to use its models and conversations.', continueWork: 'Continue in Work', close: 'Close', justNow: 'Now',
        reorderNavigation: 'Reorder navigation', navigationOrderDescription: 'Drag to reorder. The first 5 appear in the sidebar; the rest appear under More. You can also use the Move up and Move down buttons.', navigationMoveUp: 'Move up', navigationMoveDown: 'Move down', navigationDirect: 'Sidebar', navigationOverflow: 'More', navigationOrderSave: 'Save', navigationOrderCancel: 'Cancel', navigationOrderError: 'Could not save the order. Try again.',
        multiAgentCollaboration: 'Multi-Agent Collaboration', botBack: 'Back', botBackToAgent: 'Back to classic Agent', hostedAppBack: 'Back to App Center', hostedAppBackToSquare: 'Back to Discover', hostedAppLoading: 'Opening app…', hostedAppError: 'Could not load the app.', hostedAppActionError: 'The action failed. Try again.', hostedAppRetry: 'Retry' }
    }
    /**
     * Host tokens the embedded enterprise document reuses. It cannot read the host's CSS, so the
     * presenter resolves them here and sends plain channels with the presentation.
     */
    const PALETTE_TOKENS = {
      surface: '--dsw-alias-bg-layer-2', raised: '--dsw-alias-bg-layer-3', strong: '--dsw-alias-bg-overlay',
      labelPrimary: '--dsw-alias-label-primary', labelSecondary: '--dsw-alias-label-secondary', labelTertiary: '--dsw-alias-label-tertiary',
      borderBase: '--dsw-alias-border-l2', borderDeep: '--dsw-alias-border-l3', composer: '--dsw-specific-input-major'
    }
    // A token that does not resolve leaves the fallback behind, which is how a missing one is told
    // apart from a real color; the probe never renders, so the sentinel is never seen.
    const PALETTE_FALLBACK = [1, 2, 3]

    function samplePalette() {
      if (!document.body) return undefined
      const probe = document.createElement('span')
      probe.setAttribute('aria-hidden', 'true')
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;pointer-events:none'
      document.body.appendChild(probe)
      try {
        const read = (token) => {
          probe.style.color = `var(${token}, rgb(1, 2, 3))`
          const channels = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).map(Number)
          if (channels.length < 3 || PALETTE_FALLBACK.every((channel, index) => channel === channels[index])) return undefined
          return channels
        }
        const surface = read(PALETTE_TOKENS.surface)
        if (!surface) return undefined
        const palette = {}
        for (const [role, token] of Object.entries(PALETTE_TOKENS)) {
          const channels = read(token)
          if (!channels) return undefined
          // Translucent host tokens (borders, hover fills) are flattened over the surface they sit on.
          const alpha = channels.length > 3 ? channels[3] : 1
          palette[role] = channels.slice(0, 3).map((channel, index) => Math.max(0, Math.min(255, Math.round(surface[index] + (channel - surface[index]) * alpha))))
        }
        const mask = read('--dsw-alias-bg-mask-1')
        if (mask) palette.mask = [...mask.slice(0, 3), mask[3] ?? 1]
        return palette
      } catch { return undefined } finally { probe.remove() }
    }

    let sampledPalette
    /**
     * The palette only moves with the theme, so a successful probe is kept per theme rather than run
     * per frame; a probe that found no tokens yet (theme styles still loading) is tried again next time.
     */
    function hostPalette() {
      const theme = document.body?.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light'
      if (sampledPalette?.theme !== theme) {
        const value = samplePalette()
        sampledPalette = value ? { theme, value } : undefined
        return value
      }
      return sampledPalette.value
    }

    /** One renderer-owned mode/history controller shared by the content and sidebar slots. */
    async function loadWorkspacePages() {
      const runtime = await import('/desktop-workspace/host-runtime.js')
      runtime.bindHost(require)
      return import('/desktop-workspace/pages.js')
    }

    function WorkspaceView({ navigation, path, t }) {
      const [result, setResult] = React.useState(null)
      const [attempt, retry] = React.useReducer(number => number + 1, 0)
      React.useEffect(() => {
        let active = true
        setResult(null)
        loadWorkspacePages().then(module => {
          if (!active) return
          navigation.registerPageLocale(module.pagesMessages)
          setResult({ Page: module.WorkspacePages })
        }).catch(error => {
          console.error('[desktop-workspace] Loading pages failed', error)
          if (active) setResult({ failed: true })
        })
        return () => { active = false }
      }, [attempt])
      return React.createElement('section', { className: 'dshWorkspacePages', 'data-workspace-path': path },
        result?.Page ? React.createElement(result.Page, { path, navigate: navigation.navigate, host: navigation.host }) :
          React.createElement('div', { role: 'status', className: 'dshWorkspaceLoadState' },
            t(result?.failed ? 'workspaceFailed' : 'workspaceLoading'),
            result?.failed && React.createElement('button', { type: 'button', onClick: retry }, t('workspaceRetry'))))
    }

    const workspacePanels = { '/ai-chat': 'code-workbench-layout', '/ai-image-generation': 'copylee-image-gen.paintings', '/project-board': 'super-kanban' }
    const workspaceDestinations = new Set(['', 'chat', 'multi-agent-chat', 'ai-chat', 'ai-image-generation', 'ai-profile', 'project-board', 'lab', 'components', 'charts', 'icons', 'templates', 'admin', 'settings', 'model', 'harness'])
    function createChatNavigation(ctx) {
      let value = { mode: 'work', connected: false, phase: 'idle', epoch: undefined, items: [], page: 0, hasMore: false, historyPhase: 'idle', settingsOpen: false, signInPromptOpen: false, approvalsOpen: false, accountDialogOpen: false, settingsSurface: undefined, pageId: undefined, navigation: undefined, workLanding: false, nativeWork: true, panelOpen: false, activePanelId: null }
      const enabled = typeof document !== 'undefined' && Boolean(document.querySelector?.('link[href="/desktop-workspace/workspace.css"]'))
      const trail = []
      value.workspacePath = enabled ? '/' : undefined
      const listeners = new Set()
      let active = false, revision = 0, historyRequest = 0, historyDirty = false
      const publish = (patch) => { value = { ...value, ...patch }; listeners.forEach(fn => fn()) }
      const hasPanel = id => ctx.slots.entries('main').some(entry => entry.options.key === id)
      const currentBot = () => readBotReturn(createBotNavigation(ctx.slots).snapshot())
      let workbenches, routeRevision = 0
      const isNativeBot = () => value.workspaceNative && value.workspacePath === '/multi-agent-chat'
      const leaveBot = () => {
        if (isNativeBot()) currentBot()?.back()
      }
      const closePanel = () => {
        if (ctx.layout.panelInfo.getSnapshot().activePanelId !== null) ctx.layout.selectPanel(null)
      }
      const openDesktop = () => {
        routeRevision++
        leaveBot()
        closePanel()
        publish({ workspacePath: undefined, workspaceNative: false, mode: 'work', pageId: undefined })
      }
      const navigate = (path, remember = true, afterOpen) => {
        if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return
        const url = new URL(path, 'https://workspace.invalid')
        if (url.origin !== 'https://workspace.invalid' || !workspaceDestinations.has(url.pathname.split('/')[1])) return
        const target = url.pathname
        const request = ++routeRevision
        const preview = url.searchParams.get('preview') === '1'
        const panel = !preview && workspacePanels[target]
        const bot = !preview && target === '/multi-agent-chat' && currentBot()
        const nativePanel = Boolean(panel && hasPanel(panel))
        const native = Boolean(bot || nativePanel)
        const workspacePath = native ? target : path
        if (remember && value.workspacePath && value.workspacePath !== workspacePath) trail.push(value.workspacePath)
        if (!bot) leaveBot()
        ctx.layout.selectPanel(nativePanel ? panel : null)
        publish({ workspacePath, workspaceNative: native, mode: 'work', pageId: undefined, signInPromptOpen: false })
        if (bot) bot.open()
        if (target === '/chat' && workbenches && !value.nativeWork) {
          const leaving = workbenches.leave()
          // Workbench persistence may fail. Keep the original workspace available for retry.
          return leaving.then(() => {
            if (active && request === routeRevision && value.workspacePath === workspacePath) return afterOpen?.()
          }, error => {
            if (!active || request !== routeRevision || value.workspacePath !== workspacePath) return
            openDesktop()
            workbenches?.run(Promise.reject(error))
          })
        }
        return afterOpen?.()
      }
      const pageNamespace = 'desktop.workspacePages'
      let pageLocaleMounted = false
      const registerPageLocale = messages => {
        if (pageLocaleMounted || !messages) return
        ctx.effect(() => ctx.locale.register(pageNamespace, messages), 'desktop workspace: page locale')
        pageLocaleMounted = true
      }
      const taskDrafts = new Map()
      function templateWorkspace() {
        const folders = ctx.get('workspaces')?.list.getSnapshot().items ?? []
        const sessions = ctx.sessions.list.getSnapshot().byId
        const selected = folders.find(folder => folder.sessionIds.some(id => sessions[id]?.retainedBy?.mainView > 0))
        if (selected) return selected.workspaceId
        // Match Harness's current-or-most-recent workspace choice before asking
        // openWorkspace to resolve its actual reusable blank and retained binding.
        let latest = -Infinity, target
        for (const folder of folders) {
          let updated = -Infinity
          for (const id of folder.sessionIds) if (sessions[id]) updated = Math.max(updated, sessions[id].updatedAt)
          if (updated === -Infinity) updated = Date.parse(folder.createdAt)
          if (!target || updated > latest) { target = folder.workspaceId; latest = updated }
        }
        return target
      }
      const host = {
        t: (...args) => ctx.locale.bind(pageNamespace)(...args),
        get locale() { return ctx.locale.getSnapshot().active },
        getTaskDraft(name) { return taskDrafts.get(name) },
        setTaskDraft(name, prompt) {
          if (prompt) taskDrafts.set(name, { prompt })
          else taskDrafts.delete(name)
        },
        setTheme(mode) { if (mode === 'light' || mode === 'dark') ctx.theme.setTheme(mode) },
        async getModelStatus(signal) { return (await import('/desktop-workspace/workspace-host.js')).getModelStatus(ctx, signal) },
        async listTasks(signal) { return (await import('/desktop-workspace/workspace-host.js')).listTasks(ctx, signal) },
        openTask(id) { return navigate('/chat', true, () => ctx.uiWorkspace.openSession(id)) },
        openCapability(name, input) {
          if (name === 'desktop') return openDesktop()
          const sections = { settings: 'general', profile: 'enterprise-account', tools: 'plugins', storage: 'enterprise-account', usage: 'enterprise-account', model: 'models' }
          if (Object.hasOwn(sections, name)) {
            window.dispatchEvent(new CustomEvent('dsh-desktop:open-settings-section', { detail: { id: sections[name] } }))
            return
          }
          if (!['code', 'image', 'agents', 'board'].includes(name)) return
          const route = { code: '/ai-chat', image: '/ai-image-generation', agents: '/multi-agent-chat', board: '/project-board' }[name]
          const panelId = workspacePanels[route]
          if (!input?.prompt && panelId && hasPanel(panelId)) {
            navigate(route)
            return
          }
          if (name === 'board') { navigate('/harness'); return }
          if (name === 'agents' && !input?.prompt) {
            if (currentBot()) navigate(route)
            else if (hasPanel('plugins')) { openDesktop(); ctx.layout.selectPanel('plugins') }
            else throw new Error(ctx.locale.bind(MODES_NS)('workspaceAgentsUnavailable'))
            return
          }
          const prompt = name === 'image' && input?.prompt
            ? ctx.locale.bind(MODES_NS)('workspaceImagePrompt', { prompt: input.prompt }) : input?.prompt
          // Selecting a layout panel aborts Harness's pending session navigation.
          // Start the draft after the chat panel and any workbench exit have settled.
          if (!prompt) return navigate('/chat', true, () => ctx.uiWorkspace.startSession())
          const source = value.workspacePath
          const typed = taskDrafts.get(name)?.prompt
          const draft = { prompt: typed?.trim() === input.prompt ? typed : input.prompt }
          taskDrafts.set(name, draft)
          return navigate('/chat', true, async () => {
            const request = routeRevision
            try {
              const workspaceId = templateWorkspace()
              if (!workspaceId) throw new Error(host.t('taskWorkspaceRequired'))
              await ctx.uiWorkspace.openWorkspace(workspaceId, id => {
                const binding = ctx.sessions.binding(id)
                const result = binding && ctx.get('conversation')?.input.requestDraftInitialization(binding, { prompt })
                if (result !== 'applied') {
                  draft.sessionId = id
                  throw new Error(host.t(result === 'preserved' ? 'taskDraftConflict' : 'taskDraftBlocked'))
                }
                if (taskDrafts.get(name) === draft) taskDrafts.delete(name)
              })
            } catch (error) {
              draft.error = error instanceof Error ? error.message : host.t('openError')
              if (request === routeRevision && source && taskDrafts.get(name) === draft) {
                if (trail.at(-1) === source) trail.pop()
                navigate(source, false)
              }
            }
          })
        }
      }
      const select = (mode) => {
        if (mode === 'chat' && !value.connected) {
          publish({ signInPromptOpen: true })
          return false
        }
        const dismissApp = mode === 'work' && value.mode !== 'work' && value.hostedApp
        leaveBot()
        if (value.workspaceNative && mode === 'chat') closePanel()
        publish({ mode, workspacePath: mode === 'work' && value.workspacePath === '/chat' ? '/chat' : undefined, workspaceNative: false, pageId: undefined, signInPromptOpen: false })
        if (dismissApp) void window.dshEnterpriseChat.closeHostedApp(false).catch(() => { if (active) void readHostState() })
        return true
      }
      const refreshHistory = async (more = false) => {
        if (!value.connected || !window.dshEnterpriseChat) return
        if (value.historyPhase === 'loading') { if (!more) historyDirty = true; return }
        const request = ++historyRequest, epoch = value.epoch
        const page = more ? value.page + 1 : 1
        const lastPage = more ? page : Math.max(1, value.page)
        publish({ historyPhase: 'loading' })
        try {
          let items = more ? [...value.items] : [], response, fetchedPage = page
          for (let next = page; next <= lastPage; next++) {
            response = await window.dshEnterpriseChat.history(next)
            if (!active || request !== historyRequest || epoch !== value.epoch) return
            if (response.epoch !== epoch) { publish({ historyPhase: 'idle' }); return }
            fetchedPage = next
            items.push(...response.items)
            if (!response.hasMore) break
          }
publish({ items: [...new Map(items.map(item => [item.id, item])).values()], page: fetchedPage, hasMore: response.hasMore, historyPhase: 'ready' })
        } catch {
          if (active && request === historyRequest && epoch === value.epoch) publish({ historyPhase: 'error' })
        } finally {
          if (active && request === historyRequest && historyDirty) { historyDirty = false; void refreshHistory() }
        }
      }
      const deletion = createSessionDeletion(async (id, epoch) => {
        if (epoch !== value.epoch || !value.connected) throw new Error('Chat identity changed.')
        const response = await window.dshEnterpriseChat.remove(id, epoch)
        if (!active || epoch !== value.epoch || response.epoch !== epoch) return
        historyRequest++
        publish({ items: value.items.filter(item => item.id !== id), historyPhase: 'idle' })
        void refreshHistory()
      })
      const open = async (id) => {
        if (!select('chat')) return
        const epoch = value.epoch
        try {
          await window.dshEnterpriseChat.open(id)
          if (active && epoch === value.epoch) { publish({ conversationId: id }); void refreshHistory() }
        }
        catch { if (active && epoch === value.epoch) void readHostState() }
      }
      // Account notifications also follow ordinary enterprise reads. The host epoch,
      // shared by history responses and state updates, owns the in-memory history.
      const applyState = (next, refresh = false) => {
        const identityChanged = next.epoch !== value.epoch
        const signedIn = next.connected && !value.connected
        const conversationChanged = next.conversationId !== value.conversationId
        const becameReady = next.phase === 'ready' && value.phase !== 'ready'
        const clearHistory = identityChanged || !next.connected
if (clearHistory) { historyRequest++; historyDirty = false; deletion.reset() }
        publish({
          ...next,
          hostedApp: next.connected ? next.hostedApp : undefined,
          ...(clearHistory ? { items: [], page: 0, hasMore: false, historyPhase: 'idle' } : {}),
          signInPromptOpen: next.connected ? false : value.signInPromptOpen,
          pageId: next.navigation?.entries.find(entry => entry.active)?.id,
          mode: next.connected ? signedIn && !value.workspacePath ? 'chat' : value.mode : 'work'
        })
        if (signedIn) window.dispatchEvent(new CustomEvent('dsh-desktop:close-settings'))
        if (next.connected && next.phase === 'ready' && (refresh || identityChanged || signedIn || conversationChanged || becameReady)) void refreshHistory()
      }
      const sync = async () => {
        const request = ++revision
        try {
          const next = await window.dshEnterpriseChat?.state()
          if (!active || request !== revision || !next) return
          applyState(next, true)
        } catch { /* A missed focus read must not paint the reconnect page. */ }
      }
      // One guarded read. It does not refresh history; sync() owns that on focus and visibility.
      const readHostState = async () => {
        const request = ++revision
        try {
          const next = await window.dshEnterpriseChat?.state()
          if (!active || request !== revision || !next) return
          applyState(next)
        } catch { /* Keep the last host snapshot. A missed read is not a dead session. */ }
      }
      return {
        snapshot: () => value,
        subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
        select, open, refreshHistory, deletion, navigate, openDesktop, host, registerPageLocale,
        canGoBack: () => trail.length > 0,
        goBack() { navigate(trail.pop() || '/', false) },
        requestDelete(id, title, epoch) {
          if (value.connected && epoch === value.epoch && value.items.some(item => item.id === id)) deletion.request(id, title, epoch)
        },
        bindWorkbench(service) {
          workbenches = service
          const sync = () => {
            const snapshot = service.getSnapshot()
            publish({ nativeWork: snapshot.enabled === false || snapshot.state.active == null })
          }
          const unsubscribe = service.subscribe(sync)
          sync()
          return () => { unsubscribe(); workbenches = undefined; publish({ nativeWork: true }) }
        },
        dismissSignIn() { publish({ signInPromptOpen: false }) },
        signIn() {
          publish({ signInPromptOpen: false })
          window.dispatchEvent(new CustomEvent('dsh-desktop:open-settings-section', { detail: { id: 'enterprise-account' } }))
        },
        async openPage(id) {
          if (!value.connected || !value.navigation?.entries.some(entry => entry.id === id)) return
          const hostedApp = value.hostedApp
          const returningToDirectory = hostedApp && id === 'apps' && /^\/apps\/?$/u.test(value.path ?? '')
          leaveBot()
          ctx.layout.selectPanel(null)
          publish({ mode: 'chat', workspacePath: undefined, workspaceNative: false, pageId: id })
          const epoch = value.epoch
          try {
            // Apps already owns the document behind an app launched from the center.
            if (returningToDirectory) await window.dshEnterpriseChat.closeHostedApp()
            else await window.dshEnterpriseChat.openPage(id)
          }
          catch { if (active && epoch === value.epoch) void readHostState() }
        },
        choose(mode) {
          if (!select(mode)) return false
          if (mode === 'chat' && value.conversationId !== 'new') void open('new')
          if (mode === 'work' && (!value.workLanding || value.panelOpen)) ctx.uiWorkspace.startSession()
          return true
        },
        start() {
          active = true
          const account = () => { void sync() }
          const visibility = () => { if (!document.hidden) void sync() }
// Older workspace hosts omit this registration. Failing here used to skip
// the enterprise menu sync, so More never received knowledge and the other pages.
const hasNavigationHandler = typeof ctx.uiWorkspace.registerNavigationHandler === 'function'
const disposeNavigation = hasNavigationHandler
  ? ctx.uiWorkspace.registerNavigationHandler((intent, workspaceId) => {
    if (intent === 'new' && workspaceId === undefined && value.mode === 'chat') { void open('new'); return true }
    if (!value.workspacePath || value.mode === 'chat') select('work')
  })
  : () => {}
// This host never notifies session opens. A history click still replaces
// the work session, so reveal that column when chat is covering it.
const originalOpenSession = ctx.uiWorkspace.openSession
const revealWorkSession = hasNavigationHandler || typeof originalOpenSession !== 'function'
  ? null
  : function (target, source) {
    const result = originalOpenSession.call(this, target, source)
    if (typeof target === 'string' && value.mode === 'chat') select('work')
    return result
  }
if (revealWorkSession) ctx.uiWorkspace.openSession = revealWorkSession
          const settings = (event) => publish({ settingsOpen: event.detail?.open === true, ...(event.detail?.open ? {} : { settingsSurface: undefined }) })
          const approvals = (event) => publish({ approvalsOpen: event.detail?.open === true })
          // A sidebar account dialog is drawn by the renderer, so the native view yields the region.
          const accountDialog = (event) => publish({ accountDialogOpen: event.detail?.open === true })
          const settingsSurface = (event) => {
            const detail = event.detail
            if (detail?.close) { if (value.settingsSurface?.token === detail.token) publish({ settingsSurface: undefined }); return }
            if (detail?.bounds && typeof detail.section === 'string') publish({ settingsSurface: detail })
          }
          let workSession, unsubscribeWork = () => {}
          const workState = () => {
            const list = ctx.sessions.list.getSnapshot()
            const current = Object.values(list.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)
            const session = current && ctx.sessions.binding(current.id)?.session
            if (session !== workSession) {
              unsubscribeWork()
              workSession = session
              unsubscribeWork = session ? session.subscribe(workState) : () => {}
            }
            const live = session?.getSnapshot()
            const blank = live ? live.blank && live.pendingSubmissions.length === 0 && !live.running && !live.awaitingFirstTurn : current?.blank
            publish({ workLanding: current ? blank === true : list.phase === 'ready' })
          }
          const panel = () => {
            const { activePanelId } = ctx.layout.panelInfo.getSnapshot()
            // The layout subscription also fires when unrelated layout state changes.
            if (value.activePanelId === activePanelId) return
            const panelOpen = activePanelId !== null
            if (panelOpen) leaveBot()
            if (panelOpen && value.mode !== 'work') select('work')
            const route = enabled && panelOpen && Object.keys(workspacePanels).find(path => workspacePanels[path] === activePanelId)
            const leavingPanel = value.workspaceNative && !panelOpen && value.activePanelId && value.workspacePath !== '/multi-agent-chat'
            publish({ panelOpen, activePanelId, ...(route ? { workspacePath: route, workspaceNative: true } :
              leavingPanel ? { workspacePath: '/', workspaceNative: false } : panelOpen ? { workspacePath: undefined, workspaceNative: false } : {}) })
          }
          const unsubscribe = ctx.layout.panelInfo.subscribe(panel)
          let stopBot = () => {}, stopBotSlots = () => {}
          if (enabled) {
            const source = createBotNavigation(ctx.slots)
            let entry
            const attachBot = () => {
              const next = source.snapshot()
              if (entry === next) return
              stopBot(); stopBot = () => {}; entry = next
              const bot = readBotReturn(entry)
              if (!bot) {
                // An unloaded plugin yields its route back to the bundled page.
                if (isNativeBot()) publish({ workspaceNative: false })
                return
              }
              const syncSurface = () => {
                if (bot.snapshot() === 'bot') {
                  closePanel()
                  publish({ mode: 'work', workspacePath: '/multi-agent-chat', workspaceNative: true })
                } else if (isNativeBot()) {
                  publish({ workspacePath: '/', workspaceNative: false })
                }
              }
              // Discovery can finish after a user has opened a page. A restored
              // plugin surface must not replace that page or its active panel.
              if (bot.snapshot() === 'bot' && !isNativeBot()) bot.back()
              else syncSurface()
              stopBot = bot.subscribe(syncSurface)
            }
            stopBotSlots = source.subscribe(attachBot)
            attachBot()
          }
          const unsubscribeSessions = ctx.sessions.list.subscribe(workState)
          const unsubscribeChat = window.dshEnterpriseChat?.subscribe?.((next) => {
            revision++
            applyState(next)
          })
          workState(); panel()
          window.addEventListener('dsh-desktop:enterprise-account-changed', account)
          window.addEventListener('dsh-desktop:settings-visibility', settings)
          window.addEventListener('dsh-desktop:approvals-visibility', approvals)
          window.addEventListener('dsh-desktop:account-dialog-visibility', accountDialog)
          window.addEventListener('dsh-desktop:settings-surface', settingsSurface)
          window.addEventListener('focus', sync)
          document.addEventListener('visibilitychange', visibility)
          void sync()
          return () => {
active = false; deletion.reset(); revision++; historyRequest++; unsubscribe(); unsubscribeSessions(); unsubscribeWork(); unsubscribeChat?.()
            stopBot(); stopBotSlots()
            window.removeEventListener('dsh-desktop:enterprise-account-changed', account)
            disposeNavigation()
            if (revealWorkSession && ctx.uiWorkspace.openSession === revealWorkSession) ctx.uiWorkspace.openSession = originalOpenSession
            window.removeEventListener('dsh-desktop:settings-visibility', settings)
            window.removeEventListener('dsh-desktop:approvals-visibility', approvals)
            window.removeEventListener('dsh-desktop:account-dialog-visibility', accountDialog)
            window.removeEventListener('dsh-desktop:settings-surface', settingsSurface)
            window.removeEventListener('focus', sync)
            document.removeEventListener('visibilitychange', visibility)
          }
        }
      }
    }
    /** Cloud rows use the same title reveal speed and geometry as Harness sessions. */
    function CloudHistoryRow({ item, selected, navigation, t, deleteText }) {
      const [menuOpen, setMenuOpen] = React.useState(false)
      const title = React.useRef(null)
      const frame = React.useRef(0)
      const reset = () => {
        cancelAnimationFrame(frame.current)
        if (title.current) title.current.scrollLeft = 0
      }
      React.useEffect(() => reset, [item.title])
      React.useEffect(() => {
        if (!menuOpen) return
        // Clicking into the native Chat view blurs this document without a pointer event.
        const close = () => setMenuOpen(false)
        window.addEventListener('blur', close)
        return () => window.removeEventListener('blur', close)
      }, [menuOpen])
      const reveal = () => {
        reset()
        const element = title.current
        const distance = element.scrollWidth - element.clientWidth
        if (distance <= 8) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { element.scrollLeft = distance; return }
        let start
        const tick = (now) => {
          start ??= now
          element.scrollLeft = Math.min(distance, (now - start) * .03)
          if (element.scrollLeft < distance) frame.current = requestAnimationFrame(tick)
        }
        frame.current = requestAnimationFrame(tick)
      }
      return React.createElement('div', { className: 'dshCloudHistoryRow' },
        React.createElement('button', { type: 'button', 'data-history-kind': 'chat', className: 'dshHistoryRow', 'aria-current': selected ? 'page' : undefined,
        title: item.title, onClick: () => navigation.open(item.id), onPointerEnter: reveal, onPointerLeave: reset, onFocus: reveal, onBlur: reset },
        React.createElement('span', { ref: title }, item.title || t('newChat')),
        React.createElement('time', { dateTime: new Date(item.updatedAt).toISOString() }, historyTime(item.updatedAt, t))),
        React.createElement(Menu, {
          open: menuOpen, onClose: () => setMenuOpen(false), portal: true, align: 'end', autoFocus: true, dense: true,
          anchor: React.createElement('button', { type: 'button', className: 'dshCloudHistoryActions', 'aria-label': deleteText('actions'), 'aria-haspopup': 'menu', 'aria-expanded': menuOpen, onClick: () => setMenuOpen(open => !open) }, '⋯')
        }, React.createElement(MenuItemButton, {
          danger: true, onSelect: () => {
            const epoch = navigation.snapshot().epoch
            setMenuOpen(false)
            setTimeout(() => navigation.requestDelete(item.id, item.title || t('newChat'), epoch), 0)
          }
        }, deleteText('menu'))))
    }
    /** Cloud identities stay namespaced; project ownership is projected by Harness. */
    function SharedCollection({ projects, items, mode, query, archivedOnly, searchPending = false, navigation, botNavigation, t, deleteText }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const hiddenWorkspaceId = useHiddenBotWorkspace(botNavigation, mode === 'projects' && typeof window.dshDesktop?.restartHarness === 'function')
      const initialHistoryLoading = state.historyPhase === 'loading' && state.page === 0
      const resultsPending = initialHistoryLoading || (mode === 'search' && searchPending)
      const search = query.trim().toLocaleLowerCase()
      const local = items.map(item => ({ ...item, key: `work:${item.id}`, kind: 'work' }))
      const cloud = archivedOnly ? [] : state.items.filter(item => (item.title || t('newChat')).toLocaleLowerCase().includes(search))
        .map(item => ({ ...item, key: `chat:${item.id}`, kind: 'chat', updatedAt: Date.parse(item.updatedAt) || 0 }))
      const rows = [...local, ...cloud].sort((a, b) => Number(!!b.blank) - Number(!!a.blank) || Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt || a.key.localeCompare(b.key))
      return React.createElement('div', { className: 'dshSharedCollection', 'data-mode': state.mode },
        projects(state.mode === 'work', hiddenWorkspaceId),
        React.createElement(ListSection, {
          className: 'dshRecentHistory',
          'aria-label': t(mode === 'projects' ? 'recent' : mode === 'search' ? 'results' : 'all'),
          headingClassName: 'dshHistoryHeading',
          heading: React.createElement('span', null, t(mode === 'projects' ? 'recent' : mode === 'search' ? 'results' : 'all')),
          after: React.createElement(React.Fragment, null,
            state.historyPhase === 'error' && React.createElement('button', { type: 'button', className: 'dshHistoryNotice', onClick: () => navigation.refreshHistory() }, t('historyError')),
            initialHistoryLoading && React.createElement('div', { className: 'dshHistoryNotice', role: 'status' }, t('historyLoading')),
            rows.length === 0 && !resultsPending && React.createElement('div', { className: 'dshHistoryNotice' }, t(search ? 'recentSearchEmpty' : 'recentEmpty')),
            state.hasMore && !archivedOnly && React.createElement('button', { type: 'button', className: 'dshHistoryNotice', disabled: state.historyPhase === 'loading', onClick: () => navigation.refreshHistory(true) }, t('more')))
        }, rows.map(item => item.kind === 'work'
          ? React.createElement('div', { key: item.key, 'data-history-kind': 'work' }, item.render(state.mode === 'work'))
          : React.createElement(CloudHistoryRow, { key: item.key, item, selected: state.mode === 'chat' && !state.pageId && state.conversationId === item.id, navigation, t, deleteText }))))
    }
    function historyTime(date, t) {
      const time = new Date(date).getTime()
      if (!Number.isFinite(time)) return ''
      const elapsed = Date.now() - time
      if (elapsed >= 0 && elapsed < 60000) return t('justNow')
      return new Date(time).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
    }
    /**
     * Modal surfaces take over the content area. Sidebar menus and tooltips
     * share it with Chat by fitting beside the native view.
     */
    function observeHostOverlays(report) {
      // Both steps of the Bot creation flow must remain above the native
      // enterprise view, even though the plugin doesn't set aria-modal.
      const botDialog = '.bt-pane > :is(.bt-newchat, .bt-create)[role="dialog"]'
      const dialogSelector = `[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"], dialog[open], ${botDialog}`
      // Some Harness builds bundle HoverCard before the marker patch is applied.
      const hoverCard = ':is([data-dsh-hover-card], [style*="--dsh-hover-preview-fade:"])'
      const floatingSelector = `body > :is([role="menu"], [role="tooltip"][data-portal], ${hoverCard}), :is([data-dsh-sidebar-root], .bt-leftcol) [role="tooltip"]`
      const offsetProperty = '--dsh-sidebar-overlay-offset'
      const verticalOffsetProperty = '--dsh-sidebar-overlay-offset-y'
      const offsets = new Map()
      let bounds
      let modalOpen = false
      let floatingRight = 0
      let disposed = false
      let scheduled = false
      const readModal = () => [...document.querySelectorAll(dialogSelector)].some(dialog =>
        dialog.checkVisibility({ checkVisibilityCSS: true }) &&
        (dialog.getAttribute('aria-modal') === 'true' || dialog.matches(`:modal, ${botDialog}`)))
      const fit = () => {
        let right = bounds?.x ?? 0
        const floating = bounds ? [...document.querySelectorAll(floatingSelector)] : []
        for (const element of offsets.keys()) {
          if (floating.includes(element)) continue
          element.style.removeProperty(offsetProperty)
          element.style.removeProperty(verticalOffsetProperty)
          offsets.delete(element)
          sizes.unobserve(element)
        }
        for (const element of floating) {
          if (!offsets.has(element)) sizes.observe(element)
          const previous = offsets.get(element) ?? { x: 0, y: 0 }
          let offset = 0
          let offsetY = 0
          if (element.checkVisibility({ checkVisibilityCSS: true })) {
            const rect = element.getBoundingClientRect()
            const top = rect.top - previous.y
            if (rect.width > 0 && rect.bottom - previous.y > bounds.y && top < bounds.y + bounds.height) {
              const submenus = [...element.querySelectorAll('[role="menu"]')].map(menu => menu.getBoundingClientRect())
              // Use CSS pixels so reading back a translated rectangle at fractional
              // zoom cannot repeatedly change the offset by a fraction of a pixel.
              const left = Math.round(Math.min(rect.left, ...submenus.map(menu => menu.left)) - previous.x)
              const end = Math.round(Math.max(rect.right, ...submenus.map(menu => menu.right)) - previous.x)
              // Leave room for the floating surface's shadow along the native edge.
              const availableRight = bounds.x - 8
              if (end > availableRight) {
                // The collapsed More menu opens to the right of its trigger.
                if (!element.classList.contains('dshNavigationFlyout')) {
                  offset = Math.min(0, Math.max(12 - left, Math.floor(availableRight - end)))
                }
                const wideSidebar = bounds.wideSidebar
                if (wideSidebar && element.matches(hoverCard) && left >= wideSidebar.right - 8 &&
                    left <= wideSidebar.right + 32 && rect.width <= wideSidebar.width - 16) {
                  offset = Math.floor(wideSidebar.right - 8 - end)
                  // Moving a row preview below the anchor keeps the hovered row hittable.
                  offsetY = top + 32 + rect.height <= window.innerHeight - 12 ? 32 : -Math.ceil(rect.height + 8)
                }
                right = Math.max(right, Math.ceil(end + offset + 8))
              }
            }
          }
          if (offset !== previous.x) {
            if (offset) element.style.setProperty(offsetProperty, `${offset}px`)
            else element.style.removeProperty(offsetProperty)
          }
          if (offsetY !== previous.y) {
            if (offsetY) element.style.setProperty(verticalOffsetProperty, `${offsetY}px`)
            else element.style.removeProperty(verticalOffsetProperty)
          }
          offsets.set(element, { x: offset, y: offsetY })
        }
        return right
      }
      const refresh = () => {
        if (disposed) return
        const open = readModal()
        const right = fit()
        if (open === modalOpen && right === floatingRight) return
        modalOpen = open
        floatingRight = right
        report()
      }
      const schedule = () => {
        if (disposed || scheduled) return
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          refresh()
        })
      }
      const sizes = new ResizeObserver(schedule)
      const body = new MutationObserver(schedule)
      body.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['role', 'aria-modal', 'open', 'hidden', 'style', 'class']
      })
      document.addEventListener('visibilitychange', schedule)
      modalOpen = readModal()
      return {
        isModalOpen: () => modalOpen,
        fitBeside(nextBounds) {
          bounds = nextBounds
          floatingRight = fit()
          return floatingRight
        },
        dispose() {
          disposed = true
          body.disconnect()
          sizes.disconnect()
          for (const element of offsets.keys()) {
            element.style.removeProperty(offsetProperty)
            element.style.removeProperty(verticalOffsetProperty)
          }
          document.removeEventListener('visibilitychange', schedule)
        }
      }
    }
    function HostedAppContent({ app, seat, sourcePath, t }) {
      const [command, setCommand] = React.useState('idle')
      const run = async (action) => {
        setCommand('pending')
        try { await action(); setCommand('idle') }
        catch { setCommand('error') }
      }
      const backLabel = /^\/(?:square|apps\/explore)(?:\/|$)/u.test(sourcePath ?? '') ? 'hostedAppBackToSquare' : 'hostedAppBack'
      return React.createElement(React.Fragment, null,
        React.createElement('header', { className: 'dshHostedAppHeader' },
          React.createElement(Button, { type: 'button', variant: 'outline', disabled: command === 'pending', onClick: () => { void run(() => window.dshEnterpriseChat.closeHostedApp()) } }, t(backLabel)),
          command === 'error' && React.createElement('span', { role: 'alert' }, t('hostedAppActionError'))),
        React.createElement('div', { ref: seat, className: 'dshModeBody' },
          app.phase === 'loading' && React.createElement('div', { className: 'dshChatStatus', role: 'status' }, t('hostedAppLoading')),
          app.phase === 'error' && React.createElement('div', { className: 'dshChatStatus' },
            React.createElement('p', { role: 'alert' }, t('hostedAppError')),
            React.createElement(Button, { type: 'button', variant: 'outline', disabled: command === 'pending', onClick: () => { void run(() => window.dshEnterpriseChat.retryHostedApp()) } }, t('hostedAppRetry')))))
    }

    function BotSidebarToggle({ slots, shortcuts, t }) {
      const name = 'sidebar.workspaces'
      const subscribe = React.useCallback(listener => slots.subscribe(name, listener), [slots])
      const snapshot = React.useCallback(() => slots.entries(name), [slots])
      const entries = React.useSyncExternalStore(subscribe, snapshot)
      const bot = React.useMemo(() => {
        if (!entries.length) return null
        const face = slots.entriesOfSlot(name)[0]?.inject?.()
        return typeof face?.actions?.surfaceMode === 'function' && face.actions.surfaceMode() === 'bot' &&
          typeof face.actions.setSidebarPref === 'function' && face.hooks?.sidebarPref && face.hooks?.frame && face.hooks?.ui ? face : null
      }, [entries, slots])
      return bot && React.createElement(BotSidebarButton, { bot, shortcuts, t })
    }

    // DS Bot 0.3.10 exposes its own preference and actions through its sidebar slot.
    function BotRailActions({ actions, t }) {
      const [seat, setSeat] = React.useState(null)
      React.useLayoutEffect(() => {
        let column
        const syncSeat = () => setSeat(column?.matches('[data-left="rail"]:not([data-leaving])')
          ? column.querySelector('.bt-rail-top') : null)
        const changes = new MutationObserver(syncSeat)
        const syncColumn = () => {
          changes.disconnect()
          column = document.body.querySelector(':scope > .bt-leftcol')
          if (column) changes.observe(column, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-left', 'data-leaving'] })
          syncSeat()
        }
        const mounts = new MutationObserver(records => {
          if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.matches?.('.bt-leftcol')))) syncColumn()
        })
        mounts.observe(document.body, { childList: true })
        syncColumn()
        return () => { mounts.disconnect(); changes.disconnect() }
      }, [])
      if (!seat) return null
      const { createPortal } = require('react-dom')
      return createPortal(React.createElement('div', { className: 'dshBotRailActions' },
        React.createElement('div', { className: 'dshBotRailBackSeat' }),
        React.createElement('button', { type: 'button', 'aria-label': t('create'), title: t('create'), onClick: () => actions.openNewChat('new') }, React.createElement(IconNewChatOutlineRegular, { size: 16, 'aria-hidden': true })),
        React.createElement('button', { type: 'button', 'aria-label': t('search'), title: t('search'), onClick: () => actions.openPalette() }, React.createElement(IconSearchOutlineRegular, { size: 16, 'aria-hidden': true }))), seat)
    }

    function BotSidebarButton({ bot, shortcuts, t }) {
      const { actions, hooks } = bot
      const preference = React.useSyncExternalStore(hooks.sidebarPref.subscribe, hooks.sidebarPref.getSnapshot)
      const frame = React.useSyncExternalStore(hooks.frame.subscribe, hooks.frame.getSnapshot)
      const readDrawer = () => hooks.ui.getSnapshot().leftDrawer === true
      const drawer = React.useSyncExternalStore(hooks.ui.subscribe, readDrawer)
      const canDock = frame.viewport >= frame.sidebarWidth + 420 // DS Bot's minimum conversation width
      const expanded = preference === 'open' && (canDock || drawer)
      const label = t(expanded ? 'collapse' : 'expand')
      const toggle = () => {
        actions.setSidebarPref(expanded ? 'rail' : 'open')
        actions.setLeftDrawer?.(!expanded && !canDock)
      }
      React.useLayoutEffect(() => {
        if (preference === 'hidden') actions.setSidebarPref('rail')
      }, [preference, actions])
      React.useEffect(() => {
        if (!shortcuts) return
        const onKeyDown = event => {
          if (event.defaultPrevented || event.isComposing || event.target?.closest?.('.xterm') ||
              document.querySelector('[aria-modal="true"], dialog:modal, #root[inert]')) return
          const binding = shortcuts.catalog.getSnapshot().find(row => row.id === 'sidebar.left.toggle')?.binding
          if (!binding || event.code !== binding.code || event.ctrlKey !== binding.modifiers.includes('control') ||
              event.altKey !== binding.modifiers.includes('alt') || event.shiftKey !== binding.modifiers.includes('shift') ||
              event.metaKey !== binding.modifiers.includes('meta')) return
          event.preventDefault()
          event.stopPropagation()
          if (!event.repeat) toggle()
        }
        // DS Bot listens on document capture for this same configured shortcut.
        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
      })
      const toggleButton = React.createElement('button', {
        type: 'button', 'data-dsh-bot-sidebar-toggle': '', 'aria-label': label, 'aria-expanded': expanded, title: label,
        style: { '--dsh-bot-sidebar-width': `${frame.sidebarWidth}px` },
        onMouseDown: drawer ? event => event.stopPropagation() : undefined,
        onClick: toggle
      }, React.createElement(IconPanelLeftOutlineRegular, { size: 16, 'aria-hidden': true }))
      return React.createElement(React.Fragment, null, toggleButton,
        typeof actions.openNewChat === 'function' && typeof actions.openPalette === 'function' && React.createElement(BotRailActions, { actions, t }))
    }

    function DesktopModes({ work, rightbarWidth, resizeHandle, navigation, services, t, locale, slots, shortcuts, botSidebarText }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const { mode, settingsOpen, settingsSurface } = state
      const workspaceView = Boolean(state.workspacePath && state.workspacePath !== '/chat' && !state.workspaceNative && !state.panelOpen)
      const workspaceDockOpen = mode === 'chat' && state.phase === 'ready' && state.workspaceDockOpen === true
      React.useEffect(() => navigation.start(), [navigation])
      const panel = React.useRef(null)
      const hostedSeat = React.useRef(null)
      const [animateWork, setAnimateWork] = React.useState(false)
      const tabs = React.useRef({})
      const surfaceOpen = settingsOpen || state.approvalsOpen || state.accountDialogOpen
      const hostedApp = mode === 'chat' && !surfaceOpen ? state.hostedApp : undefined
      const hostedAppSlug = hostedApp?.slug
      React.useEffect(() => {
        const bridge = window.dshEnterpriseChat
        if (!bridge) return
        const appRoot = document.getElementById('root')
        const modes = panel.current?.closest('.dshModes')
        const railSelector = '.bt-leftcol'
        let observedLeading
        let observedBotSidebar
        let railInset = 0
        let railFrame = null
        const rails = new Set()
        const present = () => {
          const botSidebar = document.body.querySelector(BOT_SIDEBAR_SELECTOR)
          if (botSidebar !== observedBotSidebar) {
            botSidebarState.disconnect()
            observedBotSidebar = botSidebar
            if (botSidebar) botSidebarState.observe(botSidebar, { attributes: true, attributeFilter: ['data-left', 'data-leaving', 'aria-hidden', 'hidden'] })
          }
          const botSidebarMode = botSidebar?.matches(':not([data-leaving]):not([aria-hidden="true"]):not([hidden])')
            ? botSidebar.dataset.left : undefined
          const botSidebarDocked = botSidebarMode === 'open' || botSidebarMode === 'rail'
          if (modes) {
            // Both tabs follow the outer rail's visual edge, including its
            // slide animation (which does not trigger ResizeObserver).
            const baseLeft = modes.getBoundingClientRect().left - railInset
            const railGap = Number.parseFloat(getComputedStyle(modes).getPropertyValue('--dsk-shell-column-gap'))
            let nextInset = 0
            for (const rail of rails) {
              // A DS Bot drawer overlays the card, rather than moving it.
              if (rail === botSidebar && !botSidebarDocked) continue
              const bounds = rail.getBoundingClientRect()
              if (!bounds.width || !bounds.height) continue
              nextInset = Math.max(nextInset, bounds.right + (Number.isFinite(railGap) ? railGap : 12) - baseLeft)
            }
            if (nextInset !== railInset) {
              railInset = nextInset
              if (railInset) modes.style.setProperty('--dsh-plugin-rail-inset', `${railInset}px`)
              else modes.style.removeProperty('--dsh-plugin-rail-inset')
            }
          }
          const rect = panel.current?.getBoundingClientRect()
          if (!rect) return
          const sidebar = document.querySelector('[data-dsh-sidebar-root]')
          // The preview is outside the grid. Give only the native view room for it.
          const preview = shellFrame?.hasAttribute('data-dsh-sidebar-preview') && sidebar?.closest('.pI_x6G_sidebarCol')
          // Reserve the final width while the compositor animates the preview.
          const sidebarRight = preview
            ? shellFrame.getBoundingClientRect().left + preview.offsetLeft + preview.offsetWidth
            : sidebar?.checkVisibility({ checkVisibilityCSS: true }) ? sidebar.getBoundingClientRect().right : 0
          // DS Bot folds the shell sidebar and portals its fixed-left replacement
          // to body. Its layout width stays stable during the slide-in animation.
          const botSidebarRight = botSidebarDocked ? botSidebar.getBoundingClientRect().width : 0
          const contentLeft = Math.max(rect.x, sidebarRight, botSidebarRight)
          // Native WebContentsView paints above DOM chrome regardless of z-index.
          // macOS moves the sidebar opener into this seat when the rail disappears.
          const leading = document.querySelector('[data-shell-leading]')
          if (leading !== observedLeading) {
            if (observedLeading) resize.unobserve(observedLeading)
            observedLeading = leading
            if (leading) resize.observe(leading)
          }
          const chrome = leading?.getBoundingClientRect()
          // Keep the title beside the native controls instead of adding a row.
          const baseX = chrome && chrome.bottom > rect.y && chrome.left < rect.right
            ? Math.max(contentLeft, chrome.right) : contentLeft
          const y = rect.y
          const remote = surfaceOpen && state.settingsProtocolVersion === 1 && settingsSurface
          const safeModePageOpen = document.documentElement.hasAttribute('data-dsh-safe-mode-page')
          const hostOverlayOpen = overlays.isModalOpen() || appRoot?.inert || document.documentElement.hasAttribute('data-dsh-about-open')
          const palette = hostPalette()
          const modesStyle = modes && typeof getComputedStyle === 'function' ? getComputedStyle(modes) : undefined
          // Keep the native view inside the skin card's inner corners.
          const radius = !workspaceDockOpen && modesStyle
            ? Math.max(0, Math.round((Number.parseFloat(modesStyle.borderTopLeftRadius) || 0) - (Number.parseFloat(modesStyle.borderTopWidth) || 0)))
            : 0
          const chatVisible = mode === 'chat' && !state.workspacePath && !surfaceOpen && !safeModePageOpen && !hostOverlayOpen && botSidebarMode !== 'drawer'
          const settingsVisible = remote && !hostOverlayOpen && state.connected && remote.bounds.width > 0 && remote.bounds.height > 0
          const wideSidebar = chatVisible && document.querySelector('[data-dsh-sidebar-root][data-dsh-sidebar-wide="true"]')?.getBoundingClientRect()
          const overlayBounds = settingsVisible ? remote.bounds : chatVisible ? { x: baseX, y, height: rect.height, wideSidebar } : undefined
          const floatingRight = overlays.fitBeside(overlayBounds)
          const x = Math.max(baseX, floatingRight)
          const remoteBounds = remote && { ...remote.bounds, x: Math.max(remote.bounds.x, floatingRight),
            width: Math.max(0, remote.bounds.width - Math.max(0, floatingRight - remote.bounds.x)) }
          const hostedRect = chatVisible ? hostedSeat.current?.getBoundingClientRect() : undefined
          if (hostedRect) panel.current.style.setProperty('--dsh-hosted-start-offset', `${x - rect.x}px`)
          void bridge.present({
            visible: remote ? settingsVisible && remoteBounds.width > 0 : chatVisible,
            ...(remote ? { settings: remote.section } : {}),
            ...(palette ? { palette } : {}),
            radius,
            bounds: remote ? remoteBounds : { x, y, width: Math.max(0, rect.right - x), height: Math.max(0, rect.height) },
            ...(hostedRect ? { hostedAppBounds: { x, y: hostedRect.y, width: Math.max(0, hostedRect.right - x), height: Math.max(0, hostedRect.height) } } : {}),
            theme: document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light',
            locale: locale.getSnapshot().active === 'zh' ? 'zh' : 'en'
          }).catch(() => {})
        }
        // The native view follows the host's modal interaction boundary.
        // Onboarding makes #root inert while its dialog lives in a body portal.
        const interaction = new MutationObserver(present)
        if (appRoot) interaction.observe(appRoot, { attributes: true, attributeFilter: ['inert'] })
        // About covers Chat and remote settings. The recovery page covers Chat only.
        interaction.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dsh-about-open', 'data-dsh-safe-mode-page'] })
        const resize = new ResizeObserver(present)
        const followRailMotion = () => {
          if (railFrame !== null) return
          railFrame = requestAnimationFrame(() => {
            railFrame = null
            present()
            if ([...rails].some(rail => rail.getAnimations?.().some(animation =>
              animation.pending || animation.playState === 'running'))) followRailMotion()
          })
        }
        const railMotionEvents = ['animationstart', 'transitionrun']
        const onRailMotion = event => {
          if (event.target === event.currentTarget) followRailMotion()
        }
        const observeRailMotion = (rail, observe) => {
          for (const event of railMotionEvents) {
            if (observe) rail.addEventListener(event, onRailMotion)
            else rail.removeEventListener(event, onRailMotion)
          }
        }
        const syncRails = () => {
          const current = new Set(document.querySelectorAll(railSelector))
          for (const rail of rails) {
            if (!current.has(rail)) {
              observeRailMotion(rail, false)
              resize.unobserve(rail)
              rails.delete(rail)
            }
          }
          for (const rail of current) {
            if (!rails.has(rail)) {
              resize.observe(rail)
              observeRailMotion(rail, true)
              rails.add(rail)
              followRailMotion()
            }
          }
          modes?.toggleAttribute('data-dsh-plugin-rail-inset', rails.size > 0)
        }
        const railMount = new MutationObserver(records => {
          const affectsRail = node => node.nodeType === 1 && (node.matches(railSelector) || node.querySelector(railSelector))
          if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(affectsRail))) {
            syncRails()
            present()
          }
        })
        railMount.observe(document.body, { childList: true, subtree: true })
        syncRails()
        if (modes) resize.observe(modes)
        if (panel.current) resize.observe(panel.current)
        if (hostedSeat.current) resize.observe(hostedSeat.current)
        const sidebar = document.querySelector('[data-dsh-sidebar-root]')
        if (sidebar) resize.observe(sidebar)
        const botSidebarState = new MutationObserver(present)
        // Watch the leading seat and the portalled sidebar without scanning the
        // conversation subtree or reacting to the temporary palette probe.
        const chromeLayout = new MutationObserver(records => {
          if (records.some(record => record.target !== document.body) ||
              document.body.querySelector(BOT_SIDEBAR_SELECTOR) !== observedBotSidebar) present()
        })
        const frame = panel.current?.closest('.dshModes')?.parentElement
        const shellFrame = frame?.closest('.pI_x6G_frame') ?? frame
        if (shellFrame) chromeLayout.observe(shellFrame, { childList: true, attributes: true, attributeFilter: ['data-sidebar-collapsed', 'data-dsh-sidebar-preview'] })
        chromeLayout.observe(document.body, { childList: true })
        const theme = new MutationObserver(present)
        theme.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
        const overlays = observeHostOverlays(present)
        const unsubscribeLocale = locale.subscribe(present)
        window.addEventListener('resize', present)
        present()
        return () => {
          railMount.disconnect()
          for (const rail of rails) observeRailMotion(rail, false)
          if (railFrame !== null) cancelAnimationFrame(railFrame)
          modes?.removeAttribute('data-dsh-plugin-rail-inset')
          if (railInset) modes?.style.removeProperty('--dsh-plugin-rail-inset')
          overlays.dispose(); interaction.disconnect(); resize.disconnect(); botSidebarState.disconnect(); chromeLayout.disconnect(); theme.disconnect(); unsubscribeLocale(); window.removeEventListener('resize', present)
        }
      }, [mode, state.workspacePath, surfaceOpen, hostedAppSlug, settingsSurface, state.connected, state.settingsProtocolVersion, workspaceDockOpen, locale])
      React.useEffect(() => () => {
        void window.dshEnterpriseChat?.present({ visible: false, bounds: { x: 0, y: 48, width: 0, height: 0 }, theme: 'light' }).catch(() => {})
      }, [])
      const showModePicker = !state.workspacePath && !settingsOpen && (mode === 'chat'
        ? !state.hostedApp && !state.pageId && state.conversationId === 'new' && state.landing !== false
        : state.nativeWork && state.workLanding && !state.panelOpen)
      const select = navigation.choose
      const keyDown = (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        setAnimateWork(false)
        const next = event.key === 'Home' ? 'chat' : event.key === 'End' ? 'work' : mode === 'chat' ? 'work' : 'chat'
        if (select(next)) tabs.current[next]?.focus()
      }
      return React.createElement('div', { className: 'dshModes', 'data-dsh-workspace-dock': workspaceDockOpen ? '' : undefined },
        !state.workspacePath && document.documentElement.dataset.platform === 'darwin' && slots.entriesOfSlot &&
          React.createElement(BotSidebarToggle, { slots, shortcuts, t: botSidebarText }),
        state.signInPromptOpen && React.createElement(Modal, {
          open: true, title: t('signInTitle'), closeLabel: t('close'), onClose: navigation.dismissSignIn,
          footer: React.createElement('div', { className: 'dshChatSignInActions' },
            React.createElement(Button, { type: 'button', variant: 'outline', onClick: navigation.dismissSignIn }, t('continueWork')),
            React.createElement(Button, { type: 'button', variant: 'primary', onClick: navigation.signIn }, t('signIn')))
        }, React.createElement('p', { className: 'dshChatSignInDescription' }, t('signInDescription'))),
        showModePicker && React.createElement('header', { className: 'dshModesHeader' },
          React.createElement('div', { role: 'tablist', 'aria-label': t('label'), className: 'dshModesTabs', onKeyDown: keyDown },
            ...['chat', 'work'].map((key) => React.createElement('button', { key, id: `dsh-mode-${key}`, type: 'button', role: 'tab', 'aria-selected': mode === key, 'aria-controls': `dsh-panel-${key}`, tabIndex: mode === key ? 0 : -1, ref: (node) => { tabs.current[key] = node }, onClick: (event) => { setAnimateWork(event.detail > 0 && key === 'work'); select(key) } }, t(key))))),
        React.createElement('section', { id: 'dsh-panel-work', role: 'tabpanel', 'aria-label': t('work'), hidden: workspaceView || (mode !== 'work' && !state.workspacePath), className: 'dshModeBody dshWorkContent', 'data-reveal-controls': animateWork, onTransitionEnd: event => { if (event.propertyName === 'clip-path') setAnimateWork(false) }, style: { '--dsh-work-rightbar-width': `${rightbarWidth ?? 0}px` } }, work, resizeHandle,
          services && mode === 'work' && state.workspacePath === '/chat' && state.nativeWork && !state.panelOpen &&
            React.createElement(WorkConversationPart, { component: 'WorkHistory', services, t, rightbarWidth })),
        workspaceView && React.createElement(WorkspaceView, { navigation, path: state.workspacePath, t }),
        React.createElement('section', { ref: panel, id: 'dsh-panel-chat', role: 'tabpanel', 'aria-label': t('chat'), hidden: mode !== 'chat' || Boolean(state.workspacePath), className: 'dshModeBody' },
          hostedApp ? React.createElement(HostedAppContent, { key: hostedAppSlug, app: hostedApp, seat: hostedSeat, sourcePath: state.path, t }) : React.createElement('div', { className: 'dshChatStatus', role: 'status' },
            React.createElement('p', null, state.phase === 'error' ? t('error') : state.phase === 'ready' ? '' : t('loading')),
            state.connected && state.phase === 'error' && React.createElement('button', { type: 'button', onClick: () => { void window.dshEnterpriseChat.retry().catch(() => {}) } }, t('retry')))))
    }
    const NAV_ICON_PATHS = {
      new: 'M12 20H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M16 16v6m-3-3h6M7 8h10M7 12h5',
      knowledge: 'M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 14h14M7 6h8',
      channel: 'M5 3h14v18l-7-4-7 4V3Zm7 3v8m-4-4h8',
      apps: 'M8 5V3h8v2M3 7h18v14H3V7Zm0 5h18M9 10v5h6v-5',
      tools: 'M14.7 6.3a5.5 5.5 0 0 0-7 7L3 18a2.1 2.1 0 0 0 3 3l4.7-4.7a5.5 5.5 0 0 0 7-7l-3.5 3.5-3-3 3.5-3.5Z',
      skills: 'M5 3h14v18H5V3Zm3 4h8M8 11h8M8 15h5',
      square: 'M3 4h6v6H3V4Zm12 0h6v6h-6V4ZM3 14h6v6H3v-6Zm12 0h6v6h-6v-6',
      reorder: 'M8 4v16m-3-3 3 3 3-3M16 20V4m-3 3 3-3 3 3',
      more: 'M5 12h.01M12 12h.01M19 12h.01'
    }
    function ResourceIcon({ id, size = 16 }) {
      return React.createElement(ReferenceIconRegular, { kind: { skills: 'skill', tools: 'tool', knowledge: 'folder' }[id], size })
    }
    function NavigationIcon({ id, size = 16 }) {
      return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: id === 'more' ? 3 : 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        React.createElement('path', { d: NAV_ICON_PATHS[id === 'capabilities' ? 'skills' : id] || NAV_ICON_PATHS.apps }))
    }
    function collapsedNavigationAnchor() {
      const rail = document.querySelector('[data-dsh-sidebar-root]')
      const trigger = rail?.querySelector('[data-navigation-id="more"]')
      if (!trigger) return null
      const bounds = trigger.getBoundingClientRect()
      return new DOMRect(rail.getBoundingClientRect().right, bounds.top, 0, bounds.height)
    }

    const BOT_FOOTER_SLOT = 'sidebar.footer.action'
    const BOT_RETURN_ID = 'bot-return'
    const BOT_SIDEBAR_SELECTOR = ':scope > .bt-leftcol[data-left]'
    const BOT_ACCOUNT_MENU_SELECTOR = ':scope > .bt-account-menu[role="menu"]'
    const BOT_MENU_HIDDEN = 'data-dsh-bot-menu-hidden'
    const EMPTY_BOT_SOURCE = { subscribe: () => () => {}, snapshot: () => undefined }
    function HiddenBotReturn() { return null }

    function createBotNavigation(slots) {
      const snapshot = () => slots.entries(BOT_FOOTER_SLOT).find(entry =>
        entry.options.id === BOT_RETURN_ID && entry.component !== HiddenBotReturn)
      return {
        snapshot,
        subscribe: listener => slots.subscribe(BOT_FOOTER_SLOT, listener),
        hideFooter: entry => slots.inject(BOT_FOOTER_SLOT, () => slots.register({
          name: BOT_FOOTER_SLOT, id: BOT_RETURN_ID, priority: (entry.options.priority ?? 0) - 1
        }, HiddenBotReturn))
      }
    }

    function readBotReturn(entry) {
      // DS Bot 0.3.9 exposes its surface and switch action through this registration.
      // Keep its own footer entry available if a later version changes that face.
      try {
        const face = entry?.inject?.()
        const surface = face?.hooks?.surface
        const roster = face?.hooks?.roster
        const actions = face?.actions
        if (typeof surface?.subscribe !== 'function' || typeof surface.getSnapshot !== 'function' || typeof actions?.setSurface !== 'function') return undefined
        const workspace = typeof roster?.subscribe === 'function' && typeof roster.getSnapshot === 'function'
          ? { subscribe: listener => roster.subscribe(listener), snapshot: () => roster.getSnapshot()?.workspaceId }
          : EMPTY_BOT_SOURCE
        return {
          subscribe: listener => surface.subscribe(listener),
          snapshot: () => surface.getSnapshot()?.mode,
          workspace,
          open: () => actions.setSurface('bot'),
          back: () => actions.setSurface('agent')
        }
      } catch (error) {
        console.warn('Could not read the DS Bot sidebar action', error)
        return undefined
      }
    }

    function useBotReturn(botNavigation = EMPTY_BOT_SOURCE) {
      const entry = React.useSyncExternalStore(botNavigation.subscribe, botNavigation.snapshot)
      const action = React.useMemo(() => readBotReturn(entry), [entry])
      return { entry, action }
    }

    function useHiddenBotWorkspace(botNavigation, enabled) {
      const { action } = useBotReturn(enabled ? botNavigation : undefined)
      const surface = action ?? EMPTY_BOT_SOURCE
      const workspace = action?.workspace ?? EMPTY_BOT_SOURCE
      const mode = React.useSyncExternalStore(surface.subscribe, surface.snapshot)
      const teamId = React.useSyncExternalStore(workspace.subscribe, workspace.snapshot)
      const candidate = mode === 'agent' && typeof teamId === 'string' && teamId ? teamId : undefined
      const [verified, setVerified] = React.useState(null)
      React.useEffect(() => {
        setVerified(null)
        if (!candidate) return
        const controller = new AbortController()
        void fetch('/api/desktop-ds-bot-workspace', { signal: controller.signal, cache: 'no-store' })
          .then(response => response.ok ? response.json() : null)
          .then(result => {
            if (!controller.signal.aborted && result?.workspaceId === candidate) setVerified({ action, id: candidate })
          })
          .catch(error => {
            if (!controller.signal.aborted) console.warn('Could not verify the desktop DS Bot workspace', error)
          })
        return () => controller.abort()
      }, [action, candidate])
      return verified?.action === action && verified?.id === candidate ? candidate : undefined
    }

    function useBotBackSeat(active) {
      const [seat, setSeat] = React.useState(null)
      React.useLayoutEffect(() => {
        if (!active) { setSeat(null); return }
        const root = document.getElementById('root')
        let column
        const columnObserver = new MutationObserver(sync)
        const bodyObserver = new MutationObserver(sync)
        function sync() {
          const current = document.body.querySelector(BOT_SIDEBAR_SELECTOR)
          if (current !== column) {
            columnObserver.disconnect()
            column = current
            if (column) columnObserver.observe(column, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-left', 'data-leaving', 'aria-hidden', 'hidden'] })
          }
          const visible = !root?.inert && column?.matches(':not([data-leaving]):not([aria-hidden="true"]):not([hidden])')
          const seat = visible ? column.querySelector(':scope > .bt-side > .bt-side-top > span.bt-brand, :scope > .bt-side > .bt-rail-top') : null
          setSeat(seat?.querySelector('.dshBotRailBackSeat') ?? seat)
        }
        bodyObserver.observe(document.body, { childList: true })
        if (root) bodyObserver.observe(root, { attributes: true, attributeFilter: ['inert'] })
        sync()
        return () => { bodyObserver.disconnect(); columnObserver.disconnect() }
      }, [active])
      return active ? seat : null
    }

    function findOldBotSwitch(menu, label) {
      // DS Bot 0.3.9 supplies no ID for this action. Require its localized label
      // and both paths of its switch glyph inside the account menu.
      const matches = [...(menu?.querySelectorAll(':scope > button[role="menuitem"]') ?? [])].filter(button =>
        button.querySelector(':scope > .bt-menu-label')?.textContent === label &&
        button.querySelector(':scope > svg:has(> path[d="M4 7h9.5M10.5 3.5L14 7l-3.5 3.5"]):has(> path[d="M16 13H6.5M9.5 9.5L6 13l3.5 3.5"])'))
      return matches.length === 1 ? matches[0] : undefined
    }

    function hideOldBotSwitch(backButton, label) {
      let menu, hiddenButton, restore
      const menuObserver = new MutationObserver(sync)
      const bodyObserver = new MutationObserver(sync)
      function sync() {
        const menus = document.body.querySelectorAll(BOT_ACCOUNT_MENU_SELECTOR)
        const current = menus.length === 1 ? menus[0] : undefined
        if (menu !== current) {
          menuObserver.disconnect()
          menu = current
          if (menu) menuObserver.observe(menu, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['d', 'role', 'class'] })
        }
        const button = backButton.isConnected && backButton.checkVisibility() ? findOldBotSwitch(menu, label) : undefined
        if (button === hiddenButton) return
        restore?.()
        restore = undefined
        hiddenButton = button
        if (!button) return
        const separator = button.previousElementSibling
        const spacer = separator?.matches('.bt-menu-sep[role="separator"]') ? separator : undefined
        const previousDisabled = button.disabled
        const hadFocus = document.activeElement === button
        // DS Bot's Arrow/Home/End handling enumerates enabled buttons.
        button.disabled = true
        button.setAttribute(BOT_MENU_HIDDEN, '')
        spacer?.setAttribute(BOT_MENU_HIDDEN, '')
        if (hadFocus) menu.querySelector(':scope > button[role="menuitem"]:not(:disabled)')?.focus()
        restore = () => {
          button.disabled = previousDisabled
          button.removeAttribute(BOT_MENU_HIDDEN)
          spacer?.removeAttribute(BOT_MENU_HIDDEN)
        }
      }
      bodyObserver.observe(document.body, { childList: true })
      sync()
      return () => { bodyObserver.disconnect(); menuObserver.disconnect(); restore?.() }
    }

    function BotSidebarBackButton({ action, t, botText }) {
      const mode = React.useSyncExternalStore(action.subscribe, action.snapshot)
      const seat = useBotBackSeat(mode === 'bot')
      const button = React.useRef(null)
      const oldLabel = botText('Classic Agent mode')
      React.useLayoutEffect(() => {
        if (seat && button.current && typeof oldLabel === 'string') return hideOldBotSwitch(button.current, oldLabel)
      }, [seat, oldLabel])
      if (!seat) return null
      const label = t('botBackToAgent')
      const rail = seat.closest('.bt-rail-top') !== null
      const brand = seat.firstElementChild
      // The 0.3.9 title is a plain span. A different title shape keeps its plugin rendering.
      const showTitle = !rail && brand?.matches('span:not([class])') && brand.textContent === 'DS Bot'
      const back = React.createElement('button', {
        ref: button, type: 'button', className: 'dshBotSidebarBack', 'aria-label': label, title: label, onClick: action.back
      }, React.createElement(IconChevronLeftOutlineRegular, { size: 16 }), rail ? null : t('botBack'))
      return require('react-dom').createPortal(React.createElement(React.Fragment, null, back,
        showTitle && React.createElement('span', { className: 'dshBotSidebarTitle' }, t('multiAgentCollaboration'))), seat)
    }

    function BotSidebarBack({ botNavigation, t, botText }) {
      const { action } = useBotReturn(botNavigation)
      return action ? React.createElement(BotSidebarBackButton, { action, t, botText }) : null
    }

    const NAVIGATION_ORDER_KEY = 'dsh-desktop-navigation-order'
    const VISIBLE_NAVIGATION_COUNT = 5

    function readNavigationOrder() {
      try {
        const value = JSON.parse(window.localStorage.getItem(NAVIGATION_ORDER_KEY) || '[]')
        return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && (id === BOT_RETURN_ID || /^(web|local):.+/.test(id))))] : []
      } catch {
        console.warn('[desktop-navigation] Could not read saved order; using the default order')
        return []
      }
    }

    function orderNavigationItems(items, order) {
      const remaining = new Map(items.map(item => [item.id, item]))
      const sorted = []
      for (const id of order) {
        if (!remaining.has(id)) continue
        sorted.push(remaining.get(id))
        remaining.delete(id)
      }
      return [...sorted, ...remaining.values()]
    }

    function NavigationOrderDialog({ items, order, onSave, onClose, t }) {
      const [draft, setDraft] = React.useState(() => items.map(item => item.id))
      const [error, setError] = React.useState(null)
      const [dropTarget, setDropTarget] = React.useState(null)
      const dragged = React.useRef(null)
      const sorted = orderNavigationItems(items, draft)
      const move = (id, target) => {
        const ids = sorted.map(item => item.id)
        const from = ids.indexOf(id)
        if (from < 0 || target < 0 || target >= ids.length || from === target) return
        ids.splice(from, 1)
        ids.splice(target, 0, id)
        setDraft(ids)
      }
      const save = () => {
        const ids = sorted.map(item => item.id)
        const next = [...ids, ...order.filter(id => !ids.includes(id))]
        try {
          window.localStorage.setItem(NAVIGATION_ORDER_KEY, JSON.stringify(next))
          onSave(next)
        } catch {
          setError(t('navigationOrderError'))
        }
      }
      return React.createElement(Modal, {
        open: true, title: t('reorderNavigation'), description: t('navigationOrderDescription'), closeLabel: t('close'), onClose,
        className: 'dshNavigationOrderDialog',
        footer: React.createElement('div', { className: 'dshChatSignInActions' },
          React.createElement(Button, { variant: 'outline', onClick: onClose }, t('navigationOrderCancel')),
          React.createElement(Button, { variant: 'primary', onClick: save }, t('navigationOrderSave')))
      },
      React.createElement('ol', { className: 'dshNavigationOrderList', 'aria-label': t('reorderNavigation'), 'aria-live': 'polite' },
        sorted.map((item, index) => React.createElement('li', {
          key: item.id, draggable: true, 'data-navigation-order-id': item.id, 'data-drop-target': dropTarget === item.id,
          onDragStart: event => { dragged.current = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id) },
          onDragEnd: () => { dragged.current = null; setDropTarget(null) },
          onDragOver: event => { if (!sorted.some(entry => entry.id === dragged.current)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(item.id) },
          onDrop: event => { event.preventDefault(); move(dragged.current, index); dragged.current = null; setDropTarget(null) }
        },
        React.createElement('span', { className: 'dshNavigationOrderGrip', 'aria-hidden': true }, '⠿'),
        React.createElement('span', { className: 'dshNavigationOrderLabel' }, item.label),
        React.createElement('span', { className: 'dshNavigationOrderPlacement' }, t(index < VISIBLE_NAVIGATION_COUNT ? 'navigationDirect' : 'navigationOverflow')),
        React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: index === 0, 'aria-label': `${t('navigationMoveUp')}: ${item.label}`, onClick: () => move(item.id, index - 1) }, '↑'),
        React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: index === sorted.length - 1, 'data-modal-autofocus': index === 0 && sorted.length > 1 ? '' : undefined, 'aria-label': `${t('navigationMoveDown')}: ${item.label}`, onClick: () => move(item.id, index + 1) }, '↓')))),
      error && React.createElement('p', { role: 'alert' }, error))
    }

    const WORKSPACE_CHROME_NS = 'desktop.workspaceChrome'
    const WORKSPACE_CHROME_COPY = {
      zh: {
        home: '总览', chat: 'AI 对话', 'multi-agent-chat': '多代理协作', 'ai-chat': '代码工作台',
        'ai-image-generation': '图像生成', 'ai-profile': 'AI 活动档案', 'project-board': '任务看板',
        lab: '组件实验室', charts: '数据图表', icons: '图标库', templates: '整页模板', admin: 'AI 管理后台',
        components: 'AI 组件目录', settings: '设置', model: '模型连接', harness: '任务执行台',
        'templates/dashboard': '通用仪表盘', 'templates/marketing': '营销分析', 'templates/finance': '财务分析',
        'templates/hr': '人力资源', 'templates/medical-profile': '健康档案',
        toolbar: '桌面窗口工具栏', expand: '展开导航栏', collapse: '收起导航栏', workspace: '工作台',
        navigation: '工作台导航', quickNavigation: '工作台快捷导航', spaces: '工作空间', library: '组件与管理',
        componentLibrary: 'LUOKUI-AI 组件库', viewAll: '查看全部', views: '工作区视图',
        dark: '切换深色模式', light: '切换浅色模式', native: '桌面会话与插件', unavailable: '工作台导航加载失败'
      },
      en: {
        home: 'Overview', chat: 'AI chat', 'multi-agent-chat': 'Multi-agent chat', 'ai-chat': 'Code workspace',
        'ai-image-generation': 'Image generation', 'ai-profile': 'AI activity', 'project-board': 'Task board',
        lab: 'Component lab', charts: 'Charts', icons: 'Icons', templates: 'Page templates', admin: 'AI administration',
        components: 'AI components', settings: 'Settings', model: 'Model connection', harness: 'Task console',
        'templates/dashboard': 'Dashboard', 'templates/marketing': 'Marketing analytics', 'templates/finance': 'Financial analytics',
        'templates/hr': 'Human resources', 'templates/medical-profile': 'Health profile',
        toolbar: 'Desktop toolbar', expand: 'Expand navigation', collapse: 'Collapse navigation', workspace: 'Workspace',
        navigation: 'Workspace navigation', quickNavigation: 'Quick navigation', spaces: 'Workspace', library: 'Components & management',
        componentLibrary: 'LUOKUI-AI library', viewAll: 'View all', views: 'Workspace views',
        dark: 'Switch to dark mode', light: 'Switch to light mode', native: 'Desktop sessions and plugins', unavailable: 'Workspace navigation could not load'
      }
    }

    function WorkspaceChromeMount({ navigation, theme, shortcuts, expandBotSidebar, t }) {
      const { workspacePath, workspaceNative } = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const [result, setResult] = React.useState(null)
      React.useEffect(() => {
        let active = true
        import('/desktop-workspace/workspace-chrome.js').then(module => {
          if (active) setResult({ Chrome: module.createWorkspaceChrome(React, loadWorkspacePages) })
        }, error => {
          console.error('[desktop-workspace] Loading navigation failed', error)
          if (active) setResult({ failed: true })
        })
        return () => { active = false }
      }, [])
      if (!workspacePath || !result) return null
      if (result.failed) return React.createElement('button', { type: 'button', className: 'dshWorkspaceRecoveryButton',
        title: t('unavailable'), onClick: navigation.openDesktop }, t('native'))
      return React.createElement(result.Chrome, { path: workspacePath.split(/[?#]/u, 1)[0], native: workspaceNative === true, navigation, theme, shortcuts, expandBotSidebar, t })
    }

    function PrimaryNavigation({ wide, renderAction, panels, selectPanel, renderPanelIcon, navigation, botNavigation, t, workspaceHome }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const { entry: botEntry, action: botAction } = useBotReturn(botNavigation)
      const botSurface = botAction ?? EMPTY_BOT_SOURCE
      const botMode = React.useSyncExternalStore(botSurface.subscribe, botSurface.snapshot)
      const botVisible = Boolean(botEntry && botAction && botMode === 'agent')
      const [menuOpen, setMenuOpen] = React.useState(false)
      const [nativeMenuOpen, setNativeMenuOpen] = React.useState(false)
      const pendingMenu = React.useRef(null)
      const [order, setOrder] = React.useState(readNavigationOrder)
      const [sorting, setSorting] = React.useState(null)
      React.useLayoutEffect(() => {
        if (botVisible) return botNavigation.hideFooter(botEntry)
      }, [botNavigation, botEntry, botVisible])
      React.useEffect(() => { setMenuOpen(false); setSorting(null) }, [state.epoch, state.connected])
      React.useEffect(() => { setMenuOpen(false) }, [wide])
      React.useEffect(() => () => { pendingMenu.current = null }, [])
      React.useEffect(() => {
        if (!menuOpen) return
        // Electron's embedded Chat view takes focus without an iframe in this document.
        // Menu already handles outside pointer clicks in the Harness document.
        const close = () => setMenuOpen(false)
        window.addEventListener('blur', close)
        return () => window.removeEventListener('blur', close)
      }, [menuOpen])
      const entries = state.connected ? state.navigation?.entries || [] : []
      const activeId = state.mode === 'chat' ? entries.find(entry => entry.active)?.id : undefined
      const plugins = panels.find(panel => panel.id === 'plugins')
      const morePanels = panels.filter(panel => panel.id !== 'plugins')
      const items = orderNavigationItems([
        ...entries.map(entry => ({ id: `web:${entry.id}`, label: entry.label, icon: React.createElement(NavigationIcon, { id: entry.id }) })),
        ...morePanels.map(panel => ({ id: `local:${panel.id}`, label: panel.label, icon: renderPanelIcon(panel.id) })),
        ...(botVisible ? [{ id: BOT_RETURN_ID, label: t('multiAgentCollaboration'), icon: React.createElement(IconUsersOutlineRegular, { size: wide ? 16 : 18 }) }] : [])
      ], order)
      const visible = items.slice(0, VISIBLE_NAVIGATION_COUNT)
      const overflow = items.slice(VISIBLE_NAVIGATION_COUNT)
      const selectedId = activeId ? `web:${activeId}` : state.mode === 'work' && state.activePanelId ? `local:${state.activePanelId}` : undefined
      const openItem = id => {
        setMenuOpen(false)
        if (id === BOT_RETURN_ID) botAction?.open()
        else if (id.startsWith('web:')) void navigation.openPage(id.slice(4))
        else { navigation.select('work'); selectPanel(id.slice(6)) }
      }
      const menuItems = [...overflow, { id: 'reorder', label: t('reorderNavigation'), icon: React.createElement(NavigationIcon, { id: 'reorder' }) }]
      const selectMenuItem = id => {
        if (id === 'reorder') { setMenuOpen(false); setSorting({}) } else openItem(id)
      }
      const popupSidebarMenu = !wide && state.mode === 'chat' && state.connected && window.dshEnterpriseChat?.popupSidebarMenu
      const toggleMore = async () => {
        if (!popupSidebarMenu) { setMenuOpen(open => !open); return }
        const anchor = collapsedNavigationAnchor()
        if (!anchor || pendingMenu.current) return
        const request = { x: anchor.right + 4, y: anchor.top, labels: menuItems.map(item => item.label) }
        pendingMenu.current = request
        setNativeMenuOpen(true)
        try {
          const index = await popupSidebarMenu(request)
          const current = navigation.snapshot()
          if (pendingMenu.current === request && current.epoch === state.epoch && current.mode === 'chat' && current.connected && index !== null) {
            const item = menuItems[index]
            if (item) selectMenuItem(item.id)
          }
        } catch (error) {
          console.warn('[desktop-navigation] Could not open the sidebar menu', error)
        } finally {
          if (pendingMenu.current === request) {
            pendingMenu.current = null
            setNativeMenuOpen(false)
          }
        }
      }
      return React.createElement('nav', { className: 'dshPrimaryNavigation', 'data-wide': wide, 'aria-label': t('navigation') },
        workspaceHome && renderAction({ id: 'workspace-home', label: workspaceHome, icon: BishengMark(), onClick: () => navigation.navigate('/') }),
        plugins && renderAction({ id: plugins.id, label: plugins.label, icon: renderPanelIcon(plugins.id), active: state.mode === 'work' && state.activePanelId === plugins.id, onClick: () => { setMenuOpen(false); navigation.select('work'); selectPanel(plugins.id) } }),
        visible.map(item => React.createElement(React.Fragment, { key: item.id }, renderAction({ ...item, active: item.id === selectedId, onClick: () => openItem(item.id) }))),
        items.length > 0 && React.createElement(Menu, {
          open: !popupSidebarMenu && menuOpen, onClose: () => setMenuOpen(false), items: menuItems, autoFocus: true, dense: true,
          portal: !wide, side: wide ? 'bottom' : 'right', getAnchorRect: wide ? undefined : collapsedNavigationAnchor,
          className: 'dshNavigationMenu', listClassName: wide ? 'dshNavigationMenuList' : 'dshNavigationFlyout',
          selectedId,
          onSelect: selectMenuItem,
          anchor: renderAction({ id: 'more', label: t('moreNavigation'), icon: React.createElement(NavigationIcon, { id: 'more' }), active: overflow.some(item => item.id === selectedId), expanded: menuOpen || nativeMenuOpen, onClick: toggleMore })
        }),
        sorting && React.createElement(NavigationOrderDialog, { items, order, t, onClose: () => setSorting(null), onSave: next => { setOrder(next); setSorting(null) } }))
    }
    // Work overlays use viewport coordinates. Isolate stacking while keeping
    // their fixed-position containing block attached to the viewport.
    function installDesktopModes(ctx, services) {
      const navigation = createChatNavigation(ctx)
      const botNavigation = createBotNavigation(ctx.slots)
      const workspaceEnabled = Boolean(navigation.snapshot().workspacePath)
      if (workspaceEnabled) {
        ctx.effect(() => ctx.locale.register(WORKSPACE_CHROME_NS, WORKSPACE_CHROME_COPY))
        const theme = {
          subscribe: listener => ctx.on('theme/change', listener),
          snapshot: () => ctx.theme.getTheme().active.colorScheme,
          set: id => ctx.theme.setTheme(id)
        }
        // DS Bot can restore its previous stand-alone rail. An expanded
        // workspace uses that plugin's own navigation rows and resize state.
        const expandBotSidebar = () => {
          try {
            const entry = ctx.slots.entriesOfSlot?.('sidebar.workspaces')?.[0]
            const face = entry?.inject?.()
            if (face?.actions?.surfaceMode?.() !== 'bot' || !face.hooks?.sidebarPref) return
            if (face.hooks.sidebarPref.getSnapshot() !== 'open') face.actions.setSidebarPref?.('open')
          } catch (error) {
            // A replaced or unloading optional plugin can lose its slot face.
            console.warn('[desktop-workspace] Could not expand agent navigation', error)
          }
        }
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay', id: 'desktop-workspace-chrome', locale: WORKSPACE_CHROME_NS,
          inject: () => ({ navigation, theme, shortcuts: ctx.get?.('shortcuts'), expandBotSidebar, t: ctx.locale.bind(WORKSPACE_CHROME_NS) })
        }, WorkspaceChromeMount))
      }
      ctx.effect(() => () => navigation.deletion.dispose())
      ctx.effect(() => ctx.locale.register(MODES_NS, MODES_COPY), 'desktop: Chat and Work locale')
      ctx.effect(() => ctx.locale.register(BOT_SIDEBAR_NS, BOT_SIDEBAR_COPY))
      ctx.effect(() => ctx.locale.register(CLOUD_DELETE_NS, CLOUD_DELETE_COPY))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'desktop-cloud-chat-delete-dialog', locale: CLOUD_DELETE_NS,
        inject: () => ({ deletion: navigation.deletion, t: ctx.locale.bind(CLOUD_DELETE_NS) })
      }, DeleteSessionDialog))
      if (typeof window.dshDesktop?.restartHarness === 'function') {
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay', id: 'desktop-bot-sidebar-back', locale: MODES_NS,
          inject: () => ({ botNavigation, botText: ctx.locale.bind('ds-bot') })
        }, BotSidebarBack))
      }
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-desktop-client-ui'
        style.textContent = `
          .dshPrimaryNavigation{display:flex;flex-direction:column;flex:none;gap:4px;padding:0 0 12px}
          .dshPrimaryNavigation[data-wide=false]{gap:12px}
          .dshBotSidebarBack{display:inline-flex;align-items:center;justify-content:center;gap:4px;flex:none;padding:4px 6px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;-webkit-app-region:no-drag}
          .dshBotSidebarBack:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
          .bt-rail-top .dshBotSidebarBack{width:36px;height:36px;border-radius:var(--dsw-radius-md)}
          .dshBotSidebarBack:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
          .bt-side-top>span.bt-brand:has(>.dshBotSidebarTitle)>span:first-child:not([class]){display:none}
          .dshBotSidebarTitle{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:14px}
          .bt-account-menu>[data-dsh-bot-menu-hidden]{display:none!important}
          .dshNavigationMenu{display:flex;flex-direction:column;position:relative;width:100%}.dshNavigationMenu .dshNavigationMenuList{width:100%;min-width:0;max-width:100%;box-sizing:border-box}
          .dshNavigationOrderList{list-style:none;margin:0;padding:0;max-height:55vh;overflow:auto}
          .dshNavigationOrderList li{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid transparent;border-radius:8px;cursor:grab;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
          .dshNavigationOrderList li+li{margin-top:4px}
          .dshNavigationOrderList li[data-drop-target=true]{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}
          .dshNavigationOrderLabel{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .dshNavigationOrderGrip,.dshNavigationOrderPlacement{color:var(--dsw-alias-label-secondary);font-size:12px;flex:none}
          .dshModes{grid-column:2 / -1;min-width:0;min-height:0;width:100%;height:100%;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
          .dshModesHeader{height:56px;flex:none;display:flex;align-items:center;justify-content:center}
          html[data-platform=darwin] .dshModesHeader{-webkit-app-region:drag}
          .dshModesTabs{display:flex;padding:3px;border-radius:24px;background:var(--dsw-alias-bg-layer-2);-webkit-app-region:no-drag}
          html[data-platform=darwin] body[data-dsh-desktop-ui=dsh] .dshModesHeader + .dshWorkContent [data-sidebar-right-expand] {
            position: fixed;
            inset-block-start: 14px;
            inset-inline-end: 12px;
            z-index: 2;
            min-block-size: 24px;
            -webkit-app-region: no-drag;
          }
          .dshModesTabs button{font:inherit;font-size:13px;min-width:96px;height:30px;padding:0 20px;border:0;border-radius:20px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;-webkit-app-region:no-drag}
          .dshModesTabs button[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}
          .dshModes button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
          .dshModeBody{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}.dshModeBody[hidden]{display:none}
          [style*="--dsh-sidebar-overlay-offset:"] { translate: var(--dsh-sidebar-overlay-offset) var(--dsh-sidebar-overlay-offset-y, 0px); }
          body[data-dsh-desktop-ui="dsh"] [role="tooltip"][data-side] {
            --dsw-alias-tooltip-bg: var(--dsw-alias-bg-layer-1);
            --dsw-alias-tooltip-key-bg: var(--dsw-alias-bg-layer-2);
            color: var(--dsw-alias-label-primary);
            box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2), var(--dsw-elevation-panel);
          }
          /* Harness compact row previews default to white text on a fixed dark surface.
             Include the bundled variant, which may not carry the patched marker. */
          body[data-dsh-desktop-ui="dsh"] > :is([data-dsh-hover-card], [style*="--dsh-hover-preview-fade:"]):is([role="button"], :has(> .YDXeBa_hoverContent)) {
            --dsw-hovercard-bg: var(--dsw-alias-bg-layer-1);
            box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2), var(--dsw-elevation-panel);
            color: var(--dsw-alias-label-primary);
          }
          body[data-dsh-desktop-ui="dsh"] > :is([data-dsh-hover-card], [style*="--dsh-hover-preview-fade:"]) .YDXeBa_hoverTitle,
          body[data-dsh-desktop-ui="dsh"] > :is([data-dsh-hover-card], [style*="--dsh-hover-preview-fade:"])[role="button"] > span:only-child {
            color: var(--dsw-alias-label-primary);
          }
          body[data-dsh-desktop-ui="dsh"] > :is([data-dsh-hover-card], [style*="--dsh-hover-preview-fade:"]) :is(.YDXeBa_hoverPath, .YDXeBa_hoverTime, .YDXeBa_hoverStatus) {
            color: var(--dsw-alias-label-secondary);
          }
          .dshWorkContent{display:grid;grid-template:minmax(0,1fr) / minmax(0,1fr) 0px;isolation:isolate}.dshWorkContent[hidden]{display:none}
          .dshWorkContent>.pI_x6G_handle[data-side=rightbar]{grid-area:auto;right:calc(var(--dsh-work-rightbar-width) - 4px);margin-left:0}
          .dshWorkContent[data-reveal-controls=true]:not([hidden]) [data-dsh-hero-controls]{clip-path:inset(-8px -8px -8px -8px);transition:clip-path 180ms cubic-bezier(.23,1,.32,1)}
          @starting-style{.dshWorkContent[data-reveal-controls=true]:not([hidden]) [data-dsh-hero-controls]{clip-path:inset(-8px 100% -8px -8px)}}
          @media(prefers-reduced-motion:reduce){.dshWorkContent[data-reveal-controls=true] [data-dsh-hero-controls]{transition:none;clip-path:none}}
          .dshSharedCollection{min-width:0}
          .dshRecentHistory{margin-top:12px;min-width:0}
          .dshHistoryHeading{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 12px;color:var(--dsw-alias-label-secondary);font-size:13px}
          .dshCloudHistoryRow{display:flex;align-items:center;min-width:0}
          .dshCloudHistoryRow>.dshHistoryRow{flex:1;min-width:0}
          .dshCloudHistoryActions{border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);width:28px;height:28px;cursor:pointer;font:inherit}
          .dshCloudHistoryActions:hover,.dshCloudHistoryActions[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}
          .dshHistoryRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;height:32px;margin-bottom:2px;padding:0 8px 0 28px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
          .dshHistoryRow:hover,.dshHistoryRow[aria-current=page]{background:var(--dsw-alias-interactive-bg-hover)}
          .dshHistoryRow span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshHistoryRow time{color:var(--dsw-alias-label-tertiary);font-size:10px;white-space:nowrap}
          .dshHistoryRow:is(:hover,:focus-visible) span{text-overflow:clip}.dshHistoryRow:is(:hover,:focus-visible) time{display:none}
          .dshHistoryNotice{padding:8px;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary);background:transparent;border:0;text-align:left}.dshHistoryNotice:is(button){cursor:pointer}
          .dshSharedCollection button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
          .dshChatSignInDescription{margin:0;font-size:14px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
          .dshChatSignInActions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
          .dshChatStatus{margin:auto;text-align:center;font-size:14px;color:var(--dsw-alias-label-secondary)}
          .dshChatStatus button{font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 16px;cursor:pointer}
          .dshHostedAppHeader{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:8px 16px;padding-inline-start:calc(16px + var(--dsh-hosted-start-offset, 0px));border-bottom:1px solid var(--dsw-alias-border-l2)}
        `
        document.head.appendChild(style)
        return () => style.remove()
      })
      ctx.slots.inject('sidebar.primaryNavigation', () => ctx.slots.register({ name: 'sidebar.primaryNavigation', id: 'desktop-primary-navigation', inject: () => ({ navigation, botNavigation, t: ctx.locale.bind(MODES_NS), workspaceHome: workspaceEnabled && ctx.locale.bind(WORKSPACE_CHROME_NS)('home') }) }, PrimaryNavigation))
      ctx.slots.inject('sidebar.workspaces.title', () => ctx.slots.register({ name: 'sidebar.workspaces.title', inject: () => ({ t: ctx.locale.bind(MODES_NS) }) }, ({ flat, t }) => t(flat ? 'all' : 'projects')))
      ctx.slots.inject('desktop.mode.content', () => ctx.slots.register({ name: 'desktop.mode.content', id: 'desktop-chat-work', inject: () => ({ navigation, services, t: ctx.locale.bind(MODES_NS), locale: ctx.locale, slots: ctx.slots, shortcuts: ctx.get?.('shortcuts'), botSidebarText: ctx.locale.bind(BOT_SIDEBAR_NS) }) }, DesktopModes))
      ctx.slots.inject('sidebar.workspaces.collection', () => ctx.slots.register({ name: 'sidebar.workspaces.collection', id: 'desktop-shared-collection', inject: () => ({ navigation, botNavigation, t: ctx.locale.bind(MODES_NS), deleteText: ctx.locale.bind(CLOUD_DELETE_NS) }) }, SharedCollection))
      return navigation
    }

    const RESOURCE_NS = 'desktop-work-resources'
    const RESOURCE_COPY = {
      zh: { tools: '工具', toolsHint: '选择本次任务使用的工具', skills: '技能', skillsHint: '选择本次任务使用的技能', knowledge: '知识空间', knowledgeHint: '选择本次任务检索的知识空间', search: '搜索知识空间', empty: '暂无可用知识空间', noMatch: '没有匹配的知识空间', loading: '正在加载知识空间…', retry: '重试', cancel: '取消', confirm: '确认添加', close: '关闭', remove: '移除', department: '部门知识空间', mine: '我创建的', joined: '我加入的', selectKnowledge: '选择知识空间', modified: '修改时间', selected: '已选 {count} 个知识空间', limit: '最多选择 50 个空间' },
      en: { tools: 'Tools', toolsHint: 'Choose tools for this task', skills: 'Skills', skillsHint: 'Choose a skill for this task', knowledge: 'Knowledge spaces', knowledgeHint: 'Choose knowledge spaces to search in this task', search: 'Search knowledge spaces', empty: 'No knowledge spaces available', noMatch: 'No matching knowledge spaces', loading: 'Loading knowledge spaces…', retry: 'Retry', cancel: 'Cancel', confirm: 'Add selected', close: 'Close', remove: 'Remove', department: 'Department spaces', mine: 'Created by me', joined: 'Joined spaces', selectKnowledge: 'Select knowledge spaces', modified: 'Modified', selected: '{count} knowledge spaces selected', limit: 'Select up to 50 spaces' }
    }
    async function workResourceRequest(operation, sessionId, spaceIds, signal) {
      const response = await fetch('/api/enterprise.work-resources', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal,
        body: JSON.stringify({ operation, sessionId, ...(spaceIds === undefined ? {} : { spaceIds }) })
      })
      const result = await response.json().catch(() => ({ error: `Knowledge service unavailable (${response.status})` }))
      if (!response.ok) throw new Error(result.error || `Knowledge request failed (${response.status})`)
      return result
    }
    async function workSkillRequest(body, signal) {
      const response = await fetch('/api/enterprise.work-skills', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal, body: JSON.stringify(body)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Skill request failed.')
      return data
    }
    async function workToolRequest(body, signal) {
      const response = await fetch('/api/enterprise.work-tools', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal, body: JSON.stringify(body)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Tool request failed.')
      return result
    }
    const TOOL_REFERENCE_SOURCE = 'desktop-tool'
    const validToolLabel = label => typeof label === 'string' && label.trim().length > 0 && !/[\u0000-\u001f\u007f]/u.test(label)
    const decodeToolReference = ref => {
      const tool = JSON.parse(ref)
      if (!tool || !/^mcp__bisheng__bisheng_tool_[1-9][0-9]*$/.test(tool.name) || !validToolLabel(tool.label) || typeof tool.connectionKey !== 'string' || !tool.connectionKey) throw new Error('Invalid tool reference.')
      return tool
    }
    const toolReferenceSource = {
      trigger: '/', name: TOOL_REFERENCE_SOURCE, candidates: async () => [], onPick: () => undefined, openReference: () => false,
      codec: {
        clipboardText: ref => `/${decodeToolReference(ref).label}`,
        serialize: async (ref, signal) => {
          const tool = decodeToolReference(ref)
          await workToolRequest({ operation: 'validate', names: [tool.name], connectionKey: tool.connectionKey }, signal)
          return ` [Selected tool: ${tool.name}; label: ${JSON.stringify(tool.label)}] `
        }
      }
    }
    // Persist the selection's label with its model identity. Transcript rendering
    // reads this snapshot, so account changes and catalog renames preserve history.
    const workToolMessageRule = {
      id: TOOL_REFERENCE_SOURCE, order: 20,
      match(text, from) {
        const pattern = /\[Selected tool: (mcp__bisheng__bisheng_tool_[1-9][0-9]*)(?:; label: ("(?:[^"\\\r\n]|\\.)*"))?\]/gu
        pattern.lastIndex = from
        for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
          let label
          if (match[2] !== undefined) {
            try { label = JSON.parse(match[2]) } catch { continue }
            if (!validToolLabel(label)) continue
          }
          return { id: TOOL_REFERENCE_SOURCE, start: match.index, end: pattern.lastIndex, data: { name: match[1], ...(label === undefined ? {} : { label }) } }
        }
      }
    }
    function WorkToolMessage({ node, t }) {
      // Legacy messages carry only an ID. A neutral label keeps their meaning
      // without resolving that ID against a different enterprise account.
      const label = node.data.label ?? t('selectedTool')
      return React.createElement('span', { className: 'dshWorkToolReference', title: label },
        React.createElement(NavigationIcon, { id: 'tools', size: 14 }), label)
    }
    function installWorkToolMessages(ctx) {
      const ns = 'desktop.toolMessage'
      ctx.effect(() => ctx.locale.register(ns, { zh: { selectedTool: '已选工具' }, en: { selectedTool: 'Selected tool' } }), 'desktop tool message locale')
      ctx.effect(() => ctx.uiConversation.userText.register(workToolMessageRule), 'desktop tool message rule')
      ctx.slots.inject('conversation.user.text.node', () => ctx.slots.register({
        name: 'conversation.user.text.node', key: TOOL_REFERENCE_SOURCE, priority: 100,
        inject: () => ({ t: ctx.locale.bind(ns) })
      }, WorkToolMessage))
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-desktop-tool-message'
        style.textContent = '.dshWorkToolReference{color:var(--dsw-alias-state-business-primary);overflow-wrap:anywhere}.dshWorkToolReference svg{vertical-align:text-bottom;margin-inline-end:4px}'
        document.head.appendChild(style)
        return () => style.remove()
      })
    }
    const SKILL_REFERENCE_SOURCE = 'desktop-skill'
    const decodeSkillReference = ref => {
      const value = JSON.parse(ref)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.name) || typeof value.label !== 'string') throw new Error('Invalid skill reference.')
      return value
    }
    const skillReferenceSource = {
      trigger: '/', name: SKILL_REFERENCE_SOURCE, candidates: async () => [], onPick: () => undefined, openReference: () => false,
      codec: {
        clipboardText: ref => `/${decodeSkillReference(ref).label}`,
        serialize: async (ref, signal) => {
          const skill = decodeSkillReference(ref)
          if (skill.enterprise) await workSkillRequest({ operation: 'validate', names: [skill.name] }, signal)
          return ` /${skill.name} `
        }
      }
    }
    const KNOWLEDGE_REFERENCE_SOURCE = 'desktop-knowledge'

    // The editor owns the draft selection. Retrieval scope is committed before
    // submission, so clearing a sent draft leaves the running task's scope intact.
    function createWorkKnowledgeComposer({ inputFor, ensureSession, request }) {
      const used = new WeakSet()
      const decode = ref => {
        const space = JSON.parse(ref)
        if (!Number.isSafeInteger(space.id) || space.id <= 0 || typeof space.name !== 'string') throw new Error('Invalid knowledge reference.')
        return space
      }
      const read = sessionId => inputFor(sessionId).input.state.getSnapshot().occurrences
        .filter(item => item.source === KNOWLEDGE_REFERENCE_SOURCE).map(item => decode(item.ref))
      const update = (sessionId, spaces, captureInsertion) => {
        const { input, scope } = inputFor(sessionId)
        if (!['plain', 'claimed'].includes(input.state.getSnapshot().phase)) throw new Error('Wait for the current submission to finish, then choose knowledge spaces.')
        const wanted = new Set(spaces.map(space => space.id))
        const snapshot = input.state.getSnapshot()
        let shift = 0
        const removed = []
        for (const item of snapshot.occurrences) {
          if (item.source === KNOWLEDGE_REFERENCE_SOURCE && !wanted.has(decode(item.ref).id)) removed.push(item.offset - shift)
          shift += item.length - 1
        }
        for (const start of removed.reverse()) {
          const state = input.state.getSnapshot()
          if (!scope.bail(scope, 'slash/input-insert-text', { text: '', span: { start, end: start + 1, draftRev: state.draftRev } })) throw new Error('Knowledge selection changed. Please try again.')
        }
        const present = new Set(read(sessionId).map(space => space.id))
        for (const space of spaces) {
          if (present.has(space.id)) continue
          const ref = JSON.stringify({ id: space.id, name: space.name })
          if (!input.insertReference({ source: KNOWLEDGE_REFERENCE_SOURCE, appearance: 'folder', ref, label: space.name, clipboardText: `@${space.name}` }, captureInsertion())) throw new Error('Knowledge selection changed. Please try again.')
          present.add(space.id)
        }
        used.add(inputFor(sessionId).input)
      }
      const source = {
        trigger: '@', name: KNOWLEDGE_REFERENCE_SOURCE,
        candidates: async () => [],
        onPick: () => undefined,
        openReference: () => false,
        codec: { clipboardText: ref => `@${decode(ref).name}`, serialize: async ref => `@${decode(ref).name}` },
      }
      const catalogFor = async (sessionId, signal) => {
        const { input } = inputFor(sessionId)
        const catalog = await request('catalog', sessionId, undefined, signal)
        signal?.throwIfAborted()
        if (inputFor(sessionId).input !== input) throw new Error('Work task changed.')
        return catalog.spaces
      }
      const refresh = async (sessionId, signal) => {
        if (read(sessionId).length === 0) return
        const spaces = await catalogFor(sessionId, signal)
        const { input } = inputFor(sessionId)
        if (['plain', 'claimed'].includes(input.state.getSnapshot().phase)) {
          const allowed = new Set(spaces.map(space => space.id))
          const current = read(sessionId)
          const retained = current.filter(space => allowed.has(space.id))
          if (retained.length < current.length) update(sessionId, retained)
        }
      }
      const choose = async (sessionId, ids, captureInsertion, signal) => {
        const spaces = await catalogFor(sessionId, signal)
        update(sessionId, spaces.filter(space => ids.includes(space.id)), captureInsertion)
      }
      const prepare = async ({ sessionId, references, signal, command }) => {
        // Goal control commands keep the active objective's retrieval scope.
        if (command && (command.name !== 'goal' || !command.args.trim() || /^(?:clear|pause|resume|edit)$/i.test(command.args.trim()))) return
        signal.throwIfAborted()
        const ids = [...new Set(references.filter(item => item.source === KNOWLEDGE_REFERENCE_SOURCE).map(item => decode(item.ref).id))]
        if (!ids.length && !used.has(inputFor(sessionId).input)) return
        await ensureSession(sessionId, signal)
        await request('select', sessionId, ids, signal)
        used.add(inputFor(sessionId).input)
      }
      return { read, update, source, prepare, refresh, choose, state: sessionId => inputFor(sessionId).input.state }
    }

    function WorkResourceAccessory({ sessionId, controls, t, inputActions, knowledge }) {
      const [open, setOpen] = React.useState(false)
      const [spaces, setSpaces] = React.useState([])
      const [draft, setDraft] = React.useState([])
      const [keyword, setKeyword] = React.useState('')
      const [loading, setLoading] = React.useState(false)
      const [saving, setSaving] = React.useState(false)
      const [error, setError] = React.useState('')
      const [accessError, setAccessError] = React.useState('')
      const [revision, retry] = React.useReducer(value => value + 1, 0)
      React.useEffect(() => {
        let pending
        let signature
        const refresh = () => {
          pending?.abort()
          const abort = new AbortController()
          pending = abort
          knowledge.refresh(sessionId, abort.signal)
            .then(() => { if (!abort.signal.aborted) setAccessError('') })
            .catch(reason => { if (!abort.signal.aborted) setAccessError(reason.message) })
        }
        const changed = () => {
          const state = knowledge.state(sessionId).getSnapshot()
          const next = JSON.stringify([state.phase, knowledge.read(sessionId)])
          if (next === signature) return
          signature = next
          if (['plain', 'claimed'].includes(state.phase)) refresh()
        }
        const visible = () => { if (document.visibilityState === 'visible') refresh() }
        const unsubscribe = knowledge.state(sessionId).subscribe(changed)
        changed()
        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', visible)
        const timer = setInterval(visible, 30_000)
        return () => {
          pending?.abort(); unsubscribe(); clearInterval(timer)
          window.removeEventListener('focus', refresh)
          document.removeEventListener('visibilitychange', visible)
        }
      }, [sessionId, knowledge])
      const commitAbort = React.useRef()
      React.useEffect(() => {
        setSaving(false)
        return () => commitAbort.current?.abort()
      }, [sessionId])
      React.useEffect(() => {
        const control = { open: () => { setKeyword(''); setOpen(true) }, captureInsertion: () => inputActions.captureInsertion() }
        controls.set(sessionId, control)
        return () => { if (controls.get(sessionId) === control) controls.delete(sessionId) }
      }, [sessionId, controls, inputActions])
      React.useEffect(() => {
        if (!open) return
        const abort = new AbortController()
        setLoading(true); setError('')
        workResourceRequest('catalog', sessionId, undefined, abort.signal)
          .then(catalog => { if (!abort.signal.aborted) { setSpaces(catalog.spaces); setDraft(knowledge.read(sessionId).map(space => space.id)) } })
          .catch(reason => { if (!abort.signal.aborted) setError(reason.message) })
          .finally(() => { if (!abort.signal.aborted) setLoading(false) })
        return () => abort.abort()
      }, [open, revision, sessionId, knowledge])
      const close = () => { if (!saving) setOpen(false) }
      const commit = async ids => {
        const abort = new AbortController()
        commitAbort.current?.abort()
        commitAbort.current = abort
        setSaving(true); setError('')
        try {
          await knowledge.choose(sessionId, ids, () => inputActions.captureInsertion(), abort.signal)
          setOpen(false)
        }
        catch (reason) { if (!abort.signal.aborted) setError(reason.message) }
        finally { if (!abort.signal.aborted) setSaving(false) }
      }
      const visible = spaces.filter(space => space.name.toLowerCase().includes(keyword.trim().toLowerCase())).sort((a, b) => {
        const an = a.name.trim(), bn = b.name.trim()
        const aIsEn = an.length > 0 && an.charCodeAt(0) < 128
        const bIsEn = bn.length > 0 && bn.charCodeAt(0) < 128
        return aIsEn !== bIsEn ? (aIsEn ? -1 : 1) : an.localeCompare(bn, aIsEn ? 'en' : 'zh-Hans-u-co-pinyin', { sensitivity: 'base' })
      })
      const icon = kind => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        kind === 'search' ? [React.createElement('circle', { key: 'circle', cx: 11, cy: 11, r: 8 }), React.createElement('path', { key: 'handle', d: 'm21 21-4.3-4.3' })] :
        kind === 'close' ? React.createElement('path', { d: 'm18 6-12 12M6 6l12 12' }) :
        [React.createElement('path', { key: 'left', d: 'M12 7v14m0-14C10 5 8 5 2 5v14c6 0 8 0 10 2' }), React.createElement('path', { key: 'right', d: 'M12 7c2-2 4-2 10-2v14c-6 0-8 0-10 2' })])
      return React.createElement(React.Fragment, null,
        (error || accessError) && !open && React.createElement('div', { role: 'alert', className: 'dshWorkResourceError' }, error || accessError),
        React.createElement(Modal, { open, onClose: close, title: t('selectKnowledge'), headless: true, backdropBlur: false, className: 'dshWorkKnowledgeDialog' },
          React.createElement('header', { className: 'dshWorkKnowledgeHeader' },
            React.createElement('h2', null, t('selectKnowledge')),
            React.createElement('button', { type: 'button', onClick: close, disabled: saving, 'aria-label': t('close') }, icon('close'))),
          React.createElement('div', { className: 'dshWorkKnowledgeBody' },
            React.createElement('div', { className: 'dshWorkKnowledgeSearchField' }, icon('search'),
              React.createElement('input', { className: 'dshWorkKnowledgeSearch', 'data-modal-autofocus': true, type: 'search', placeholder: t('search'), 'aria-label': t('search'), value: keyword, onChange: event => setKeyword(event.target.value) })),
            React.createElement('div', { className: 'dshWorkKnowledgeColumns' }, React.createElement('span', null, t('knowledge')), React.createElement('span', null, t('modified'))),
            React.createElement('div', { className: 'dshWorkKnowledgeList', 'aria-busy': loading },
              loading ? React.createElement('p', { role: 'status' }, t('loading')) : error ? React.createElement('div', { role: 'alert' }, error, React.createElement(Button, { onClick: retry }, t('retry'))) : visible.length === 0 ? React.createElement('p', { role: 'status' }, t(keyword ? 'noMatch' : 'empty')) :
              ['department', 'mine', 'joined'].map(group => {
                const rows = visible.filter(space => space.group === group)
                return rows.length > 0 && React.createElement('section', { key: group }, React.createElement('h3', null, t(group)), rows.map(space => {
                  const checked = draft.includes(space.id)
                  const date = space.updatedAt ? new Date(space.updatedAt) : null
                  const validDate = date && !Number.isNaN(date.getTime())
                  return React.createElement('label', { key: space.id, className: 'dshWorkKnowledgeRow', 'data-selected': checked },
                    React.createElement('input', { type: 'checkbox', checked, 'aria-label': space.name, disabled: saving || (!checked && draft.length >= 50), onChange: event => setDraft(ids => event.target.checked ? [...ids, space.id] : ids.filter(id => id !== space.id)) }),
                    React.createElement('span', { className: 'dshWorkKnowledgeIcon' }, icon('book')),
                    React.createElement('span', { className: 'dshWorkResourceName', title: space.name }, space.name),
                    React.createElement('time', { className: 'dshWorkKnowledgeModified', dateTime: validDate ? space.updatedAt : undefined }, validDate ? date.toLocaleDateString() : '—'))
                }))
              })),
            draft.length >= 50 && React.createElement('p', { role: 'status' }, t('limit'))),
          React.createElement('footer', { className: 'dshWorkKnowledgeFooter' },
            React.createElement('span', { className: 'dshWorkSelectionCount', 'aria-live': 'polite' }, t('selected', { count: draft.length })),
            React.createElement(Button, { variant: 'outline', className: 'dshWorkKnowledgeCancel', disabled: saving, onClick: close }, t('cancel')),
            React.createElement(Button, { variant: 'primary', className: 'dshWorkKnowledgeConfirm', disabled: loading || saving || Boolean(error), onClick: () => commit(draft) }, t('confirm')))))
    }

    function installWorkResources(ctx) {
      const controls = new Map()
      const ensureSession = (sessionId, signal) => ctx.sessions.using(sessionId, { source: 'workResources', signal }, async () => undefined)
      const knowledge = createWorkKnowledgeComposer({ ensureSession, request: workResourceRequest, inputFor: sessionId => {
        const scope = ctx.sessions.scope(sessionId)
        if (!scope) throw new Error('Work task changed.')
        return { scope, input: ctx.conversation.input.for(scope) }
      } })
      ctx.effect(() => ctx.inputTriggers.registerSource(knowledge.source), 'desktop knowledge references')
      ctx.effect(() => ctx.inputTriggers.registerSource(skillReferenceSource), 'desktop skill references')
      ctx.effect(() => ctx.inputTriggers.registerSource(toolReferenceSource), 'desktop tool references')
      ctx.on('conversation/input-before-submit', knowledge.prepare)
      ctx.effect(() => ctx.locale.register(RESOURCE_NS, RESOURCE_COPY), 'desktop Work resources locale')
      const t = ctx.locale.bind(RESOURCE_NS)
      const available = session => ctx.sessions.subagentAddress(session.sessionId) === undefined
      ctx.commandUi.register({ name: 'skills', label: () => t('skills'), description: () => t('skillsHint'), icon: props => React.createElement(ResourceIcon, { ...props, id: 'skills' }), available,
        ui: { kind: 'popupSelect', searchMode: 'fuzzy-label',
          options: ({ sessionId }, signal) => ctx.sessions.using(sessionId, { source: 'workSkillPicker', signal }, async () => {
            const catalog = await workSkillRequest({ operation: 'catalog' }, signal)
            const labels = new Map(catalog.skills.map(skill => [skill.name, skill.displayName]))
            const result = await ctx.remote.skills.list({ sessionId }, signal)
            if (!result.ok) throw new Error(result.error.message)
            return result.value.skills.map(skill => ({
              id: JSON.stringify({ name: skill.name, label: labels.get(skill.name) || skill.name, enterprise: labels.has(skill.name) }),
              label: labels.get(skill.name) || skill.name,
              badgeIcon: labels.has(skill.name) ? props => React.createElement(ResourceIcon, { ...props, id: 'skills', size: 12 }) : undefined,
              detail: skill.description
            }))
          }),
          onSelect: (option, { sessionId }) => {
            const scope = ctx.sessions.scope(sessionId)
            if (!scope) throw new Error('Work task changed.')
            const input = ctx.conversation.input.for(scope)
            scope.bail(scope, 'slash/input-consume-token', { guard: { kind: 'bare-token', token: '/skills' } })
            const state = input.state.getSnapshot()
            const applied = input.insertReference({ source: SKILL_REFERENCE_SOURCE, appearance: 'skill', ref: option.id, label: option.label, clipboardText: `/${option.label}` }, { start: 0, end: 0, draftRev: state.draftRev })
            if (!applied) throw new Error('Finish editing the current command, then choose a skill.')
          }
        } })
      ctx.commandUi.register({ name: 'tools', label: () => t('tools'), description: () => t('toolsHint'), icon: props => React.createElement(ResourceIcon, { ...props, id: 'tools' }), available,
        ui: { kind: 'popupSelect', searchMode: 'fuzzy-label',
          options: async (_session, signal) => {
            const catalog = await workToolRequest({ operation: 'catalog' }, signal)
            return catalog.tools.map(tool => ({ id: JSON.stringify({ name: tool.name, label: tool.label, connectionKey: catalog.connectionKey }), label: tool.label, detail: tool.description }))
          },
          onSelect: (option, { sessionId }) => {
            const scope = ctx.sessions.scope(sessionId)
            if (!scope) throw new Error('Work task changed.')
            const input = ctx.conversation.input.for(scope)
            scope.bail(scope, 'slash/input-consume-token', { guard: { kind: 'bare-token', token: '/tools' } })
            const state = input.state.getSnapshot()
            if (state.occurrences.some(item => item.source === TOOL_REFERENCE_SOURCE && decodeToolReference(item.ref).name === decodeToolReference(option.id).name)) return
            if (!input.insertReference({ source: TOOL_REFERENCE_SOURCE, appearance: 'tool', ref: option.id, label: option.label, clipboardText: `/${option.label}` }, { start: 0, end: 0, draftRev: state.draftRev })) throw new Error('Finish editing the current command, then choose a tool.')
          }
        } })
      ctx.commandUi.register({ name: 'knowledge', label: () => t('knowledge'), description: () => t('knowledgeHint'), icon: props => React.createElement(ResourceIcon, { ...props, id: 'knowledge' }), available,
        ui: { kind: 'action', run: ({ sessionId }) => controls.get(sessionId)?.open() } })
      ctx.slots.inject('conversation.input.accessory', () => ctx.slots.register({ name: 'conversation.input.accessory', id: 'desktop-work-resources', order: 20, inject: sessionId => ({ sessionId, controls, t, knowledge }) }, WorkResourceAccessory))
      ctx.effect(() => {
        if (document.getElementById('desktop-work-resources-style')) return
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-desktop-client-ui'
        style.id = 'desktop-work-resources-style'
        // Match the Chat KnowledgeSpaceDialog layout using the native Work modal's focus and dismissal handling.
        style.textContent = `
          .dshWorkKnowledgeDialog{width:min(600px,100%);max-height:100%;padding:0;gap:0;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-2);font-size:14px;line-height:20px}
          .dshWorkKnowledgeHeader{height:56px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
          .dshWorkKnowledgeHeader h2{margin:0;font-size:16px;line-height:24px;font-weight:600}
          .dshWorkKnowledgeHeader button{display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
          .dshWorkKnowledgeHeader button:hover{background:var(--dsw-alias-interactive-bg-hover)}
          .dshWorkKnowledgeBody{padding:0 16px;min-height:0;overflow:auto}
          .dshWorkKnowledgeSearchField{position:relative;display:flex;align-items:center;color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeSearchField>svg{position:absolute;left:12px;pointer-events:none}
          .dshWorkKnowledgeSearch{box-sizing:border-box;width:100%;height:32px;padding:5px 12px 5px 36px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit}
          .dshWorkKnowledgeSearch::placeholder{color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeColumns{display:flex;justify-content:space-between;margin-top:20px;padding:0 8px 10px;color:var(--dsw-alias-label-tertiary);font-size:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
          .dshWorkKnowledgeList{height:min(440px,48vh);flex:none;overflow:auto;margin-top:8px}
          .dshWorkKnowledgeList section{margin-bottom:16px}
          .dshWorkKnowledgeList h3{margin:0 0 8px;font-size:12px;line-height:20px;font-weight:400;color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeRow{box-sizing:border-box;display:flex;align-items:center;gap:12px;min-height:60px;padding:12px 8px;border-radius:8px;border-bottom:1px solid var(--dsw-alias-border-l2);cursor:pointer;min-width:0}
          .dshWorkKnowledgeRow:hover,.dshWorkKnowledgeRow[data-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}
          .dshWorkKnowledgeRow input{appearance:none;flex:none;width:16px;height:16px;margin:0;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;cursor:pointer}
          .dshWorkKnowledgeRow input:checked{background:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3 8 3 3 7-7' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E")}
          .dshWorkKnowledgeRow input:disabled{opacity:.4;cursor:default}
          .dshWorkKnowledgeIcon{box-sizing:border-box;display:grid;place-items:center;flex:none;width:32px;height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;color:var(--dsw-alias-label-secondary)}
          .dshWorkResourceName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}
          .dshWorkKnowledgeModified{flex:none;font-size:12px;color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeFooter{display:flex;align-items:center;gap:12px;flex:none;padding:16px}
          .dshWorkSelectionCount{margin-right:auto;color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeFooter button{height:32px;padding:0 16px;border-radius:6px;font:inherit;white-space:nowrap}
          .dshWorkKnowledgeCancel{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
          .dshWorkKnowledgeConfirm{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground);border:1px solid var(--dsw-alias-state-business-primary)}
          .dshWorkKnowledgeConfirm:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 88%,var(--dsw-alias-label-primary))}
          .dshWorkKnowledgeConfirm:disabled{opacity:.5}
          .dshWorkResourceError{padding:8px 12px;color:var(--dsw-alias-state-error-primary);font-size:12px}
          @media(max-width:1023px){.dshWorkKnowledgeDialog{width:min(400px,100%)}}
          @media(max-width:575px){.dshWorkKnowledgeModified{max-width:80px}.dshWorkKnowledgeFooter{flex-wrap:wrap}.dshWorkSelectionCount{flex:1 0 100%}}
        `
        document.head.appendChild(style)
        return () => style.remove()
      })
    }

    /** Consume successful-turn facts independently of the selected conversation and animation frames. */
    function installWorkCompletionNotifications(ctx, navigation) {
      const bridge = window.dshDesktopNotifications
      if (!bridge) return
      ctx.effect(() => {
        const observed = new Map()
        const startedAt = Date.now()
        const report = () => {
          const list = ctx.sessions.list.getSnapshot()
          // Completion projections arrive independently of catalog metadata. Work
          // notifications follow those facts even while the catalog loads or fails.
          for (const [id, projection] of Object.entries(list.projectionsBySession)) {
            const completion = projection.values.desktopWorkCompletion
            if (!completion) continue
            const previous = observed.get(id)
            observed.set(id, Math.max(previous ?? 0, completion.count))
            // Baselines carry history. A first read can also contain a fast task completed since subscription.
            if (previous === undefined ? completion.count === 0 || completion.time < startedAt : completion.count <= previous) continue
            void bridge.completed({ sessionId: id, turn: completion.turn, seq: completion.seq,
              count: previous === undefined ? 1 : completion.count - previous }).catch(error => {
              console.error('[desktop-notification] completion delivery failed', error)
            })
          }
        }
        const unsubscribe = ctx.sessions.list.subscribe(report)
        report()
        const unclick = bridge.onClicked(sessionId => {
          navigation.select('work')
          ctx.uiWorkspace.openSession(sessionId)
        })
        return () => { unsubscribe(); unclick(); observed.clear() }
      })
    }

    /**
     * Desktop UI layer. These values are the product's shell, not an optional
     * skin: the client UI plugin is mounted in every profile, so the card
     * layout, tokens and surfaces apply without a separate plugin row.
     */
    const both = value => ({ light: value, dark: value })
    const UI_TOKENS = {
      '--dsw-radius-xs': both('6px'),
      '--dsw-radius-sm': both('10px'),
      '--dsw-radius-md': both('12px'),
      '--dsw-radius-lg': both('16px'),
      '--dsw-radius-xl': both('16px'),
      '--dsw-radius-panel': both('24px'),
      '--dsw-alias-button-primary-fill': both('var(--dsw-static-blue-500)'),
      '--dsw-alias-button-primary-hover': {
        light: 'var(--dsw-static-blue-600)',
        dark: 'var(--dsw-static-blue-400)'
      },
      '--dsw-alias-label-primary-foreground': both('var(--dsw-static-neutral-bluish-00)'),
      '--dsw-specific-bubble': {
        light: 'var(--dsw-static-neutral-bluish-00)',
        dark: 'var(--dsw-static-neutral-bluish-850)'
      },
      '--dsw-specific-input-major': {
        light: 'var(--dsw-static-neutral-bluish-00)',
        dark: 'var(--dsw-static-neutral-bluish-850)'
      }
    }

    /*
     * Structural selectors use stable data hooks wherever the host provides
     * them. The hash-suffixed module classes are pinned by the locked 0.2.1-rc.2
     * packages and match upstream 0.2.2, so they stay aligned with DSH Desktop.
     * `data-dsh-sidebar-new-session` is not in the 0.2.1 sidebar patch, so the
     * new-session card uses the pinned module class instead of that later hook.
     */
    const UI_STYLE = `
      /* App shell: the frame owns scrolling; never expose document scrollbars. */
      html, body {
        overflow: hidden;
      }
      body[data-dsh-desktop-ui="dsh"] {
        --dsk-shell-top: calc(var(--dsh-windows-titlebar-height, 0px) + 10px);
        --dsk-shell-column-gap: 12px;
        --dsk-card-radius: 24px;
        --dsk-card-border: 1px solid var(--dsw-alias-border-l2);
        --dsk-card-shadow: 0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px -24px rgb(0 0 0 / 0.30);
        --dsk-card-surface: var(--dsw-alias-bg-layer-1);
        --dsk-page-surface: var(--dsw-alias-bg-module-platform);
        --dsk-content-surface: color-mix(in srgb, var(--dsk-card-surface) 25%, var(--dsk-page-surface));
        background: var(--dsk-page-surface);
      }
      /* Keep space for the macOS caption inside the sidebar, not outside the panels. */
      html[data-platform="darwin"]:not([data-fullscreen="true"]) body[data-dsh-desktop-ui="dsh"] {
        --dsk-shell-top: calc(var(--dsh-frame-top-clearance, 48px) + 10px);
      }

      /* Shell: page ground, inset cards, hairline separators. */
      body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame {
        background: var(--dsk-page-surface);
        padding: var(--dsk-shell-top) 12px 12px;
        column-gap: var(--dsk-shell-column-gap);
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] {
        --dsk-shell-column-gap: 0px;
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame {
        box-sizing: border-box;
        padding: 0;
      }
      /* With the sidebar collapsed, reserve the caption vertically rather than
         pushing a whole native conversation to the right of its opener. */
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame:has(> [data-shell-leading])
      .dshModes:not(:has(> .dshModesHeader, > [data-dsh-bot-sidebar-toggle])) > #dsh-panel-chat {
        margin-block-start: var(--dsh-frame-top-clearance, 48px);
      }
      html[data-platform="darwin"]:not([data-fullscreen="true"]) body[data-dsh-desktop-ui="dsh"]
      .pI_x6G_frame [data-dsh-sidebar-root] {
        padding-block-start: var(--dsk-shell-top);
      }
      /* Reserve the traffic lights on the left and leave higher native
         controls (e.g. the collapsed sidebar opener) clickable. */
      html[data-platform="darwin"]:not([data-fullscreen="true"]) body[data-dsh-desktop-ui="dsh"]
      .pI_x6G_frame:not(:has(.dshModes > .dshModesHeader))::before {
        content: "";
        position: absolute;
        inset: 0 0 auto 88px;
        height: var(--dsk-shell-top);
        -webkit-app-region: drag;
      }
      /* Reuse the sidebar's toggle while expanded and shell.leading when collapsed. */
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame:not([data-sidebar-collapsed]) .hHd-Xa_topStrip {
        position: fixed;
        z-index: 16;
        top: 11px;
        left: 88px;
        width: 28px;
        height: 28px;
        margin: 0;
        padding: 0;
        justify-content: center;
        -webkit-app-region: no-drag;
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame[data-sidebar-collapsed] .hHd-Xa_topStrip {
        display: none;
      }
      /* In a regular window the title bar supplies both controls. */
      html[data-platform="darwin"]:not([data-fullscreen="true"]) body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame[data-sidebar-collapsed] [data-dsh-sidebar-root] > .hHd-Xa_newSession {
        display: none;
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame[data-sidebar-collapsed] [data-dsh-sidebar-wide="false"] {
        inline-size: 100%;
        padding: 8px 9px 6px;
      }
      html[data-platform="darwin"]:not([data-fullscreen="true"]) body[data-dsh-desktop-ui="dsh"]
      .pI_x6G_frame[data-sidebar-collapsed] [data-dsh-sidebar-wide="false"] {
        padding-block-start: var(--dsk-shell-top);
      }
      /* In full screen the sidebar owns its toggle in both widths. */
      html[data-platform="darwin"][data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-root] {
        position: relative;
      }
      html[data-platform="darwin"][data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame:not([data-sidebar-collapsed]) .hHd-Xa_topStrip {
        position: absolute;
        inset: 11px 12px auto auto;
      }
      html[data-platform="darwin"][data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame:not([data-sidebar-collapsed]) [data-dsh-sidebar-root] > .hHd-Xa_newSession {
        margin-right: 38px;
      }
      html[data-platform="darwin"][data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame[data-sidebar-collapsed] {
        --dsh-frame-leading-clearance: 84px;
      }
      html[data-platform="darwin"][data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_frame[data-sidebar-collapsed] .hHd-Xa_topStrip {
        display: flex;
        justify-content: center;
        height: 34px;
        margin: 0 0 8px;
        padding: 0;
        opacity: 1;
        -webkit-app-region: no-drag;
      }
      html[data-platform="darwin"][data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"] .hHd-Xa_topStrip .hHd-Xa_railMark {
        display: none;
      }
      html[data-platform="darwin"][data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"] .hHd-Xa_topStrip .hHd-Xa_panelIcon {
        display: inline;
      }
      body[data-dsh-desktop-ui="dsh"] .pI_x6G_sidebarCol {
        background: var(--dsk-content-surface);
        border: var(--dsk-card-border);
        border-radius: var(--dsk-card-radius);
        box-shadow: var(--dsk-card-shadow);
        overflow: hidden;
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_sidebarCol {
        border: 0;
        border-start-end-radius: 0;
        border-end-end-radius: 0;
        box-shadow: none;
      }
      /* DS Bot replaces the collapsed Harness rail with its own docked card. */
      body[data-dsh-desktop-ui="dsh"]:has(> .bt-leftcol:is([data-left="open"], [data-left="rail"]):not([data-leaving], [aria-hidden="true"], [hidden]))
      .pI_x6G_frame[data-sidebar-collapsed] > .pI_x6G_sidebarCol {
        visibility: hidden;
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"]
      .pI_x6G_frame[data-sidebar-collapsed]:not([data-dsh-sidebar-preview]) > .pI_x6G_sidebarCol {
        visibility: hidden;
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"]
      .pI_x6G_frame[data-dsh-sidebar-preview] > .pI_x6G_sidebarCol {
        position: relative;
        margin-block: 46px 10px;
        margin-inline-start: 8px;
        z-index: 14;
        box-sizing: border-box;
        max-inline-size: calc(100vw - 16px);
        border: var(--dsk-card-border);
        border-radius: var(--dsk-card-radius);
        box-shadow: var(--dsw-elevation-panel);
      }
      @media (prefers-reduced-motion: no-preference) {
        html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"]
        .pI_x6G_frame[data-dsh-sidebar-preview] > .pI_x6G_sidebarCol {
          translate: 0 0;
          transition: translate 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"]
        .pI_x6G_frame[data-sidebar-collapsed]:is(:not([data-dsh-sidebar-preview]), [data-dsh-sidebar-preview-closing]) > .pI_x6G_sidebarCol {
          translate: calc(-100% - 8px) 0;
        }
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"]
      .pI_x6G_frame[data-dsh-sidebar-preview] [data-dsh-sidebar-root] {
        max-inline-size: 100%;
        padding-block-start: 8px;
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"]
      .pI_x6G_frame[data-dsh-sidebar-preview] [data-dsh-sidebar-root] > .hHd-Xa_newSession {
        display: none;
      }
      body[data-dsh-desktop-ui="dsh"]:has([data-dsh-bot-sidebar-toggle])
      :is([data-shell-leading], .bt-leftcol .bt-side-collapse, .bt-title-toggle) {
        display: none;
      }
      body[data-dsh-desktop-ui="dsh"]:has([data-dsh-bot-sidebar-toggle]) .pI_x6G_frame > .pI_x6G_sidebarCol {
        visibility: hidden;
      }
      [data-dsh-bot-sidebar-toggle] {
        position: fixed;
        z-index: 30;
        top: 11px;
        left: 88px;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 0;
        border-radius: var(--dsw-radius-sm);
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        cursor: pointer;
        -webkit-app-region: no-drag;
      }
      [data-dsh-bot-sidebar-toggle]:hover { background: var(--dsw-alias-interactive-bg-hover); }
      [data-dsh-bot-sidebar-toggle]:focus-visible {
        outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
        outline-offset: -2px;
      }
      html[data-fullscreen="true"] [data-dsh-bot-sidebar-toggle] {
        top: calc(var(--dsk-shell-top) + 11px);
        left: calc(var(--dsh-bot-sidebar-width) - 28px);
      }
      html[data-fullscreen="true"] body:has(> .bt-leftcol[data-left="rail"]) [data-dsh-bot-sidebar-toggle] {
        left: 26px;
      }
      body[data-dsh-desktop-ui="dsh"]:has([data-dsh-bot-sidebar-toggle]) > .bt-leftcol[data-left="rail"] {
        /* DS Bot writes its own width inline. Match the Agent rail's 56px track. */
        width: 56px !important;
      }
      body[data-dsh-desktop-ui="dsh"]:has([data-dsh-bot-sidebar-toggle]) .bt-rail :is(.bt-row, .bt-agent, .bt-round, .bt-account, .bt-you) {
        width: 36px;
        height: 36px;
        min-height: 36px;
      }
      body[data-dsh-desktop-ui="dsh"]:has([data-dsh-bot-sidebar-toggle]) .bt-rail .bt-agent-ava {
        width: 30px;
        height: 30px;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-rail .bt-rail-folder {
        width: 36px;
        height: 36px;
        border-radius: var(--dsw-radius-md);
        background: transparent;
        box-shadow: none;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-rail .bt-rail-folder:is(:hover, [aria-current="page"]) {
        background: var(--dsw-alias-interactive-bg-hover);
      }
      .bt-leftcol[data-left="rail"]:has(.dshBotRailActions) .bt-leftcol-foot-rail > button.bt-round:first-child { display: none; }
      .dshBotRailActions { display: grid; gap: 8px; }
      .dshBotRailBackSeat { display: contents; }
      .dshBotRailActions button {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 0;
        border-radius: var(--dsw-radius-md);
        background: transparent;
        color: var(--dsw-alias-label-primary);
        cursor: pointer;
      }
      .dshBotRailActions button:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .dshBotRailActions button:focus-visible {
        outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
        outline-offset: -2px;
      }
      html[data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"]:has([data-dsh-bot-sidebar-toggle]) > .bt-leftcol[data-left="rail"] {
        padding-top: 50px;
      }
      html[data-fullscreen="true"] body[data-dsh-desktop-ui="dsh"]:has([data-dsh-bot-sidebar-toggle])
      .bt-leftcol .bt-side-top {
        padding-inline-end: 40px;
      }
      body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-root] {
        background: transparent;
      }
      /* The session list is the flexible part; the account/settings slot
         stays at the bottom of the bounded sidebar card. */
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_sidebarCol,
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] .pI_x6G_sidebarCol [data-dsh-sidebar-root] {
        min-height: 0;
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-root] .hHd-Xa_regionArea {
        flex: 1 1 0;
        min-height: 0;
      }
      body[data-dsh-desktop-ui="dsh"] .pI_x6G_centerCol {
        background: var(--dsk-content-surface);
        border: var(--dsk-card-border);
        border-radius: var(--dsk-card-radius);
        box-shadow: var(--dsk-card-shadow);
        overflow: hidden;
      }
      /*
       * Bisheng mounts 'desktop.mode.content' instead of the stock center column,
       * so chat and work share this panel. It is the visible card: the native
       * enterprise chat view is rounded to the inner radius reported from here.
       */
      body[data-dsh-desktop-ui="dsh"] .dshModes {
        box-sizing: border-box;
        margin-left: var(--dsh-plugin-rail-inset, 0px);
        width: calc(100% - var(--dsh-plugin-rail-inset, 0px));
        background: var(--dsk-content-surface);
        border: var(--dsk-card-border);
        border-radius: var(--dsk-card-radius);
        box-shadow: var(--dsk-card-shadow);
        overflow: hidden;
      }
      /* Work mode nests the stock center column; the mode panel already carries the card. */
      body[data-dsh-desktop-ui="dsh"] .dshModes[data-dsh-workspace-dock] {
        background: var(--dsk-page-surface);
        border-color: transparent;
        border-radius: 0;
        box-shadow: none;
      }
      body[data-dsh-desktop-ui="dsh"] .dshModes .pI_x6G_centerCol {
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      /* The outer card already reserves DS Bot's left column. Preserve its
         right-side adjustments, but don't indent the nested Work column twice. */
      /* DS Bot also animates the inner left margin. The shared card drives
         that edge; keep only the plugin's right-side transition. */
      body[data-dsh-desktop-ui="dsh"] .dshModes[data-dsh-plugin-rail-inset] .dshWorkContent > .pI_x6G_centerCol {
        margin-left: 0 !important;
        transition-property: margin-right;
      }

      /* @copylee/dsh-image-gen uses its own accent by default. Bridge its
         gallery colors to the desktop theme without changing plugin settings. */
      body[data-dsh-desktop-ui="dsh"] .dig-root {
        --dig-accent: var(--dsw-alias-button-primary-fill);
        --dig-accent-ink: var(--dsw-alias-label-primary-foreground);
        --dig-focus: var(--dsw-alias-state-business-primary);
      }
      body[data-dsh-desktop-ui="dsh"] .dig-root .dig-btn-primary:hover:not(:disabled) {
        background: var(--dsw-alias-button-primary-hover);
      }

      /* DS Bot supplies its own sidebar and chat controls. Keep their behavior,
         but use the same card and theme roles as the ordinary Agent shell. */
      body[data-dsh-desktop-ui="dsh"] :is(.bt-leftcol, .dshModes[data-dsh-plugin-rail-inset] .dshWorkContent) {
        --bt-font: var(--dsw-font-family, system-ui, sans-serif);
        --bt-main: var(--dsk-content-surface);
        --bt-card: var(--dsk-card-surface);
        --bt-sidebar: var(--dsk-content-surface);
        --bt-ink: var(--dsw-alias-label-primary);
        --bt-ink-2: var(--dsw-alias-label-secondary);
        --bt-ink-3: var(--dsw-alias-label-tertiary);
        --bt-line: var(--dsw-alias-border-l1);
        --bt-line-2: var(--dsw-alias-border-l2);
        --bt-hover: var(--dsw-alias-interactive-bg-hover);
        --bt-active: var(--dsw-alias-interactive-bg-hover-solid);
        --bt-bubble: var(--dsw-alias-bg-layer-2);
        --bt-user: var(--dsw-specific-bubble);
        --bt-user-ink: var(--dsw-alias-label-primary);
        --bt-accent: var(--dsw-alias-button-primary-fill);
        --bt-accent-ink: var(--dsw-alias-label-primary-foreground);
      }
      body[data-dsh-desktop-ui="dsh"] > .bt-leftcol[data-left] {
        left: 12px;
        top: var(--dsk-shell-top);
        bottom: 12px;
        --bt-lc-clear: 0px;
        background: var(--dsk-content-surface);
        border: 0;
        border-radius: var(--dsk-card-radius);
        box-shadow: var(--dsk-card-shadow);
      }
      html[data-platform="darwin"] body[data-dsh-desktop-ui="dsh"] > .bt-leftcol[data-left] {
        inset-block: 0;
        left: 0;
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }
      html[data-platform="darwin"]:not([data-fullscreen="true"]) body[data-dsh-desktop-ui="dsh"] > .bt-leftcol[data-left] {
        --bt-lc-clear: var(--dsk-shell-top);
      }
      body[data-dsh-desktop-ui="dsh"] > .bt-leftcol[data-left]::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 1;
        border: var(--dsk-card-border);
        border-radius: inherit;
        pointer-events: none;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-leftcol .bt-leftcol-foot {
        border-top: 1px solid var(--dsw-alias-border-l1);
      }
      /* Center both steps in the available pane, retaining the plugin's
         sidebar offset. Only the card, not the entire row, intercepts input. */
      body[data-dsh-desktop-ui="dsh"] .bt-pane:has(> :is(.bt-newchat, .bt-create)[role="dialog"]) {
        top: calc(var(--dsk-shell-top) + 24px);
        right: 0;
        bottom: auto;
        justify-content: center;
        box-sizing: border-box;
        padding: 0 12px;
        background: transparent;
        pointer-events: none;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-pane > :is(.bt-newchat, .bt-create)[role="dialog"] {
        flex: 0 1 560px;
        max-width: 100%;
        max-height: calc(100dvh - var(--dsk-shell-top) - 36px);
        overflow: auto;
        box-sizing: border-box;
        background: var(--dsk-card-surface);
        border: var(--dsk-card-border);
        border-radius: var(--dsw-radius-lg);
        box-shadow: 0 2px 5px rgb(0 0 0 / 0.08), 0 16px 40px rgb(0 0 0 / 0.16);
        pointer-events: auto;
        -webkit-app-region: no-drag;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-pane > .bt-create[role="dialog"] {
        max-height: min(76dvh, calc(100dvh - var(--dsk-shell-top) - 60px));
        overflow: hidden;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-pane > .bt-create[role="dialog"] > .bt-create-head {
        flex: none;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-pane > .bt-create[role="dialog"] > .bt-create-body {
        min-height: 0;
        padding: 16px;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-pane > .bt-create[role="dialog"] > .bt-create-body > .bt-create-card {
        align-self: flex-start;
        max-width: 100%;
        padding-bottom: 12px;
        box-sizing: border-box;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-newchat[role="dialog"] .bt-to {
        padding: 8px 12px;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-newchat[role="dialog"] .bt-to input {
        min-width: 0;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-newchat[role="dialog"] .bt-drop {
        position: static;
        width: auto;
        max-height: min(280px, 38dvh);
        margin: 8px;
        background: var(--dsk-content-surface);
        border-color: var(--dsw-alias-border-l2);
        backdrop-filter: none;
        box-shadow: none;
      }
      body[data-dsh-desktop-ui="dsh"] .bt-leftcol :is(.bt-round, .bt-tile),
      body[data-dsh-desktop-ui="dsh"] .dshModes[data-dsh-plugin-rail-inset] .bt-pill {
        border-radius: var(--dsw-radius-sm);
      }
      body[data-dsh-desktop-ui="dsh"] .dshModes[data-dsh-plugin-rail-inset] .bt-pill {
        background: var(--dsk-card-surface);
        border: var(--dsk-card-border);
        box-shadow: none;
        backdrop-filter: none;
      }
      body[data-dsh-desktop-ui="dsh"] .dshModes[data-dsh-plugin-rail-inset] :is(.bt-bubble, .bt-ububble) {
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: var(--dsw-radius-xl);
      }

      /* Sidebar navigation: quiet rows, blue pill for the active page. */
      body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-root] .hHd-Xa_panelRow {
        border-radius: 10px;
        color: var(--dsw-alias-label-secondary);
        transition: background-color .15s var(--ds-ease-in-out), color .15s var(--ds-ease-in-out);
      }
      body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-root] .hHd-Xa_panelRow:hover {
        background: var(--dsw-alias-interactive-bg-hover);
        color: var(--dsw-alias-label-primary);
      }
      body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-root] .hHd-Xa_panelRow[aria-current="page"] {
        background: var(--dsw-static-blue-500);
        color: var(--dsw-static-neutral-bluish-00);
      }
      body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-root] .hHd-Xa_panelRow[aria-current="page"] svg {
        color: currentColor;
      }
      body[data-dsh-desktop-ui="dsh"] .hHd-Xa_newSession {
        background: var(--dsk-card-surface);
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 12px;
        box-shadow: 0 1px 1px rgb(0 0 0 / 0.03);
      }
      body[data-dsh-desktop-ui="dsh"] .hHd-Xa_newSession:hover {
        background: var(--dsw-alias-interactive-bg-hover);
      }
      body[data-dsh-desktop-ui="dsh"] [data-dsh-workbench-switcher] {
        background: var(--dsk-page-surface);
        border-radius: 10px;
        padding: 2px;
      }
      body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-settings] {
        border-top: 1px solid var(--dsw-alias-border-l1);
        margin-top: 4px;
        padding-top: 6px;
      }

      /* Use the same gray surface across the conversation and its host card. */
      body[data-dsh-desktop-ui="dsh"] .wSkVaW_root {
        background: var(--dsk-content-surface);
      }
      body[data-dsh-desktop-ui="dsh"] [class*="_bubble_"]:not([data-side]):not([data-portal]) {
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 16px;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
      }

      /* Composer: white capsule with a soft contact shadow. */
      body[data-dsh-desktop-ui="dsh"] [data-composer-card] {
        background: var(--dsk-card-surface);
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: var(--dsk-card-radius);
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05), 0 18px 40px -28px rgb(0 0 0 / 0.38);
      }
      body[data-dsh-desktop-ui="dsh"] [data-composer-card]:focus-within {
        border-color: color-mix(in srgb, var(--dsw-static-blue-500) 45%, var(--dsw-alias-border-l2));
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-static-blue-500) 10%, transparent), 0 18px 40px -28px rgb(0 0 0 / 0.38);
      }

      /* Thin scrollbars keep the card surface calm. */
      body[data-dsh-desktop-ui="dsh"] * {
        scrollbar-width: thin;
        scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
      }

      @media (prefers-reduced-motion: reduce) {
        body[data-dsh-desktop-ui="dsh"] [data-dsh-sidebar-root] .hHd-Xa_panelRow {
          transition: none;
        }
      }
    `

    const inject = ['slots', 'locale', 'remote', 'remote.session', 'sessions', 'uiWorkspace', 'layout', 'theme']
    function apply(ctx) {
      const themeStore = {
        subscribe: listener => ctx.on('theme/change', listener),
        snapshot: () => ctx.theme.getTheme().active.colorScheme
      }
      if (typeof document !== 'undefined' && document.querySelector?.('link[href="/desktop-workspace/workspace.css"]')) {
        ctx.effect(() => {
          const root = document.documentElement
          const before = root.classList.contains('dark')
          const sync = () => root.classList.toggle('dark', themeStore.snapshot() === 'dark')
          sync()
          const off = themeStore.subscribe(sync)
          return () => { off(); root.classList.toggle('dark', before) }
        }, 'desktop workspace: mirror the active Harness palette')
      }
      // Ship the card shell as the default UI: tokens stack over the active
      // palette through the theme registry, and the stylesheet is owned here.
      if (typeof ctx.inject === 'function') {
        ctx.inject(['theme'], scoped => {
          if (!scoped.theme || typeof scoped.theme.overrideTokens !== 'function' || typeof scoped.effect !== 'function') return
          scoped.effect(
            () => scoped.theme.overrideTokens('dsh-desktop-ui', UI_TOKENS),
            'desktop ui: theme tokens'
          )
        })
      }
      if (typeof document !== 'undefined' && document.body) {
        ctx.effect(() => {
          document.body.dataset.dshDesktopUi = 'dsh'
          return () => { delete document.body.dataset.dshDesktopUi }
        }, 'desktop ui: body scope')
      }
      ctx.effect(() => {
        const id = 'dsh-desktop-ui-style'
        if (document.getElementById(id) !== null) return
        const style = document.createElement('style')
        style.id = id
        style.dataset.pluginCss = 'dsh-desktop-client-ui'
        style.textContent = UI_STYLE
        document.head.appendChild(style)
        return () => style.remove()
      }, 'desktop ui: shell styles')
      ctx.effect(() => ctx.locale.register(DELETE_SESSION_NS, {
        zh: {
          menu: '永久删除会话', title: '删除会话', close: '关闭', cancel: '取消', confirm: '删除会话',
          description: '确定删除“{name}”？工作区文件会保留。此操作无法撤销。',
          pending: '正在删除会话…', failed: '删除失败，请重试。'
        },
        en: {
          menu: 'Delete session permanently', title: 'Delete session', close: 'Close', cancel: 'Cancel', confirm: 'Delete session',
          description: 'Delete “{name}”? Workspace files are kept. This can’t be undone.',
          pending: 'Deleting session…', failed: 'Deletion failed. Please try again.'
        }
      }))
      const deletion = createSessionDeletion((sessionId) => {
        const workspace = ctx.get('uiWorkspace')
        if (!workspace) throw new Error('Workspace navigation is unavailable')
        return workspace.deleteSession(sessionId)
      })
      ctx.effect(() => () => deletion.dispose())
      const deletionText = ctx.locale.bind(DELETE_SESSION_NS)
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'desktop-delete-session-dialog', locale: DELETE_SESSION_NS,
        inject: () => ({ deletion, t: deletionText })
      }, DeleteSessionDialog))
      const services = {
        sessions: ctx.sessions, workspace: ctx.uiWorkspace, deletion,
        // These optional services belong to the Work view. Other slot occupants
        // (including the enterprise deletion dialog) can activate independently.
        get workspaces() { return ctx.get?.('workspaces')?.list },
        getInput: scope => ctx.get?.('conversation')?.input.for(scope)
      }
      const navigation = installDesktopModes(ctx, services)
      installWorkCompletionNotifications(ctx, navigation)
      if (typeof ctx.inject === 'function') ctx.inject(['desktopWorkbenches'], scoped => {
        scoped.effect(() => navigation.bindWorkbench(scoped.desktopWorkbenches))
      })
      if (typeof ctx.inject === 'function') ctx.inject(['uiConversation'], installWorkToolMessages)
      if (typeof ctx.inject === 'function') ctx.inject(['commandUi', 'inputTriggers', 'conversation', 'remote.skills'], installWorkResources)
      // `remote` and `remote.session` are separate inject names. Reading
      // `ctx.remote` without declaring `remote` throws and unmounts this slot.
      const remote = ctx.remote
      const locale = ctx.locale
      ctx.effect(() => locale.register(LOCAL_OPEN_NS, LOCAL_OPEN_COPY), 'desktop local open locale')
      ctx.effect(() => {
        const id = 'dsh-desktop-preset-toolbar-style'
        let style = document.getElementById(id)
        if (!style || style.tagName !== 'STYLE') {
          style = document.createElement('style')
          style.dataset.plugin = 'dsh-desktop-client-ui'
          style.id = id
        }
        style.textContent = `
          [data-dsh-sidebar-brand-identity] { display:none !important; }
          :root { --dsh-page-title-top-spacing:56px; }
          /* Top-level page titles align with the sidebar brand row. Keep
             conversation chrome and detail/dialog headers in their own layout. */
          [data-plugin-panel] > header[data-window-drag] {
            padding-top:var(--dsh-page-title-top-spacing);
          }
          [data-dsh-preset-heading] { display:flex; align-items:center; flex-wrap:wrap; gap:12px 16px; }
          [data-dsh-preset-heading] h2 { margin:0; }
          [data-dsh-preset-actions] { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:auto; }
          [data-dsh-preset-actions] button { white-space:nowrap; }
          [data-dsh-preset-search] { margin-bottom:16px; }
          [data-dsh-preset-search] input[type=search] {
            box-sizing:border-box; width:100%; min-width:0; height:36px;
            border:1px solid var(--dsw-alias-border-l2); border-radius:10px;
            background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-primary);
            padding:0 12px; font:inherit; font-size:13px;
          }
          [data-dsh-preset-search] input[type=search]::placeholder { color:var(--dsw-alias-label-caption); }
          [data-dsh-preset-search] input[type=search]:focus-visible {
            outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px;
            background:var(--dsw-alias-bg-base);
          }
          [data-textpreview-open-local-wrap] {
            display:flex; flex-direction:column; align-items:center; gap:8px;
            min-width:0; max-width:100%;
          }
          [data-textpreview-open-local] {
            box-sizing:border-box; appearance:none; -webkit-appearance:none;
            display:inline-grid; place-items:center;
            height:36px; margin:0; padding:6px 14px;
            border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md);
            background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary);
            font-family:var(--dsw-font-family); font-size:14px; line-height:20px;
            white-space:nowrap; cursor:pointer;
          }
          [data-textpreview-open-local] > span { grid-area:1 / 1; }
          [data-textpreview-open-local-sizer] { visibility:hidden; }
          [data-textpreview-open-local]:hover:not(:disabled),
          [data-textpreview-open-local]:focus:not(:disabled) {
            background:var(--dsw-alias-interactive-bg-hover);
          }
          [data-textpreview-open-local]:focus-visible {
            outline:2px solid var(--dsw-alias-label-primary); outline-offset:2px;
          }
          [data-textpreview-open-local]:disabled { cursor:default; }
          [data-textpreview-open-local-feedback] {
            margin:0; max-width:100%; color:var(--dsw-alias-label-secondary);
            font-size:12px; line-height:1.5; text-align:center; overflow-wrap:anywhere;
          }
          [data-textpreview-open-local-feedback][data-kind='error'] {
            color:var(--dsw-alias-state-error-primary);
          }
        `
        document.head.appendChild(style)
        return () => style.remove()
      })
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark', inject: () => ({ themeStore }) }, DesktopBrandMark)
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.mark', inject: () => ({ navigation, themeStore }) },
              ConversationBrandMark
            )
          })
        )
      )
      ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
        name: 'conversation.chat.assistant-actions', id: 'desktop-read-response',
        inject: sessionId => ({ sessionId, navigation, services, t: ctx.locale.bind(MODES_NS) })
      }, WorkSpeechAction))
      ctx.slots.inject('conversation.hero.brand.title', () => ctx.slots.register({ name: 'conversation.hero.brand.title', inject: () => ({ navigation, services, t: ctx.locale.bind(MODES_NS) }) }, ConversationBrandTitle))
      ctx.slots.inject('sidebar.right.tab.document.unpreviewable', () =>
        ctx.slots.register({
          name: 'sidebar.right.tab.document.unpreviewable',
          id: 'desktop-open-local',
          locale: LOCAL_OPEN_NS,
          inject: () => ({
            t: locale.bind(LOCAL_OPEN_NS),
            openWorkspacePath: (request) => remote.session.openWorkspacePath(request)
          })
        }, OpenUnpreviewableFile)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-delete-session',
          order: 900,
          locale: DELETE_SESSION_NS,
          inject: () => ({ deletion, t: deletionText })
        }, DeleteSessionMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-open-session-folder',
          order: 800,
          inject: () => ({
            openInFinder: (sessionId) => {
              const cwd = ctx.get('sessions').list.getSnapshot().byId[sessionId]?.cwd
              if (!cwd) throw new Error('Session workspace directory is unavailable')
              return window.dshDesktop.openInFinder(cwd)
            }
          })
        }, OpenSessionFolderMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-unread-session',
          order: 350
        }, UnreadSessionMenuItem)
      )
    }

    exports.createWorkKnowledgeComposer = createWorkKnowledgeComposer
    exports.skillReferenceSource = skillReferenceSource
    exports.toolReferenceSource = toolReferenceSource
    exports.apply = apply
    exports.installWorkCompletionNotifications = installWorkCompletionNotifications
    exports.inject = inject
    return module.exports
  }
})
