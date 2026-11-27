window.__ModuleLoader__.load({
  id: 'dsh-desktop-settings',
  factory: (require) => {
    const React = require('react')
    const { createPortal } = require('react-dom')
    const { createElement: h, useEffect, useRef, useState } = React
    const { Tooltip, Menu, MenuItemButton, Modal, IconSettingsOutlineRegular, IconChecklistOutlineRegular, IconChecklistOutlineMedium, IconPaperPlaneOutlineMedium, IconAlarmClockOutlineMedium, IconGaugeOutlineMedium, IconApiOutlineMedium, IconInfoOutlineMedium, IconUserOutlineMedium, IconChevronDownOutlineRegular, IconCloseOutlineRegular } = require('@deepseek-ai/dsh-client-ui-primitives')
    const NS = 'desktop.settings'
    const COPY = {
      zh: {
        accountMenu: '账号菜单', enterpriseAccount: '企业账号', signedOut: '未登录', deviceOnly: '本机模式', signInHint: '登录后可使用企业功能', identityLoading: '正在读取账号…', identityError: '暂时无法读取账号', settings: '设置', accountSettings: '账号设置', approvals: '消息', approvalsPending: '待处理审批', phone: '连接手机', login: '登录企业账号', logout: '退出登录', logoutBody: '退出后需要重新登录企业账号。本机设置、已安装插件和本地数据保留。', logoutFailed: '退出登录未完成，请重试。', cancel: '取消', again: '重试', close: '关闭', loggingOut: '正在退出登录…',
        creditsRemaining: '剩余积分', creditsUnavailable: '积分暂不可用',
        activity: '活动', less: '少', more: '多', totalTokens: '累计 Token', totalMessages: '累计消息',
        contributionTitle: '今年的贡献', contributionUnit: '次', metricTotalTokens: '累计词元', metricPeakTokens: '峰值词元', metricLongestTask: '最长任务', metricStreak: '最长连续记录', days: '{count} 天',
        modeWeek: '每周', modeMonth: '每月', modeYear: '每年', heatmapAria: '用量活动热力图', heatmapTile: '{time} · {tokens} Token · {messages} 条消息',
        trendTitle: '词元', trendEmpty: '暂无词元数据', trendAria: '词元趋势', today: '今天',
        tokenWan: '{value}万', tokenYi: '{value}亿', numberLocale: 'zh-CN', modelUsage: '模型用量', tokens: 'Token 用量', messages: '消息数', storage: '个人存储空间', unlimited: '不限', storageValue: '已使用 {used} / {limit}', breakdown: '输入 {input} Token · 输出 {output} Token', missingUsage: '{count} 条记录缺少 Token 用量', usageError: '用量统计加载失败，请重试。', storageError: '存储空间加载失败，请重试。', noUsage: '暂无用量记录', unavailable: '—',
        openContent: '进入设置内容', usage: '用量与存储', about: '关于与帮助', tasks: '我的审批', requests: '我的申请', notifications: '通知', ai: 'AI 助手接入', loading: '正在加载企业设置…', error: '暂时无法加载企业设置，请检查连接后重试。', restart: '请完全退出并重新启动客户端，以启用统一设置。', unsupported: '平台暂不支持统一设置，请联系管理员更新平台。', retry: '重新连接', signIn: '登录企业账号后可查看', openAccount: '前往账号设置', desktopVersion: 'LUOKUI-AI 版本', harnessVersion: 'Harness 版本', infoError: '无法读取版本信息', update: '检查更新', logs: '查看日志', recovery: '安全模式与插件恢复', localHint: '本机设置仍可正常使用。', actionError: '操作未完成，请重试。',
      },
      en: {
        accountMenu: 'Account menu', enterpriseAccount: 'Enterprise account', signedOut: 'Not signed in', deviceOnly: 'Device only', signInHint: 'Sign in to use enterprise features', identityLoading: 'Loading account…', identityError: 'Account unavailable', settings: 'Settings', accountSettings: 'Account settings', approvals: 'Messages', approvalsPending: 'Pending approvals', phone: 'Connect phone', login: 'Sign in', logout: 'Log out', logoutBody: 'You will need to sign in again. Device settings, installed plugins and local data are kept.', logoutFailed: 'Logout did not complete. Try again.', cancel: 'Cancel', again: 'Retry', close: 'Close', loggingOut: 'Logging out…',
        creditsRemaining: 'Credits remaining', creditsUnavailable: 'Credits unavailable',
        activity: 'Activity', less: 'Less', more: 'More', totalTokens: 'Total tokens', totalMessages: 'Total messages',
        contributionTitle: "This year's contributions", contributionUnit: 'times', metricTotalTokens: 'Total tokens', metricPeakTokens: 'Peak tokens', metricLongestTask: 'Longest task', metricStreak: 'Longest streak', days: '{count} days',
        modeWeek: 'Weekly', modeMonth: 'Monthly', modeYear: 'Yearly', heatmapAria: 'Usage activity heatmap', heatmapTile: '{time} · {tokens} tokens · {messages} messages',
        trendTitle: 'Tokens', trendEmpty: 'No token data yet', trendAria: 'Token trend', today: 'Today',
        tokenWan: '{value} ten thousand', tokenYi: '{value} hundred million', numberLocale: 'en-US', modelUsage: 'Model usage', tokens: 'Token usage', messages: 'Messages', storage: 'Personal storage', unlimited: 'Unlimited', storageValue: 'Used {used} / {limit}', breakdown: 'Input {input} tokens · Output {output} tokens', missingUsage: '{count} records are missing token usage', usageError: 'Usage statistics failed to load. Please retry.', storageError: 'Storage failed to load. Please retry.', noUsage: 'No usage recorded', unavailable: '—',
        openContent: 'Enter settings content', usage: 'Usage and storage', about: 'About and help', tasks: 'My approvals', requests: 'My requests', notifications: 'Notifications', ai: 'AI assistant access', loading: 'Loading enterprise settings…', error: 'Enterprise settings could not load. Check the connection and try again.', restart: 'Quit and restart the desktop app to enable unified settings.', unsupported: 'This platform does not support unified settings yet. Ask your administrator to update it.', retry: 'Reconnect', signIn: 'Sign in to view enterprise settings', openAccount: 'Open account settings', desktopVersion: 'LUOKUI-AI version', harnessVersion: 'Harness version', infoError: 'Could not read version information', update: 'Check for updates', logs: 'Show logs', recovery: 'Safe Mode and plugin recovery', localHint: 'Device settings remain available.', actionError: 'The action did not complete. Try again.',
      }
    }
    const openAccount = () => window.dispatchEvent(new CustomEvent('dsh-desktop:open-settings-section', { detail: { id: 'enterprise-account' } }))

    /** The approvals rail is a vertical list, so it answers the up/down keys the settings nav uses. */
    function navigateSections(event, ids, active, select, refs) {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || !ids.length) return
      event.preventDefault()
      const index = Math.max(0, ids.indexOf(active))
      const next = ids[event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + ids.length) % ids.length]
      select(next); refs.current[next]?.focus()
    }

    /** A single surface owner feeds geometry to the existing Chat/Work presenter. */
    function RemoteSettings({ section, t }) {
      const target = useRef(null)
      const [state, setState] = useState({ phase: 'idle', connected: false })
      const [failed, setFailed] = useState(false)
      const alive = useRef(true)
      useEffect(() => {
        const bridge = window.dshEnterpriseChat
        if (!bridge) return
        alive.current = true
        let disposed = false, revision = 0
        const receive = next => { revision++; if (!disposed) setState(next) }
        const unsubscribe = bridge.subscribe(receive)
        const request = revision
        void bridge.state().then(next => { if (!disposed && request === revision) receive(next) }).catch(() => { if (!disposed && request === revision) setFailed(true) })
        return () => { disposed = true; alive.current = false; unsubscribe() }
      }, [])
      useEffect(() => {
        if (!state.connected || state.settingsProtocolVersion !== 1 || !target.current) return
        const token = `${section}:${Math.random()}`
        const node = target.current
        const publish = () => {
          const rect = node.getBoundingClientRect()
          const clip = node.closest('[data-dsh-settings-content], [data-dsh-approvals-content]')?.getBoundingClientRect() || rect
          const x = Math.max(rect.x, clip.x), y = Math.max(rect.y, clip.y)
          window.dispatchEvent(new CustomEvent('dsh-desktop:settings-surface', { detail: { token, section, bounds: { x: Math.max(0, x), y: Math.max(0, y), width: Math.max(0, Math.min(rect.right, clip.right) - x), height: Math.max(0, Math.min(rect.bottom, clip.bottom) - y) } } }))
        }
        const resize = new ResizeObserver(publish)
        resize.observe(node)
        const clip = node.closest('[data-dsh-settings-content], [data-dsh-approvals-content]')
        if (clip) resize.observe(clip)
        window.addEventListener('resize', publish)
        window.addEventListener('scroll', publish, true)
        publish()
        return () => {
          resize.disconnect(); window.removeEventListener('resize', publish); window.removeEventListener('scroll', publish, true)
          window.dispatchEvent(new CustomEvent('dsh-desktop:settings-surface', { detail: { token, close: true } }))
        }
      }, [section, state.connected, state.settingsProtocolVersion])
      useEffect(() => {
        const focus = event => {
          if (event.detail?.section !== section) return
          const approvals = target.current?.closest('[data-dsh-approvals]')
          if (approvals) {
            approvals.querySelector(event.detail.direction === 'previous' ? '[data-dsh-approvals-nav] [aria-current=true]' : '[data-dsh-approvals-close]')?.focus()
          } else {
            document.querySelector(event.detail.direction === 'previous' ? '[data-dsh-settings-section] [aria-current="true"]' : '[data-dsh-settings-close]')?.focus()
          }
        }
        window.addEventListener('dsh-desktop:settings-focus', focus)
        return () => window.removeEventListener('dsh-desktop:settings-focus', focus)
      }, [section])
      const failure = failed || state.settingsFailure || state.phase === 'error'
      const supported = state.settingsProtocolVersion === 1
      const ready = supported && state.settingsSection === section && state.settingsReady
      return h('div', { ref: target, className: 'dshSettingsRemote', tabIndex: ready ? 0 : -1, role: 'group', 'aria-label': t('openContent'), onFocus: () => { if (ready) void window.dshEnterpriseChat.focusSettings().catch(() => { if (alive.current) setFailed(true) }) }, 'aria-busy': state.connected && supported && !ready && !failure },
        !state.connected ? h('div', { className: 'dshSettingsStatus' },
          h('p', null, t('signIn')), h('p', { className: 'dshSettingsHint' }, t('localHint')),
          h('button', { type: 'button', onClick: openAccount }, t('openAccount')))
          : !supported ? h('div', { className: 'dshSettingsStatus', role: 'status' }, h('p', null, t('restart')))
          : !ready && h('div', { className: 'dshSettingsStatus', role: failure ? 'alert' : 'status' },
            h('p', null, t(state.settingsFailure === 'unsupported' ? 'unsupported' : failure ? 'error' : 'loading')),
            failure && h('button', { type: 'button', onClick: () => { setFailed(false); setState(previous => ({ ...previous, phase: 'loading', settingsFailure: undefined, settingsReady: false })); void window.dshEnterpriseChat.retry().catch(() => { if (alive.current) setFailed(true) }) } }, t('retry'))))
    }

    const USAGE_COVER_DATA_URI = 'data:image/jpeg;base64,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'
    const USAGE_DAY_MS = 24 * 60 * 60 * 1000
    const USAGE_SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000
    const USAGE_MODE_COLUMNS = { week: 1, month: 6, year: 38 }

    function usageDateKey(input) {
      const time = typeof input === 'number' ? input : Date.parse(input)
      return new Date(time + USAGE_SHANGHAI_OFFSET_MS).toISOString().slice(0, 10)
    }
    function usageShanghaiMidnight(time) {
      return Math.floor((time + USAGE_SHANGHAI_OFFSET_MS) / USAGE_DAY_MS) * USAGE_DAY_MS - USAGE_SHANGHAI_OFFSET_MS
    }
    function usageWeekdayIndex(time) {
      return (new Date(time + USAGE_SHANGHAI_OFFSET_MS).getUTCDay() + 6) % 7
    }
    function usageLevel(value, maximum) {
      if (value == null || !Number.isFinite(value) || value <= 0 || maximum <= 0) return 0
      return Math.min(5, Math.max(1, Math.ceil((value / maximum) * 5)))
    }
    /** Rolling windows: week 7 days, month 42 days, year 266 days. Mode names are density labels only. */
    function buildHeatmapLayout(points, mode, metric = 'tokens', now = Date.now()) {
      const columns = USAGE_MODE_COLUMNS[mode] || USAGE_MODE_COLUMNS.year
      const end = usageShanghaiMidnight(Math.min(now, Date.parse(points.at(-1)?.end_at ?? '') || now)) + USAGE_DAY_MS
      const start = end - columns * 7 * USAGE_DAY_MS
      const byDate = new Map()
      for (const point of points) byDate.set(usageDateKey(point.start_at), point)
      const valueOf = point => point ? (metric === 'tokens' ? point.total_tokens : point.message_count) : null
      const maximum = Math.max(0, ...Array.from(byDate.values()).map(point => valueOf(point) ?? 0))
      const cells = []
      for (let index = 0; index < columns * 7; index++) {
        const time = start + index * USAGE_DAY_MS
        const date = usageDateKey(time)
        const point = byDate.get(date)
        const future = time > now
        cells.push({ key: date, date, row: usageWeekdayIndex(time), column: Math.floor(index / 7), level: future ? 0 : usageLevel(valueOf(point), maximum), point, state: future ? 'future' : point ? 'observed' : 'outside' })
      }
      return { mode, rows: 7, columns, cells }
    }
    function sumCurrentYearMessages(points, now = Date.now()) {
      const year = new Date(now + USAGE_SHANGHAI_OFFSET_MS).getUTCFullYear()
      return points.reduce((total, point) => new Date(Date.parse(point.start_at) + USAGE_SHANGHAI_OFFSET_MS).getUTCFullYear() === year ? total + point.message_count : total, 0)
    }
    function peakTokens(points) {
      const values = points.map(point => point.total_tokens).filter(value => value != null)
      return values.length ? Math.max(...values) : null
    }
    function longestMessageStreak(points) {
      const dates = [...new Set(points.filter(point => point.message_count > 0).map(point => usageDateKey(point.start_at)))]
        .sort()
        .map(date => Date.parse(`${date}T00:00:00+08:00`))
      let longest = 0, current = 0, previous = null
      for (const date of dates) {
        current = previous != null && date - previous === USAGE_DAY_MS ? current + 1 : 1
        longest = Math.max(longest, current)
        previous = date
      }
      return longest
    }
    function tokenDeltaPercent(points) {
      const usable = points.filter(point => point.total_tokens != null).map(point => ({ date: usageDateKey(point.start_at), value: point.total_tokens }))
      if (usable.length < 2) return null
      const end = Date.parse(`${usable.at(-1).date}T00:00:00+08:00`)
      const current = usable.filter(point => Date.parse(`${point.date}T00:00:00+08:00`) > end - 30 * USAGE_DAY_MS)
      const previous = usable.filter(point => {
        const time = Date.parse(`${point.date}T00:00:00+08:00`)
        return time > end - 60 * USAGE_DAY_MS && time <= end - 30 * USAGE_DAY_MS
      })
      if (!current.length || !previous.length) return null
      const currentTotal = current.reduce((sum, point) => sum + point.value, 0)
      const previousTotal = previous.reduce((sum, point) => sum + point.value, 0)
      return previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null
    }
    function formatDeltaPercent(value) {
      if (value == null || !Number.isFinite(value)) return null
      const rounded = Math.round(value * 10) / 10
      return `${rounded >= 0 ? '+' : ''}${rounded}%`
    }
    function usageInitials(name) {
      const source = String(name || '').trim() || '—'
      return source.slice(0, 2).toUpperCase()
    }
    function formatTokenAmount(value, locale, t) {
      if (value == null) return { compact: t('unavailable'), exact: null }
      const exact = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
      if (locale.startsWith('zh')) {
        const levels = [[1_000_000_000_000, 1_000_000_000_000, '万亿'], [100_000_000_000, 100_000_000_000, '千亿'], [100_000_000, 100_000_000, '亿'], [10_000, 10_000, '万']]
        const level = levels.find(([threshold]) => value >= threshold)
        if (!level) return { compact: exact, exact }
        const scaled = value / level[1]
        const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(scaled)
        return { compact: `${number}${level[2]}`, exact }
      }
      const compact = value < 1000 ? exact : new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value)
      return { compact, exact }
    }
    function usageDateLabel(iso, locale) {
      return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.parse(iso) + USAGE_SHANGHAI_OFFSET_MS))
    }
    function usageTrendPoints(points, locale) {
      return points.map(point => ({ label: usageDateLabel(point.start_at, locale), value: point.total_tokens, total_tokens: point.total_tokens, message_count: point.message_count, start_at: point.start_at, end_at: point.end_at }))
    }
    function usageTrendBounds(data, points, locale, todayLabel) {
      const start = points[0]?.start_at ?? data?.start_at
      const end = points.at(-1)?.end_at ?? data?.end_at
      const endIsToday = end ? Math.abs(Date.now() - Date.parse(end)) < USAGE_DAY_MS : false
      return {
        startLabel: start ? usageDateLabel(start, locale) : '',
        endLabel: !end ? '' : endIsToday ? todayLabel : usageDateLabel(end, locale)
      }
    }

    function UsageIdentityCard({ identity, profile, t, children }) {
      const [coverFailed, setCoverFailed] = useState(false)
      const [avatarFailed, setAvatarFailed] = useState(false)
      const name = identity?.username || identity?.display_name || identity?.id || ''
      const handle = (profile?.department_name || '').trim().replace(/^@/, '')
      const avatar = profile?.avatar
      return h('section', { className: 'dshUsageIdentity', 'data-usage-identity': '' },
        h('div', { className: `dshUsageCover${coverFailed ? ' dshUsageCoverFallback' : ''}`, 'aria-hidden': 'true' },
          !coverFailed && h('img', { src: USAGE_COVER_DATA_URI, alt: '', onError: () => setCoverFailed(true) })),
        h('div', { className: 'dshUsageIdentityBody' },
          h('span', { className: 'dshUsageAvatar' },
            avatar && !avatarFailed
              ? h('img', { src: avatar, alt: '', onError: () => setAvatarFailed(true) })
              : h('span', { 'aria-hidden': 'true' }, usageInitials(name))),
          h('div', { className: 'dshUsageIdentityCopy' },
            h('p', { className: 'dshUsageName', 'data-usage-display-name': '' }, name || t('unavailable')),
            handle && h('p', { className: 'dshUsageHandle' }, `@${handle}`)),
          children))
    }

    function UsageActivity({ layout, mode, onMode, metric, onMetric, t, breakdown, labelFor }) {
      const scroll = useRef(null)
      useEffect(() => {
        const node = scroll.current
        if (node) node.scrollLeft = node.scrollWidth - node.clientWidth
      }, [layout.mode, layout.columns, metric])
      const modeLabels = { week: t('modeWeek'), month: t('modeMonth'), year: t('modeYear') }
      const metricLabels = { tokens: t('tokens'), messages: t('messages') }
      const empty = !layout.cells.some(cell => cell.point && (cell.point.message_count > 0 || (cell.point.total_tokens ?? 0) > 0))
      return h('section', { className: 'dshUsageActivity', 'data-usage-activity': layout.mode },
        h('header', { className: 'dshUsageActivityHeader' },
          h('h3', null, t('activity')),
          h('div', { className: 'dshUsageSwitches' },
            h('div', { className: 'dshUsageMetricSwitch', role: 'group' },
              ...Object.entries(metricLabels).map(([key, label]) => h('button', { key, type: 'button', 'aria-pressed': metric === key ? 'true' : 'false', onClick: () => onMetric(key) }, label))),
            h('div', { className: 'dshUsageModeSwitch', role: 'group', 'aria-label': t('heatmapAria') },
              ...Object.entries(modeLabels).map(([key, label]) => h('button', { key, type: 'button', 'aria-pressed': mode === key ? 'true' : 'false', onClick: () => onMode(key) }, label))))),
        h('div', { className: 'dshUsageHeatmapScroll', ref: scroll },
          h('div', { className: 'dshUsageHeatmap', role: 'list', 'aria-label': t('heatmapAria'), style: { '--dsh-usage-columns': layout.columns } },
            ...layout.cells.map(cell => h('div', { key: cell.key, role: 'listitem', style: { gridRow: cell.row + 1, gridColumn: cell.column + 1 } },
              h(Tooltip, { label: labelFor(cell), side: 'top', portal: true },
                h('button', { type: 'button', className: 'dshUsageCell', 'data-level': cell.level, 'data-state': cell.state, 'data-date': cell.date, tabIndex: cell.state === 'observed' ? 0 : -1, 'aria-label': labelFor(cell) })))))),
        empty && h('p', { className: 'dshUsageNote', role: 'status' }, t('noUsage')),
        h('div', { className: 'dshUsageHeatmapFooter' },
          h('div', { className: 'dshUsageLegend', 'aria-hidden': 'true' },
            h('span', null, t('less')),
            ...[0, 1, 2, 3, 4, 5].map(level => h('span', { key: level, className: 'dshUsageCell', 'data-level': level })),
            h('span', null, t('more'))),
          h('p', { className: 'dshUsageNote', style: { visibility: metric === 'tokens' ? 'visible' : 'hidden' }, 'aria-hidden': metric !== 'tokens' },
            breakdown)))
    }

    function UsageTrendCard({ points, totalLabel, data, locale, t }) {
      const gradientId = React.useId().replace(/:/g, '')
      const [active, setActive] = useState(null)
      const width = 600, height = 200, padTop = 27, padBottom = 2
      const numeric = points.map(point => point.value).filter(value => value != null)
      const maximum = Math.max(0, ...numeric)
      const hasData = numeric.length > 0
      const coordinate = points.map((point, index) => ({
        x: points.length <= 1 ? width / 2 : (index / (points.length - 1)) * width,
        y: point.value == null || maximum <= 0 ? height - padBottom : height - padBottom - (point.value / maximum) * (height - padTop - padBottom),
        value: point.value
      }))
      const segments = []
      let index = 0
      while (index < coordinate.length) {
        const zero = coordinate[index].value === 0
        let end = index
        while (end + 1 < coordinate.length && (coordinate[end + 1].value === 0) === zero) end += 1
        segments.push({ key: `${zero ? 'idle' : 'run'}-${index}`, dashed: zero, points: coordinate.slice(Math.max(0, index - (zero ? 0 : 1)), Math.min(coordinate.length, end + (zero ? 0 : 2))) })
        index = end + 1
      }
      const areaPath = coordinate.length ? `M ${coordinate[0].x} ${height - padBottom} ${coordinate.map(point => `L ${point.x} ${point.y}`).join(' ')} L ${coordinate.at(-1).x} ${height - padBottom} Z` : ''
      const delta = formatDeltaPercent(tokenDeltaPercent(points))
      const activePoint = active != null ? points[active] : null
      const bounds = usageTrendBounds(data, points, locale, t('today'))
      return h('section', { className: 'dshUsageTrend', 'data-usage-trend': '' },
        h('div', { className: 'dshUsageTrendHead' },
          h('p', { className: 'dshUsageTrendLabel' }, activePoint?.label ?? t('trendTitle')),
          h('div', { className: 'dshUsageTrendValue' },
            h('p', null, activePoint?.value != null ? formatTokenAmount(activePoint.value, locale, t).compact : totalLabel),
            delta && h('span', { className: 'dshUsageDelta' }, delta))),
        hasData
          ? h(React.Fragment, null,
            h('div', { className: 'dshUsageChart', style: { height } },
              h('svg', { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': t('trendAria'), onPointerLeave: () => setActive(null) },
                h('defs', null, h('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' },
                  h('stop', { offset: '0%', stopColor: 'var(--dsw-alias-state-business-primary)', stopOpacity: '0.32' }),
                  h('stop', { offset: '100%', stopColor: 'var(--dsw-alias-state-business-primary)', stopOpacity: '0' }))),
                areaPath && h('path', { d: areaPath, fill: `url(#${gradientId})`, stroke: 'none' }),
                ...segments.map(segment => h('polyline', { key: segment.key, points: segment.points.map(point => `${point.x},${point.y}`).join(' '), fill: 'none', stroke: segment.dashed ? 'var(--dsw-alias-border-l2)' : 'var(--dsw-alias-state-business-primary)', strokeWidth: '2', strokeDasharray: segment.dashed ? '5 5' : undefined, vectorEffect: 'non-scaling-stroke' })),
                active != null && coordinate[active] && h(React.Fragment, null,
                  h('line', { x1: coordinate[active].x, x2: coordinate[active].x, y1: padTop, y2: height - padBottom, stroke: 'var(--dsw-alias-border-l2)', strokeDasharray: '4 4', vectorEffect: 'non-scaling-stroke' }),
                  h('circle', { cx: coordinate[active].x, cy: coordinate[active].y, r: '5', fill: 'var(--dsw-alias-state-business-primary)', stroke: 'var(--dsw-alias-bg-layer-2)', strokeWidth: '3', vectorEffect: 'non-scaling-stroke' })),
                ...coordinate.map((point, item) => h('rect', { key: item, x: point.x - (width / Math.max(1, coordinate.length)) / 2, y: 0, width: width / Math.max(1, coordinate.length), height, fill: 'transparent', onPointerEnter: () => setActive(item) })))),
            h('div', { className: 'dshUsageTrendAxis' },
              h('p', null, bounds.startLabel),
              h('p', null, bounds.endLabel)))
          : h('p', { className: 'dshUsageNote', role: 'status' }, t('trendEmpty')))
    }

    function Usage({ t, identity, profile, models }) {
      const [state, setState] = useState({ phase: 'loading' })
      const [metric, setMetric] = useState('tokens')
      const [mode, setMode] = useState('year')
      const [identityProfile, setIdentityProfile] = useState(profile ?? null)
      const [attempt, setAttempt] = useState(0)
      useEffect(() => {
        let disposed = false, revision = 0, identity, phase, pending = false
        const bridge = window.dshEnterpriseChat
        const receive = (next, requested = false) => {
          if (!bridge?.usage) { setState({ phase: 'unsupported' }); return }
          const key = `${next.epoch}:${next.connected}`
          const changed = key !== identity
          const ready = next.phase === 'ready' && phase !== 'ready'
          identity = key
          phase = next.phase
          if (changed) { revision++; pending = false }
          if (!next.connected) { setState({ phase: 'signedOut' }); return }
          if (next.phase === 'error' && !requested) { setState({ phase: 'error' }); return }
          if (pending || (!changed && !ready && !requested)) return
          const request = ++revision
          pending = true
          setState({ phase: 'loading' })
          void bridge.usage().then(data => {
            if (!disposed && request === revision) { pending = false; setState({ phase: 'ready', data }) }
          }).catch(() => {
            if (!disposed && request === revision) { pending = false; setState({ phase: 'error' }) }
          })
        }
        const unsubscribe = bridge?.subscribe(next => { if (!disposed) receive(next) })
        const initial = revision
        if (bridge?.usage) void bridge.state().then(next => { if (!disposed && initial === revision) receive(next, true) }).catch(() => { if (!disposed && initial === revision) setState({ phase: 'error' }) })
        else setState({ phase: 'unsupported' })
        return () => { disposed = true; revision++; unsubscribe?.() }
      }, [attempt])
      useEffect(() => {
        setIdentityProfile(profile ?? null)
        if (profile !== undefined || state.phase !== 'ready') return
        const request = window.dshEnterpriseChat?.profile
        if (!request) return
        let disposed = false
        void request().then(next => { if (!disposed) setIdentityProfile(next ?? null) }).catch(() => { if (!disposed) setIdentityProfile(null) })
        return () => { disposed = true }
      }, [profile, state.phase, state.data])
      const locale = t('numberLocale')
      const size = (value, unit) => `${Number((unit === 'MB' ? value * 1024 : value).toFixed(2))} ${unit}`
      const data = state.data?.summary.status === 'ready' ? state.data.summary.data : null
      const storage = state.data?.storage
      const quota = storage?.status === 'ready' ? storage.data : null
      const unit = (quota?.limit === -1 ? quota.used : quota?.limit) < 1 ? 'MB' : 'GB'
      const failure = key => h('div', { className: 'dshSettingsStatus', role: 'alert' }, h('p', null, t(key)), h('button', { type: 'button', onClick: () => setAttempt(value => value + 1) }, t('again')))
      const column = children => h('div', { className: 'dshUsageColumn' }, children)
      let content
      if (state.phase === 'signedOut') content = column(h('div', { className: 'dshSettingsStatus' }, h('p', null, t('signIn')), h('button', { type: 'button', onClick: openAccount }, t('openAccount'))))
      else if (state.phase !== 'ready') content = column(h('div', { className: 'dshSettingsStatus', role: state.phase === 'error' ? 'alert' : 'status' }, h('p', null, t(state.phase === 'unsupported' ? 'restart' : state.phase === 'error' ? 'usageError' : 'loading')), state.phase === 'error' && h('button', { type: 'button', onClick: () => setAttempt(value => value + 1) }, t('again'))))
      else if (!data) content = column(failure('usageError'))
      else {
        const points = Array.isArray(data.points) ? data.points : []
        const layout = buildHeatmapLayout(points, mode, metric)
        const totalToken = formatTokenAmount(data.totals.total_tokens, locale, t)
        const peak = peakTokens(points)
        const streak = longestMessageStreak(points)
        const labelFor = cell => {
          const tokens = cell.point?.total_tokens
          return t('heatmapTile', {
            time: cell.date,
            tokens: tokens == null ? t('unavailable') : new Intl.NumberFormat(locale).format(tokens),
            messages: cell.point?.message_count ?? 0
          })
        }
        const breakdown = t('breakdown', { input: formatTokenAmount(data.totals.input_tokens, locale, t).compact, output: formatTokenAmount(data.totals.output_tokens, locale, t).compact })
        content = column(h(React.Fragment, null,
          h(UsageIdentityCard, { identity, profile: identityProfile, t },
            h('div', { className: 'dshUsageContribution', 'data-usage-contribution': '' },
              h('p', { className: 'dshUsageCaption' }, t('contributionTitle')),
              h('div', { className: 'dshUsageContributionValue' },
                h('p', { className: 'dshUsageContributionCount' }, `${sumCurrentYearMessages(points).toLocaleString(locale)} ${t('contributionUnit')}`))),
            h('div', { className: 'dshUsageTiles', 'data-usage-metrics': '' },
              ...[[t('metricTotalTokens'), totalToken.compact, totalToken.exact], [t('metricPeakTokens'), peak == null ? t('unavailable') : formatTokenAmount(peak, locale, t).compact], [t('metricLongestTask'), t('unavailable')], [t('metricStreak'), t('days', { count: streak })]].map(([label, value, title], index) =>
                h('div', { key: index, className: 'dshUsageTile', 'data-usage-metric': label, title: title ?? value },
                  h('p', { className: 'dshUsageTileValue' }, value),
                  h('p', { className: 'dshUsageTileLabel' }, label)))),
            h(UsageActivity, { layout, mode, onMode: setMode, metric, onMetric: setMetric, t, breakdown, labelFor })),
          h(UsageTrendCard, { points: usageTrendPoints(points, locale), totalLabel: totalToken.compact, data, locale, t }),
          data.totals.missing_usage_count > 0 && h('p', { className: 'dshUsageNote dshUsageWarning', role: 'status' }, t('missingUsage', { count: data.totals.missing_usage_count }))))
      }
      return h('section', { className: 'dshSettingsSection dshUsage', 'aria-busy': state.phase === 'loading' },
        content,
        state.phase === 'ready' && (storage?.status === 'error'
          ? failure('storageError')
          : storage?.status === 'ready' && h('div', { className: 'dshUsageColumn' },
            h('div', { className: 'dshUsageStorage' }, h('span', null, t('storage')), h('span', null, quota ? t('storageValue', { used: size(quota.used, unit), limit: quota.limit === -1 ? t('unlimited') : size(quota.limit, unit) }) : t('unavailable'))),
            quota && quota.limit !== -1 && h('progress', { className: 'dshUsageProgress', value: quota.limit > 0 ? Math.min(1, quota.used / quota.limit) : 1, max: 1, 'aria-label': t('storage') }))),
        models && h('div', { className: 'dshUsageColumn dshUsageModels' }, models))
    }

    function AiAccess({ t }) { return h('section', { className: 'dshSettingsSection' }, h('h2', null, t('ai')), h(RemoteSettings, { section: 'ai-access', t })) }
    const APPROVAL_SECTIONS = [['my-tasks', 'tasks'], ['my-requests', 'requests'], ['notifications', 'notifications']]

    /** Rail glyphs follow the native settings nav: one 16px outline icon per section. */
    function approvalsIcon(id) {
      if (id === 'my-requests') return h(IconPaperPlaneOutlineMedium, { className: 'dshApprovalsNavIcon', size: 16 })
      if (id === 'notifications') return h(IconAlarmClockOutlineMedium, { className: 'dshApprovalsNavIcon', size: 16 })
      return h(IconChecklistOutlineMedium, { className: 'dshApprovalsNavIcon', size: 16 })
    }

    /** Same two-column frame as the native settings panel: a section rail beside one owned content column. */
    function ApprovalsPanel({ onClose, t }) {
      const titleId = React.useId()
      const refs = useRef({})
      const [section, setSection] = useState('my-tasks')
      return h('div', { 'data-dsh-approvals': '', className: 'dshApprovalsPanel' },
        h('nav', { 'data-dsh-approvals-nav': '', className: 'dshApprovalsNav', 'aria-labelledby': titleId },
          h('div', { className: 'dshApprovalsNavTitle', id: titleId }, t('approvals')),
          h('div', { className: 'dshApprovalsNavList', onKeyDown: event => navigateSections(event, APPROVAL_SECTIONS.map(([id]) => id), section, setSection, refs) },
            ...APPROVAL_SECTIONS.map(([id, key]) => h('button', { key: id, ref: node => { refs.current[id] = node }, type: 'button', className: 'dshApprovalsNavCell', 'aria-current': section === id ? 'true' : undefined, 'data-modal-autofocus': section === id ? '' : undefined, onClick: () => setSection(id) },
              approvalsIcon(id), h('span', { className: 'dshApprovalsNavLabel' }, t(key)))))),
        h('div', { className: 'dshApprovalsContent' },
          h('div', { className: 'dshApprovalsHeader' },
            h('button', { type: 'button', className: 'dshApprovalsClose', 'data-dsh-approvals-close': '', 'aria-label': t('close'), onClick: onClose }, h(IconCloseOutlineRegular, { size: 14 }))),
          h('div', { 'data-dsh-approvals-content': '', className: 'dshApprovalsOptions' }, h(RemoteSettings, { key: section, section, t }))))
    }
    function About({ t }) {
      const [info, setInfo] = useState()
      const alive = useRef(true)
      const [error, setError] = useState('')
      const [busy, setBusy] = useState(false)
      useEffect(() => {
        let disposed = false
        alive.current = true
        void window.dshDesktop?.settingsInfo?.().then(value => { if (!disposed) setInfo(value) }).catch(() => { if (!disposed) setError('infoError') })
        return () => { disposed = true; alive.current = false }
      }, [])
      const run = async action => {
        setBusy(true); setError('')
        try { await window.dshDesktop.settingsAction(action) }
        catch { if (alive.current) setError('actionError') }
        finally { if (alive.current) setBusy(false) }
      }
      return h('section', { className: 'dshSettingsSection' },
        h('h2', null, t('about')),
        h('dl', { className: 'dshSettingsVersions' }, ...[['desktopVersion', info?.desktopVersion], ['harnessVersion', info?.harnessVersion]].flatMap(([key, value]) => [h('dt', { key: `${key}:label` }, t(key)), h('dd', { key }, value || '—')])),
        h('div', { className: 'dshSettingsButtons' },
          ...[['check-for-updates', 'update'], ['show-harness-log', 'logs'], ['safe-mode', 'recovery']].map(([action, label]) => h('button', { key: action, type: 'button', disabled: busy, onClick: () => run(action) }, t(label)))),
        error && h('p', { role: 'alert' }, t(error)))
    }
    /** Reuse the host enterprise endpoints; neither credentials nor account storage live here. */
    async function accountRequest(operation, signal) {
      const path = operation === 'logout' ? '/api/enterprise.logout' : '/api/enterprise.state'
      const response = await fetch(path, { credentials: 'same-origin', signal, ...(operation === 'logout' ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' } : {}) })
      const result = await response.json()
      if (!response.ok || !result || typeof result !== 'object' || typeof result.connected !== 'boolean' || result.ok === false || (operation === 'logout' && result.connected)) throw new Error('Enterprise account request failed')
      return result
    }

    function useAccountIdentity() {
      const [account, setAccount] = useState()
      const [error, setError] = useState(false)
      const [busy, setBusy] = useState(false)
      const lifetime = useRef({ alive: true, revision: 0, request: undefined })
      const refresh = React.useCallback(async () => {
        const current = lifetime.current
        current.request?.abort()
        const request = new AbortController(), revision = ++current.revision
        current.request = request
        try {
          const next = await accountRequest('state', request.signal)
          if (current.alive && revision === current.revision) { setAccount(next); setError(false) }
        } catch {
          if (current.alive && revision === current.revision && !request.signal.aborted) setError(true)
        }
      }, [])
      useEffect(() => {
        lifetime.current.alive = true
        const changed = () => { void refresh() }
        let identity
        const unsubscribe = window.dshEnterpriseChat?.subscribe(next => {
          const key = `${next.epoch}:${next.connected}`
          if (key === identity) return
          identity = key
          if (!next.connected) setAccount({ connected: false })
          void refresh()
        })
        window.addEventListener('dsh-desktop:enterprise-account-changed', changed)
        void refresh()
        return () => {
          lifetime.current.alive = false; lifetime.current.revision++; lifetime.current.request?.abort(); lifetime.current.action?.abort()
          unsubscribe?.(); window.removeEventListener('dsh-desktop:enterprise-account-changed', changed)
        }
      }, [refresh])
      const logout = async () => {
        const current = lifetime.current
        current.request?.abort(); current.revision++
        const request = new AbortController()
        current.action = request
        setBusy(true)
        try {
          const next = await accountRequest('logout', request.signal)
          if (current.alive) { setAccount(next); setError(false); window.dispatchEvent(new CustomEvent('dsh-desktop:enterprise-account-changed')) }
        } finally { if (current.alive) setBusy(false) }
      }
      return { account, error, busy, refresh, logout }
    }

    function ApprovalsDialog({ open, onClose, t }) {
      useEffect(() => {
        window.dispatchEvent(new CustomEvent('dsh-desktop:approvals-visibility', { detail: { open } }))
        return () => window.dispatchEvent(new CustomEvent('dsh-desktop:approvals-visibility', { detail: { open: false } }))
      }, [open])
      return h(Modal, { open, onClose, title: t('approvals'), headless: true, className: 'dshApprovalsDialog' },
        open && h(ApprovalsPanel, { onClose, t }))
    }

    function AccountAvatar({ avatarUrl }) {
      const [failed, setFailed] = useState(false)
      return h('span', { className: 'dshAccountAvatar', 'aria-hidden': 'true' },
        avatarUrl && !failed
          ? h('img', { src: avatarUrl, width: 28, height: 28, alt: '', referrerPolicy: 'no-referrer', style: { borderRadius: '50%', objectFit: 'cover' }, onError: () => setFailed(true) })
          : h('img', { src: '/dsh-desktop-logo-light.png', width: 20, height: 20, alt: '' }))
    }

    function AccountMenuIcon({ kind }) {
      const frame = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': 'true' }
      if (kind === 'phone') return h('svg', frame, h('rect', { x: 6, y: 2, width: 12, height: 20, rx: 2 }), h('path', { d: 'M10 5h4M11 19h2' }))
      if (kind === 'account') return h('svg', frame, h('circle', { cx: 12, cy: 8, r: 3.5 }), h('path', { d: 'M5 21a7 7 0 0 1 14 0' }))
      // Sign in points into the panel; sign out points away from it.
      return h('svg', frame, h('path', { d: kind === 'login' ? 'M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l4 4-4 4M3 12h11' : 'M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M13 7l5 5-5 5M8 12h13' }))
    }

    function AccountBadge({ count }) {
      return h('span', { className: 'dshAccountBadge' }, count > 99 ? '99+' : String(count))
    }

    /** Outstanding approvals are advisory presentation data reported by the enterprise document. */
    function useApprovalsPending() {
      const [pending, setPending] = useState(0)
      useEffect(() => {
        const bridge = window.dshEnterpriseChat
        if (!bridge) return undefined
        let disposed = false
        const read = next => {
          if (disposed) return
          const value = next?.connected ? next.navigation?.approvals?.pending : 0
          setPending(Number.isInteger(value) && value > 0 ? value : 0)
        }
        const unsubscribe = bridge.subscribe(read)
        void bridge.state().then(read).catch(() => { /* The badge stays hidden until the host reports again. */ })
        return () => { disposed = true; unsubscribe() }
      }, [])
      return pending
    }

    /** Signing out is destructive, so it is confirmed outside the menu and keeps its own retry. */
    function LogoutDialog({ open, busy, failed, onCancel, onConfirm, t }) {
      useEffect(() => {
        if (!open) return undefined
        const publish = value => window.dispatchEvent(new CustomEvent('dsh-desktop:account-dialog-visibility', { detail: { open: value } }))
        publish(true)
        return () => publish(false)
      }, [open])
      return h(Modal, {
        open, title: t('logout'), closeLabel: t('close'), description: t('logoutBody'), className: 'dshAccountDialog',
        onClose: () => { if (!busy) onCancel() },
        footer: h('div', { className: 'dshAccountDialogActions' },
          h('button', { type: 'button', 'data-modal-autofocus': '', disabled: busy, onClick: onCancel }, t('cancel')),
          h('button', { type: 'button', className: 'dshAccountDialogDanger', 'data-dsh-logout-confirm': '', disabled: busy, onClick: onConfirm }, t(busy ? 'loggingOut' : 'logout')))
      }, failed && h('p', { className: 'dshAccountDialogError', role: 'alert' }, t('logoutFailed')))
    }

    function AccountLauncher({ wide: sidebarWide, settingsOpen, openSettings, settingsShortcut, t }) {
      const identity = useAccountIdentity()
      const pending = useApprovalsPending()
      const [workspace, setWorkspace] = useState(null)
      const wide = workspace ? workspace.wide : sidebarWide
      const [menuOpen, setMenuOpen] = useState(false)
      const [approvalsOpen, setApprovalsOpen] = useState(false)
      const [logoutOpen, setLogoutOpen] = useState(false)
      const [logoutFailed, setLogoutFailed] = useState(false)
      const [actionBusy, setActionBusy] = useState(false)
      const [actionError, setActionError] = useState(false)
      const alive = useRef(true)
      const trigger = useRef(null)
      React.useLayoutEffect(() => {
        const sync = () => {
          const seat = document.querySelector('[data-workspace-account-slot]')
          const next = seat && { seat, wide: seat.dataset.workspaceAccountSlot === 'expanded' }
          setWorkspace(previous => previous?.seat === next?.seat && previous?.wide === next?.wide ? previous : next)
        }
        const event = 'luokui:workspace-account-slot-ready'
        document.addEventListener(event, sync)
        sync()
        return () => document.removeEventListener(event, sync)
      }, [])
      useEffect(() => { setMenuOpen(false) }, [workspace?.seat])
      const closeApprovals = React.useCallback(() => { setApprovalsOpen(false); trigger.current?.focus() }, [])
      const closeLogout = React.useCallback(() => { setLogoutOpen(false); setLogoutFailed(false); trigger.current?.focus() }, [])
      useEffect(() => {
        alive.current = true
        // Sign-in also broadcasts this event at startup; only an open dialog owns return focus.
        const close = () => {
          if (approvalsOpen) closeApprovals()
          if (logoutOpen) closeLogout()
        }
        window.addEventListener('dsh-desktop:close-settings', close)
        return () => { alive.current = false; window.removeEventListener('dsh-desktop:close-settings', close) }
      }, [approvalsOpen, logoutOpen, closeApprovals, closeLogout])
      useEffect(() => { if (settingsOpen) { setMenuOpen(false); setApprovalsOpen(false); setLogoutOpen(false); setLogoutFailed(false) } }, [settingsOpen])
      useEffect(() => {
        if (identity.account?.connected === false) { setApprovalsOpen(false); setLogoutOpen(false) }
      }, [identity.account?.connected])
      const name = [identity.account?.user?.display_name, identity.account?.user?.username, identity.account?.user?.id].find(value => typeof value === 'string' && value.trim())
      const label = name || t(identity.account ? 'signedOut' : identity.error ? 'identityError' : 'identityLoading')
      const connected = identity.account?.connected === true
      const avatarUrl = connected ? identity.account?.user?.avatar_url : undefined
      const quota = identity.account?.usage
      const credits = !identity.error && quota && quota.source !== 'unavailable' && quota.quota_state !== 'unavailable'
        && Number.isFinite(quota.limit) && Number.isFinite(quota.used)
        ? new Intl.NumberFormat(t('numberLocale'), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.max(0, quota.limit - quota.used) / 1_000_000)
        : null
      const busy = actionBusy || identity.busy
      useEffect(() => {
        if (!menuOpen || busy) return undefined
        // Clicking the native Chat WebContents does not emit pointerdown in this document.
        const close = () => setMenuOpen(false)
        window.addEventListener('blur', close)
        return () => window.removeEventListener('blur', close)
      }, [menuOpen, busy])
      // A failed read and a failed action share one retry row; the action takes precedence.
      const failure = actionError ? 'actionError' : identity.error ? 'identityError' : undefined
      const pairPhone = async () => {
        if (busy) return
        setActionBusy(true); setActionError(false)
        try {
          await window.dshDesktop.openPhonePairing()
          if (alive.current) { setMenuOpen(false); setApprovalsOpen(false) }
        } catch { if (alive.current) { setActionError(true); setMenuOpen(true) } }
        finally { if (alive.current) setActionBusy(false) }
      }
      const openAccountSettings = () => { setMenuOpen(false); openSettings(); openAccount() }
      const confirmLogout = async () => {
        if (busy) return
        setActionBusy(true); setLogoutFailed(false)
        try {
          await identity.logout()
          if (alive.current) { setLogoutOpen(false); setApprovalsOpen(false); trigger.current?.focus() }
        } catch { if (alive.current) setLogoutFailed(true) }
        finally { if (alive.current) setActionBusy(false) }
      }
      const badge = pending > 0 ? h(AccountBadge, { count: pending }) : null
      const triggerLabel = `${t('accountMenu')}: ${label}${pending > 0 ? ` · ${t('approvalsPending')} ${pending}` : ''}`
      const menuStyle = workspace ? ' dshAccountMenuWorkspace dshWorkspacePopup' : wide ? ' dshAccountMenuWide' : ''
      const launcherClass = workspace ? 'dshAccountLauncher dshAccountLauncherWorkspace' : 'dshAccountLauncher'
      // The sidebar menu does not cover the native Chat view or own its presentation.
      const launcher = h('div', { className: launcherClass, 'data-dsh-account-launcher': '' },
        h(Menu, { open: menuOpen, animatePresence: Boolean(workspace), onClose: () => { if (!busy) setMenuOpen(false) }, side: 'top', align: 'start', portal: true, autoFocus: true, className: 'dshAccountMenuAnchor', listClassName: `dshAccountMenu${menuStyle}`,
          anchor: h('button', { ref: trigger, type: 'button', className: `dshAccountTrigger${wide ? '' : ' dshAccountTriggerRail'}`, 'aria-label': triggerLabel, title: wide ? undefined : label, 'aria-haspopup': 'menu', 'aria-expanded': menuOpen, disabled: settingsOpen || busy, onClick: () => { setMenuOpen(previous => !previous); setActionError(false); void identity.refresh() } },
            h('span', { className: 'dshAccountAvatarWrap' }, h(AccountAvatar, { key: avatarUrl, avatarUrl }), badge),
            wide && h('span', { className: 'dshAccountTriggerCopy' }, h('span', null, label)), wide && h(IconChevronDownOutlineRegular)) },
          h('div', { className: 'dshAccountMenuIdentity', 'data-dsh-sidebar-account-menu': '' }, h(AccountAvatar, { key: avatarUrl, avatarUrl }), h('div', null, h('strong', null, label), h('small', null, t(connected ? 'enterpriseAccount' : 'signInHint'))),
            connected && h('div', { className: 'dshAccountMenuCredits', role: 'status' }, h('strong', null, credits ?? '—'), h('small', null, t(credits === null ? 'creditsUnavailable' : 'creditsRemaining')))),
          h(MenuItemButton, { icon: h(IconSettingsOutlineRegular), shortcut: settingsShortcut, disabled: busy, onSelect: () => { setMenuOpen(false); openSettings() } }, t('settings')),
          connected && h(MenuItemButton, { icon: h(AccountMenuIcon, { kind: 'account' }), disabled: busy, onSelect: openAccountSettings }, t('accountSettings')),
          h(MenuItemButton, { icon: h(IconChecklistOutlineRegular), disabled: busy || !connected, onSelect: () => { setMenuOpen(false); setApprovalsOpen(true) } },
            h('span', { className: 'dshAccountMenuRow' }, t('approvals'), badge)),
          h(MenuItemButton, { icon: h(AccountMenuIcon, { kind: 'phone' }), disabled: busy, onSelect: () => { void pairPhone() } }, t('phone')),
          connected
            ? h(MenuItemButton, { icon: h(AccountMenuIcon, { kind: 'logout' }), separatorBefore: true, danger: true, disabled: busy, onSelect: () => { setMenuOpen(false); setLogoutFailed(false); setLogoutOpen(true) } }, t('logout'))
            : h(MenuItemButton, { icon: h(AccountMenuIcon, { kind: 'login' }), separatorBefore: true, disabled: busy, onSelect: openAccountSettings }, t('login')),
          failure && h('p', { className: 'dshAccountMenuError', role: 'alert' }, t(failure)),
          failure && h(MenuItemButton, { disabled: busy, onSelect: () => { if (actionError) { void pairPhone(); return } setActionError(false); void identity.refresh() } }, t('again'))))
      return h(React.Fragment, null, workspace ? createPortal(launcher, workspace.seat) : launcher,
        h(ApprovalsDialog, { open: approvalsOpen, onClose: closeApprovals, t }),
        h(LogoutDialog, { open: logoutOpen, busy, failed: logoutFailed, onCancel: closeLogout, onConfirm: () => { void confirmLogout() }, t }))
    }

    const NAV_GLYPHS = { 'enterprise-account': IconUserOutlineMedium, 'desktop-usage': IconGaugeOutlineMedium, 'desktop-ai-access': IconApiOutlineMedium, 'desktop-about': IconInfoOutlineMedium }
    function SettingsNavigation({ rows, renderEntry }) {
      return rows.map(row => renderEntry(row, NAV_GLYPHS[row.id] ? { icon: NAV_GLYPHS[row.id] } : undefined))
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, COPY), 'desktop-settings: dictionaries')
      const t = ctx.locale.bind(NS)
      ctx.effect(() => {
        const style = document.createElement('style')
        // Claim ownership immediately: a different lazy factory must not adopt
        // this effect-created stylesheet and remove it during its own HMR.
        style.dataset.plugin = 'dsh-desktop-settings'
        style.dataset.pluginCss = 'dsh-desktop-settings'
        style.textContent = `
          .dshUsage{min-width:0}
          .dshUsageColumn{display:flex;flex-direction:column;gap:16px;width:100%;max-width:680px;margin:0 auto;min-width:0}
          .dshUsageIdentity{position:relative;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:24px;background:var(--dsw-alias-bg-layer-2)}
          .dshUsageCover{position:absolute;inset:0 0 auto;height:165px;overflow:hidden;border-radius:23px 23px 0 0;background:var(--dsw-alias-interactive-bg-hover)}
          .dshUsageCover img{display:block;width:100%;height:165px;object-fit:cover;object-position:50% 45%}
          .dshUsageCoverFallback{background:linear-gradient(120deg,var(--dsw-alias-state-business-primary),var(--dsw-alias-bg-layer-2))}
          .dshUsageIdentityBody{position:relative;display:flex;flex-direction:column;gap:15px;padding:124px 16px 16px}
          .dshUsageAvatar{display:flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;overflow:hidden;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:30px;font-weight:500;line-height:42px}
          .dshUsageAvatar img{width:100%;height:100%;object-fit:cover}
          .dshUsageIdentityCopy{display:flex;flex-direction:column;gap:4px;min-width:0}
          .dshUsageName{margin:0;font-size:20px;line-height:26px;font-weight:500;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .dshUsageHandle{margin:0;font-size:11px;line-height:16px;font-weight:500;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .dshUsageCaption{margin:0 0 2px;font-size:14px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-secondary)}
          .dshUsageContributionValue{display:flex;align-items:center;gap:8px}
          .dshUsageContributionCount{margin:0;font-size:24px;line-height:34px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
          .dshUsageDelta{border-radius:999px;padding:2px 8px;font-size:12px;line-height:16px;font-weight:500;color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent)}
          .dshUsageTiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
          .dshUsageTile{display:flex;flex-direction:column;align-items:flex-start;min-width:0;padding:10px;border-radius:16px;background:var(--dsw-alias-interactive-bg-hover)}
          .dshUsageTileValue{width:100%;margin:0;font-size:14px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .dshUsageTileLabel{width:100%;margin:0;font-size:13px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .dshUsageActivity{display:flex;flex-direction:column;gap:6px;min-width:0}
          .dshUsageActivityHeader{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:6px 2px 0}
          .dshUsageActivityHeader h3{margin:0;font-size:13px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-secondary)}
          .dshUsageSwitches{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
          .dshUsageMetricSwitch,.dshUsageModeSwitch{display:flex;align-items:center;gap:8px;font-size:13px;line-height:18px}
          .dshUsageSwitches button{font:inherit;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);padding:2px 6px;border-radius:6px;cursor:pointer}
          .dshUsageSwitches button[aria-pressed=true]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);font-weight:500}
          .dshUsageHeatmapScroll{overflow-x:auto;padding-bottom:4px}
          .dshUsageHeatmap{display:grid;gap:4px;width:max-content;grid-template-columns:repeat(var(--dsh-usage-columns,38),13px);grid-template-rows:repeat(7,13px)}
          .dshUsage .dshUsageHeatmap .dshUsageCell{box-sizing:border-box;width:13px;height:13px;border:0;padding:0;border-radius:3px;background:var(--dsw-alias-interactive-bg-hover);outline:none;cursor:default;transition:transform .12s ease}
          .dshUsage .dshUsageCell[data-level='1']{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 22%,var(--dsw-alias-interactive-bg-hover))}
          .dshUsage .dshUsageCell[data-level='2']{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 40%,var(--dsw-alias-interactive-bg-hover))}
          .dshUsage .dshUsageCell[data-level='3']{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 62%,var(--dsw-alias-interactive-bg-hover))}
          .dshUsage .dshUsageCell[data-level='4']{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 82%,var(--dsw-alias-interactive-bg-hover))}
          .dshUsage .dshUsageCell[data-level='5']{background:var(--dsw-alias-state-business-primary)}
          .dshUsage .dshUsageCell[data-state='future'],.dshUsage .dshUsageCell[data-state='outside']{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-border-l2) 70%,transparent)}
          .dshUsage button.dshUsageCell:hover{transform:scale(1.1)}
          .dshUsage button.dshUsageCell:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,transparent)}
          .dshUsageHeatmapFooter{display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;margin-top:10px}
          .dshUsageLegend{display:flex;align-items:center;gap:4px;margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary)}
          .dshUsageLegend .dshUsageCell{box-sizing:border-box;width:9px;height:9px;border:0;border-radius:3px;background:var(--dsw-alias-interactive-bg-hover)}
          .dshUsageNote{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
          .dshUsageTrend{display:flex;flex-direction:column;border-radius:20px;background:var(--dsw-alias-interactive-bg-hover);padding:12px 0}
          .dshUsageTrendHead{position:relative;z-index:1;display:flex;flex-direction:column;gap:2px;margin-bottom:-32px;padding:4px 16px 0}
          .dshUsageTrendLabel{margin:0;font-size:14px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-secondary)}
          .dshUsageTrendValue{display:flex;align-items:center;gap:8px;min-width:0}
          .dshUsageTrendValue p{margin:0;font-size:20px;line-height:26px;font-weight:500;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .dshUsageChart{width:100%}
          .dshUsageChart svg{display:block;width:100%;height:100%;overflow:visible}
          .dshUsageTrendAxis{display:flex;justify-content:space-between;gap:8px;padding:8px 16px 4px;font-size:11px;line-height:15px;letter-spacing:.2px;color:var(--dsw-alias-label-tertiary)}
          .dshUsageTrendAxis p{margin:0}
          .dshUsageStorage{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:14px;padding-top:4px}
          .dshUsageStorage>span:last-child{color:var(--dsw-alias-label-secondary)}
          .dshUsageProgress{width:100%;height:6px;margin-top:10px;accent-color:var(--dsw-alias-state-business-primary)}
          .dshUsageModels{min-width:0}
          @media(min-width:640px){.dshUsageTiles{display:flex}.dshUsageTile{flex:1}}
          @media(max-width:639px){.dshUsageCover,.dshUsageCover img{height:120px}.dshUsageIdentityBody{padding-top:96px}}
          @media(prefers-reduced-motion:reduce){.dshUsageCell{transition:none}.dshUsageCell:hover{transform:none}}
          .dshSettingsSection{color:var(--dsw-alias-label-primary)}.dshSettingsSection h2{font-size:18px;font-weight:600;margin:0 0 20px}.dshSettingsRemote{height:max(360px,calc(min(800px,100vh - 80px) - 220px));position:relative;min-width:0}
          .dshSettingsStatus{padding:24px 0;font-size:14px}.dshSettingsTabs{display:flex;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2);padding-bottom:12px;margin-bottom:8px}
          .dshSettingsSection button:not([role=tab]),.dshSettingsStatus button{font:inherit;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:var(--dsw-radius-md);padding:7px 12px;cursor:pointer}
          .dshSettingsSection button:not([role=tab]):hover,.dshSettingsStatus button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshSettingsSection button:not([role=tab])[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover);font-weight:600}.dshSettingsSection button:not([role=tab]):disabled{opacity:.5;cursor:default}
          .dshSettingsVersions{display:grid;grid-template-columns:1fr auto;gap:20px;padding:20px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:14px}.dshSettingsVersions dd{margin:0;color:var(--dsw-alias-label-secondary)}.dshSettingsButtons{display:flex;gap:12px;padding:20px 0;flex-wrap:wrap}
          .dshAccountLauncher,.dshAccountMenuAnchor{display:block;width:100%;min-width:0}.dshAccountTrigger{anchor-name:--dsh-desktop-account-trigger;display:flex;align-items:center;gap:10px;width:100%;min-width:0;height:48px;box-sizing:border-box;padding:6px 10px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}.dshAccountTrigger:hover,.dshAccountTrigger[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}.dshAccountTrigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.dshAccountTrigger:disabled{cursor:default}.dshAccountTriggerRail{width:36px;height:36px;padding:4px;margin:auto;justify-content:center}.dshAccountTrigger>svg{flex:none;color:var(--dsw-alias-label-tertiary)}
          .dshAccountAvatar{display:flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border-radius:50%;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:11px;font-weight:600}.dshAccountAvatarWrap{position:relative;display:flex;flex:none}.dshAccountBadge{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--dsw-alias-state-error-primary);color:#fff;font-size:10px;font-weight:600;line-height:1}.dshAccountAvatarWrap>.dshAccountBadge{position:absolute;top:-4px;right:-6px}.dshAccountMenuRow{display:flex;align-items:center;gap:8px;min-width:0}.dshAccountTriggerCopy{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;font-size:13px}.dshAccountTriggerCopy>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshAccountTriggerCopy small,.dshAccountMenuIdentity small{color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:400}
          /* The portal follows the real trigger width; override Menu's inline 12px viewport clamp to keep both edges aligned. */
          .dshAccountMenu{min-width:248px;max-width:min(320px,calc(100vw - 24px))}.dshAccountMenuWide{position-anchor:--dsh-desktop-account-trigger;box-sizing:border-box;width:anchor-size(width);min-width:0;max-width:none;left:anchor(left)!important}.dshAccountMenuIdentity{display:flex;align-items:center;gap:12px;padding:10px 10px 14px;margin-bottom:4px;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}.dshAccountMenuIdentity>div{display:flex;flex-direction:column;gap:4px;min-width:0}.dshAccountMenuIdentity strong{font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshAccountMenuError{font-size:12px;line-height:1.5;padding:4px 10px;color:var(--dsw-alias-label-secondary)}
          .dshAccountMenuIdentity>.dshAccountMenuCredits{flex:none;margin-left:auto;text-align:right;max-width:48%}.dshAccountMenuCredits strong{font-variant-numeric:tabular-nums}.dshAccountMenuIdentity>div:not(.dshAccountMenuCredits){flex:1;min-width:0}
          .dshAccountLauncherWorkspace {
            font-family: var(--dsh-font-family-text-default, system-ui);
          }
          .dshAccountLauncherWorkspace .dshAccountTrigger {
            border-radius: 12px;
          }
          .dshAccountMenu.dshAccountMenuWorkspace {
            width: min(265px, calc(100vw - 32px));
            min-width: 0;
            max-width: none;
          }
          .dshAccountMenuWorkspace .dshAccountMenuIdentity {
            margin: 0 0 4px;
            padding: 9px 8px 10px;
          }
          .dshAccountDialog{width:min(420px,100%)}.dshAccountDialogActions{display:flex;justify-content:flex-end;gap:8px}.dshAccountDialogActions button{font:inherit;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:var(--dsw-radius-md);padding:7px 14px;cursor:pointer}.dshAccountDialogActions button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshAccountDialogActions button:disabled{opacity:.5;cursor:default}.dshAccountDialogActions .dshAccountDialogDanger{border-color:transparent;background:var(--dsw-alias-state-error-primary);color:#fff}.dshAccountDialogActions .dshAccountDialogDanger:hover{background:var(--dsw-alias-state-error-primary);opacity:.9}.dshAccountDialogError{margin:0;font-size:13px;line-height:1.5;color:var(--dsw-alias-state-error-primary)}
          /* 1080 = 188 导航 + 48 内边距 + 844 嵌入视口。网页的审批列表/详情双栏挂在 Tailwind md(768px) 视口断点上，
             嵌入区窄于 768px 会退回单栏，所以弹窗宽度要留出这条余量；窗口放不下时仍按 100% 收缩并回到单栏。 */
          .dshApprovalsDialog{width:min(1080px,100%);height:min(800px,100%);max-height:100%;padding:0;gap:0}.dshApprovalsPanel{display:flex;flex:1;min-height:0;min-width:0}
          .dshApprovalsNav{box-sizing:border-box;display:flex;flex-direction:column;flex:none;gap:18px;width:188px;min-height:0;padding:22px 12px;overflow-y:auto}.dshApprovalsNavTitle{padding:0 12px;color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500;line-height:24px}.dshApprovalsNavList{display:flex;flex-direction:column;gap:4px;overflow-y:auto}
          .dshApprovalsNavCell{box-sizing:border-box;display:flex;align-items:center;gap:8px;height:40px;padding:9px 16px 9px 12px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;font-weight:400;line-height:22px;text-align:left;cursor:pointer}.dshApprovalsNavCell:hover{background:var(--dsw-specific-sidebar-nav-item-hover)}.dshApprovalsNavCell[aria-current=true]{background:var(--dsw-specific-sidebar-nav-item-active)}.dshApprovalsNavIcon{flex:none}.dshApprovalsNavLabel{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .dshApprovalsContent{display:flex;flex-direction:column;flex:1;min-width:0}.dshApprovalsHeader{box-sizing:border-box;display:flex;flex:none;align-items:flex-start;justify-content:flex-end;gap:8px;height:54px;padding:20px 14px 8px 10px}.dshApprovalsClose{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}.dshApprovalsClose:hover{background:var(--dsw-alias-interactive-bg-hover)}
          .dshApprovalsOptions{display:flex;flex-direction:column;flex:1;min-height:0;padding:0 24px 24px}.dshApprovalsOptions .dshSettingsRemote{flex:1;min-height:0;height:auto}

          @media(max-width:640px){.dshSettingsRemote{height:max(300px,calc(100vh - 280px))}.dshApprovalsNav{width:152px;gap:14px;padding:18px 8px}.dshApprovalsOptions{padding:0 16px 16px}}
        `
        document.head.appendChild(style)
        return () => style.remove()
      }, 'desktop-settings: owned styles')
      const register = (name, id, Component, extra = {}) => ctx.slots.inject(name, () => ctx.slots.register({ name, id, locale: NS, ...extra, inject: () => ({ t }) }, Component))
      register('desktop.account.usage', 'desktop-usage', Usage)
      register('settings.section', 'desktop-about', About, { order: 90, label: () => t('about') })
      ctx.effect(() => {
        let disposed = false, disposeEntry, revision = 0
        const sync = state => {
          revision++
          const allowed = state.connected && state.navigation?.settings?.aiAccess === true
          if (allowed && !disposeEntry) disposeEntry = register('settings.section', 'desktop-ai-access', AiAccess, { order: 80, label: () => t('ai') })
          if (!allowed) { disposeEntry?.(); disposeEntry = undefined }
        }
        const unsubscribe = window.dshEnterpriseChat?.subscribe(sync)
        const request = revision
        void window.dshEnterpriseChat?.state().then(state => { if (!disposed && request === revision) sync(state) }).catch(() => { /* Unavailable capability stays hidden until the next host state. */ })
        return () => { disposed = true; unsubscribe?.(); disposeEntry?.() }
      }, 'desktop-settings: account capabilities')
      register('settings.launcher', 'desktop-account-menu', AccountLauncher)
      // The shell only has glyphs for its native sections and falls back to the gear; the Bisheng
      // sections get theirs here, through the shell's own row so selection and focus stay native.
      ctx.slots.inject('settings.navigation', () => ctx.slots.register({ name: 'settings.navigation', id: 'desktop-nav-glyphs', inject: () => ({ t }) }, SettingsNavigation))
    }
    return { apply, inject: ['slots', 'locale'], helpers: { buildHeatmapLayout, sumCurrentYearMessages, peakTokens, longestMessageStreak, tokenDeltaPercent, formatDeltaPercent } }
  }
})
