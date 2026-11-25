import type { AvailableRelease, UpdateStatus } from '../shared/contracts'

export type UpdateLocale = 'en' | 'zh'

export function updateDownloadLabel(status: UpdateStatus, locale: UpdateLocale, busy = false): string {
  if (busy) return locale === 'zh' ? '正在打开浏览器…' : 'Opening browser…'
  if (status.phase === 'external-download') return locale === 'zh' ? '重新下载' : 'Download again'
  return locale === 'zh' ? '更新' : 'Update'
}

export function shouldShowUpdate(status: UpdateStatus, allowManualPresentation = true): boolean {
  if (['available', 'external-download'].includes(status.phase)) return true
  return allowManualPresentation && status.manual && ['checking', 'up-to-date', 'error', 'unsupported'].includes(status.phase)
}

export function isUpdateDismissed(
  status: UpdateStatus,
  dismissedVersion: string | null,
  dismissedTransientPhase: UpdateStatus['phase'] | null = null
): boolean {
  if (status.availableVersion) return status.availableVersion === dismissedVersion
  return status.phase === dismissedTransientPhase
}

/** A manual request may replay a cached update; progress keeps the same request ID. */
export function isNewManualPresentation(status: UpdateStatus, previous?: UpdateStatus, delivery: 'event' | 'snapshot' = 'event'): boolean {
  if (delivery === 'snapshot') return false
  if (!status.manual) return false
  if (!previous) return true
  if (status.presentationId !== undefined) return status.presentationId !== previous.presentationId
  return status.phase === 'checking' && previous.phase !== 'checking'
}

export interface UpdateHeadline {
  title: string
  description: string
}

/**
 * The card's two lines: what happened, then what it means for the user.
 *
 * The version belongs in the second line rather than the first — a release
 * number answers "which one", not "what now", and reading the state should not
 * require parsing a version string out of a sentence.
 */
export function updateHeadline(status: UpdateStatus, locale: UpdateLocale): UpdateHeadline {
  const zh = locale === 'zh'
  const version = status.availableVersion ? `v${status.availableVersion}` : ''

  switch (status.phase) {
    case 'checking':
      return {
        title: zh ? '正在检查更新' : 'Checking for updates',
        description: zh ? `当前 v${status.currentVersion}` : `Currently on v${status.currentVersion}`
      }
    case 'available':
      return {
        title: zh ? `检测到新版本 ${version}` : `New version ${version} available`,
        description: zh
          ? `${version} 已发布。点击“更新”将在浏览器中下载安装包。`
          : `${version} is available. Click “Update” to download the installer in your browser.`
      }
    case 'external-download':
      return {
        title: zh ? '已打开浏览器下载' : 'Download opened in browser',
        description: zh
          ? '请在浏览器中查看下载进度。下载完成后保存工作并退出 LUOKUI-AI，再打开安装包安装新版。'
          : 'Check the download in your browser. When it finishes, save your work and quit LUOKUI-AI, then run the installer to update.'
      }
    case 'up-to-date':
      return {
        title: zh ? '已是最新版本' : 'Up to date',
        description: zh ? `当前 v${status.currentVersion}` : `Currently on v${status.currentVersion}`
      }
    case 'unsupported':
      return {
        title: zh ? '当前构建不支持在线更新' : 'Online updates are not available',
        description: zh
          ? '当前构建不支持在线更新。'
          : 'Online updates are unavailable in this build.'
      }
    case 'error':
      return {
        title: zh ? '更新失败' : 'Update failed',
        description: zh ? '无法检查更新或打开下载链接。' : 'Unable to check for updates or open the download link.'
      }
    case 'idle':
      return { title: '', description: '' }
  }
}

export function updateMessage(status: UpdateStatus, locale: UpdateLocale): string {
  const zh = locale === 'zh'
  const version = status.availableVersion ? ` ${status.availableVersion}` : ''

  switch (status.phase) {
    case 'checking':
      return zh ? '正在检查更新…' : 'Checking for updates…'
    case 'available':
      return zh
        ? `发现新版本${version}，是否更新？`
        : `LUOKUI-AI${version} is available. Update now?`
    case 'external-download':
      return zh ? '已在浏览器中打开下载' : 'Download opened in your browser'
    case 'up-to-date':
      return zh ? 'LUOKUI-AI 已是最新版本' : 'LUOKUI-AI is up to date'
    case 'unsupported':
      return zh ? '当前构建不支持在线更新。' : 'Online updates are unavailable in this build.'
    case 'error':
      return zh ? '无法检查更新或打开下载链接' : 'Unable to check for updates or open the download link'
    case 'idle':
      return ''
  }
}

/** Compare two dotted versions; prerelease sorts below its release. Mirrors
 * `version-catalog.compareVersions` — a small duplication across the
 * main/preload boundary, kept local so the preload bundle stays standalone.
 * Keep the two implementations in lockstep, including the semver-style
 * numeric prerelease comparison below ("rc.10" > "rc.9"). */
export function comparePreloadVersions(a: string, b: string): number {
  const parse = (value: string): [number[], string] => {
    const [core = '', ...pre] = value.trim().split('-')
    const nums = core.split('.').map((part) => Number.parseInt(part, 10) || 0)
    while (nums.length < 3) nums.push(0)
    return [nums, pre.join('-')]
  }
  const [an, ap] = parse(a)
  const [bn, bp] = parse(b)
  for (let i = 0; i < 3; i += 1) {
    if ((an[i] ?? 0) !== (bn[i] ?? 0)) return (an[i] ?? 0) - (bn[i] ?? 0)
  }
  return comparePrerelease(ap, bp)
}

function comparePrerelease(left: string, right: string): number {
  if (left === right) return 0
  if (!left) return 1
  if (!right) return -1
  const l = left.split('.')
  const r = right.split('.')
  const length = Math.max(l.length, r.length)
  for (let i = 0; i < length; i += 1) {
    const x = l[i]
    const y = r[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      const nx = x.replace(/^0+/, '') || '0'
      const ny = y.replace(/^0+/, '') || '0'
      if (nx.length !== ny.length) return nx.length < ny.length ? -1 : 1
      if (nx !== ny) return nx < ny ? -1 : 1
      continue
    }
    if (xn) return -1
    if (yn) return 1
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

/** The About picker only offers rollback, independent of the server catalogue shape. */
export function rollbackReleases(releases: AvailableRelease[], currentVersion: string): AvailableRelease[] {
  return releases.filter(release => comparePreloadVersions(release.version, currentVersion) < 0)
    .sort((a, b) => comparePreloadVersions(b.version, a.version))
}

export function rollbackEmptyMessage(locale: UpdateLocale): string {
  return locale === 'zh' ? '暂无可回退的历史版本' : 'No older versions available to roll back to'
}
