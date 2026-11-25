import type { AvailableRelease, UpdateStatus } from '../shared/contracts'

export type UpdateLocale = 'en' | 'zh'

export function updateDownloadLabel(status: UpdateStatus, locale: UpdateLocale): string {
  if (status.installationMode === 'manual') return locale === 'zh' ? '下载新版' : 'Download new version'
  return locale === 'zh' ? '更新' : 'Update'
}

export function updateInstallLabel(status: UpdateStatus, locale: UpdateLocale, busy = false): string {
  const zh = locale === 'zh'
  if (status.installationMode === 'manual') {
    if (busy) return zh ? '正在打开并退出…' : 'Opening and quitting…'
    return zh ? '打开安装包并退出' : 'Open installer and quit'
  }
  if (busy) return zh ? '正在重启…' : 'Restarting…'
  return zh ? '重新启动并安装' : 'Restart and install'
}

export function shouldShowUpdate(status: UpdateStatus, allowManualPresentation = true): boolean {
  if (['available', 'downloading', 'downloaded'].includes(status.phase)) return true
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
          ? `${version} 已发布，同意后开始下载。`
          : `${version} is ready to download.`
      }
    case 'downloading':
      return {
        title: zh ? '正在下载更新' : 'Downloading update',
        description: zh ? `${version} · ${Math.round(status.percent ?? 0)}%` : `${version} · ${Math.round(status.percent ?? 0)}%`
      }
    case 'downloaded':
      if (status.installationMode === 'manual') {
        return {
          title: zh ? '更新已就绪' : 'Update ready',
          description: zh
            ? `${version} 已下载完成，请先保存工作。点击“打开安装包并退出”后，BISHENG 将打开安装包并自动退出。然后将新版拖到“应用程序”并替换旧版本。`
            : `${version} has downloaded. Save your work first. Click “Open installer and quit” to open the installer and automatically quit BISHENG. Then drag the new app to Applications and replace the old version.`
        }
      }
      return {
        title: zh ? '更新已就绪' : 'Update ready',
        description: zh
          ? `${version} 将在重启后生效。`
          : `${version} will be applied on next launch.`
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
        description: zh ? '无法检查或下载更新。' : 'Unable to check for or download updates.'
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
        : `BISHENG${version} is available. Update now?`
    case 'downloading': {
      const percent = Math.round(status.percent ?? 0)
      return zh ? `正在下载更新 ${percent}%` : `Downloading update ${percent}%`
    }
    case 'downloaded':
      return zh ? `BISHENG${version} 已下载完成` : `BISHENG${version} is ready to install`
    case 'up-to-date':
      return zh ? 'BISHENG 已是最新版本' : 'BISHENG is up to date'
    case 'unsupported':
      return zh ? '当前构建不支持在线更新。' : 'Online updates are unavailable in this build.'
    case 'error':
      return zh ? '无法检查或下载更新' : 'Unable to check for or download updates'
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
