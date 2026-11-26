window.__ModuleLoader__.load({
  id: 'dsh-desktop-settings',
  factory: (require) => {
    const React = require('react')
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

    function AccountAvatar({ name }) {
      return h('span', { className: 'dshAccountAvatar', 'aria-hidden': 'true' }, name ? Array.from(name).slice(0, 2).join('').toLocaleUpperCase() : h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }, h('circle', { cx: 12, cy: 8, r: 4 }), h('path', { d: 'M4 22v-2a8 8 0 0 1 16 0v2' })))
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

    function AccountLauncher({ wide, settingsOpen, openSettings, settingsShortcut, t }) {
      const identity = useAccountIdentity()
      const pending = useApprovalsPending()
      const [menuOpen, setMenuOpen] = useState(false)
      const [approvalsOpen, setApprovalsOpen] = useState(false)
      const [logoutOpen, setLogoutOpen] = useState(false)
      const [logoutFailed, setLogoutFailed] = useState(false)
      const [actionBusy, setActionBusy] = useState(false)
      const [actionError, setActionError] = useState(false)
      const alive = useRef(true)
      const trigger = useRef(null)
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
      // The sidebar menu does not cover the native Chat view or own its presentation.
      return h('div', { className: 'dshAccountLauncher', 'data-dsh-account-launcher': '' },
        h(Menu, { open: menuOpen, onClose: () => { if (!busy) setMenuOpen(false) }, side: 'top', align: 'start', portal: true, autoFocus: true, className: 'dshAccountMenuAnchor', listClassName: `dshAccountMenu${wide ? ' dshAccountMenuWide' : ''}`,
          anchor: h('button', { ref: trigger, type: 'button', className: `dshAccountTrigger${wide ? '' : ' dshAccountTriggerRail'}`, 'aria-label': triggerLabel, title: wide ? undefined : label, 'aria-haspopup': 'menu', 'aria-expanded': menuOpen, disabled: settingsOpen || busy, onClick: () => { setMenuOpen(previous => !previous); setActionError(false); void identity.refresh() } },
            h('span', { className: 'dshAccountAvatarWrap' }, h(AccountAvatar, { name }), badge),
            wide && h('span', { className: 'dshAccountTriggerCopy' }, h('span', null, label)), wide && h(IconChevronDownOutlineRegular)) },
          h('div', { className: 'dshAccountMenuIdentity', 'data-dsh-sidebar-account-menu': '' }, h(AccountAvatar, { name }), h('div', null, h('strong', null, label), h('small', null, t(connected ? 'enterpriseAccount' : 'signInHint'))),
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
          failure && h(MenuItemButton, { disabled: busy, onSelect: () => { if (actionError) { void pairPhone(); return } setActionError(false); void identity.refresh() } }, t('again'))),
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
