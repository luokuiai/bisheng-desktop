import { app, BrowserWindow, ipcMain, powerMonitor, type IpcMainInvokeEvent } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserUpdater } from './browser-updater'
import type { UpdateStatus } from '../../shared/contracts'
import {
  AUTO_INSTALL_ON_APP_QUIT,
  shouldCheckAfterResume,
  supportsAutoUpdates,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_STARTUP_DELAY_MS,
  UPDATE_STARTUP_JITTER_MS
} from './update-policy'
import {
  initialUpdateStatus,
  reduceUpdateStatus,
  normalizeReleaseNotes,
  type UpdateStateEvent
} from './update-state'
import {
  readSkippedVersion,
  shouldOfferUpdate,
  skippedVersionPath,
  writeSkippedVersion
} from './skipped-version'

let autoUpdater: BrowserUpdater
let updaterReady = Promise.resolve()
const TRANSIENT_STATUS_MS = 8_000
const UPDATES_UNAVAILABLE_MESSAGE = 'Online updates are unavailable in this build.'

let status = initialUpdateStatus(app.getVersion())
let startupTimer: NodeJS.Timeout | undefined
let intervalTimer: NodeJS.Timeout | undefined
let checkPromise: Promise<unknown> | undefined
let lastCheckedAt = 0
let openingDownload = false
let started = false
let handlersRegistered = false
let updateLocale: (() => 'en' | 'zh') | undefined
let skippedVersion: string | undefined
let skipLoaded = false
let manualCheck = false
let manualCheckRequested = false
let packagedFeedEnabled: boolean | undefined

export function getUpdateStatus(): UpdateStatus {
  return { ...status, locale: updateLocale?.() }
}

export function registerUpdateHandlers(options: { locale?: () => 'en' | 'zh'; assertTrusted?: (event: IpcMainInvokeEvent) => void } = {}): void {
  updateLocale = options.locale ?? updateLocale
  if (handlersRegistered) return
  handlersRegistered = true
  ipcMain.handle('updates:status', () => getUpdateStatus())
  ipcMain.handle('updates:check', () => checkForUpdates(true))
  ipcMain.handle('updates:open-download', event => {
    if (!options.assertTrusted) throw new Error('The update download handler requires a trusted main-window sender.')
    options.assertTrusted(event)
    return openUpdateDownload()
  })
  ipcMain.handle('updates:skip', (_event, version: unknown) => skipUpdate(version))
}

function skipFile(): string {
  return skippedVersionPath(app.getPath('userData'))
}

function currentSkippedVersion(): string | undefined {
  if (!skipLoaded) {
    skippedVersion = readSkippedVersion(skipFile())
    skipLoaded = true
  }
  return skippedVersion
}

/**
 * Stop offering one version. The banner goes away for good rather than until
 * the next launch, and a later release is a new question that still gets
 * asked. A manual check overrides this, which is how the user takes back a
 * version they skipped.
 */
export function skipUpdate(version: unknown): UpdateStatus {
  if (openingDownload) return getUpdateStatus()
  if (typeof version !== 'string' || !version) return getUpdateStatus()
  skippedVersion = version
  skipLoaded = true
  writeSkippedVersion(skipFile(), version)
  transition({ type: 'reset' })
  return getUpdateStatus()
}

export function startUpdateManager(): void {
  if (started) return
  started = true

  if (!supportsUpdates()) {
    transition({
      type: 'unsupported',
      message: UPDATES_UNAVAILABLE_MESSAGE
    })
    return
  }

  updaterReady = (async () => {
    const { BrowserUpdater } = await import('./browser-updater')
    autoUpdater = new BrowserUpdater()
    configureUpdater()
  })().catch(error => transition({ type: 'error', message: errorMessage(error) }))
  startupTimer = setTimeout(
    () => void checkForUpdates(false, 'startup'),
    UPDATE_STARTUP_DELAY_MS + Math.random() * UPDATE_STARTUP_JITTER_MS
  )
  intervalTimer = setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS)
  powerMonitor.on('resume', checkAfterResume)
}

export async function checkForUpdates(manual = false, source: UpdateStatus['source'] = manual ? 'manual' : 'runtime'): Promise<UpdateStatus> {
  // Development builds never start this manager. Their menu/IPC entry points
  // must not initialize an updater against the production feed.
  if (!started || !supportsUpdates()) {
    transition(
      {
        type: 'unsupported',
        message: UPDATES_UNAVAILABLE_MESSAGE
      },
      manual
    )
    return getUpdateStatus()
  }

  await updaterReady
  if (!autoUpdater) return getUpdateStatus()

  if (checkPromise) {
    if (manual) {
      manualCheckRequested = true
      transition({ type: 'present-manual' })
    }
    await checkPromise
    return getUpdateStatus()
  }
  if (openingDownload || (!manual && status.phase === 'available')) {
    if (manual) {
      manualCheck = true
      transition({ type: 'present-manual' })
    }
    return getUpdateStatus()
  }

  transition({ type: 'check', manual, source })
  manualCheck = manual
  manualCheckRequested = manual
  lastCheckedAt = Date.now()
  checkPromise = (async () => {
    await autoUpdater.checkForUpdates()
  })()
  try {
    await checkPromise
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) })
  } finally {
    checkPromise = undefined
  }

  return getUpdateStatus()
}

/** Open only the installer offered by the checked feed, after an explicit click. */
export async function openUpdateDownload(): Promise<UpdateStatus> {
  const canOpen = (): boolean => ['available', 'external-download'].includes(status.phase)
  if (!canOpen() || openingDownload) return getUpdateStatus()
  const expectedVersion = status.availableVersion
  if (checkPromise) await checkPromise
  if (!canOpen() || status.availableVersion !== expectedVersion || openingDownload) return getUpdateStatus()
  openingDownload = true
  try {
    await autoUpdater.openDownload()
    transition({ type: 'external-download' })
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) }, true)
  } finally {
    openingDownload = false
  }
  return getUpdateStatus()
}

export function stopUpdateManager(): void {
  if (startupTimer) clearTimeout(startupTimer)
  if (intervalTimer) clearInterval(intervalTimer)
  startupTimer = undefined
  intervalTimer = undefined
  if (started && app.isReady()) powerMonitor.removeListener('resume', checkAfterResume)
}

function configureUpdater(): void {
  // Feed checks never launch the browser or start an internal package download.
  autoUpdater.autoDownload = false
  autoUpdater.allowDowngrade = false
  autoUpdater.autoInstallOnAppQuit = AUTO_INSTALL_ON_APP_QUIT
  autoUpdater.allowPrerelease = false
  autoUpdater.logger = {
    info: (...args: unknown[]) => console.info('[updater]', ...args),
    warn: (...args: unknown[]) => console.warn('[updater]', ...args),
    error: (...args: unknown[]) => console.error('[updater]', ...args),
    debug: (...args: unknown[]) => console.debug('[updater]', ...args)
  }

  autoUpdater.on('checking-for-update', () =>
    transition({ type: 'check', manual: status.manual, source: status.source })
  )
  autoUpdater.on('update-available', (info) => {
    if (!shouldOfferUpdate(info.version, currentSkippedVersion(), manualCheck)) {
      console.info('[updater] skipping', info.version, 'at the user’s request')
      transition({ type: 'reset' })
      return
    }
    // Offer metadata first; opening the browser requires an explicit user action.
    transition({ type: 'available', version: info.version, releaseNotes: normalizeReleaseNotes(info.releaseNotes) })
  })
  autoUpdater.on('update-not-available', () => {
    transition({ type: 'not-available' })
  })
  autoUpdater.on('error', (error) => {
    transition({ type: 'error', message: errorMessage(error) })
  })
}

function transition(event: UpdateStateEvent, manualOverride?: boolean): void {
  status = reduceUpdateStatus(status, event)
  if (manualOverride !== undefined) status.manual = manualOverride

  console.info('[updater] status', status.phase)
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('updates:status-changed', getUpdateStatus())
  }
}

function checkAfterResume(): void {
  if (shouldCheckAfterResume(lastCheckedAt)) void checkForUpdates()
}

function supportsUpdates(): boolean {
  if (!supportsAutoUpdates(app.isPackaged, process.platform)) return false
  if (packagedFeedEnabled === undefined) {
    try {
      const metadata: unknown = JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf8'))
      packagedFeedEnabled = typeof metadata === 'object' && metadata !== null &&
        'dshDesktopUpdatesEnabled' in metadata && metadata.dshDesktopUpdatesEnabled === true
    } catch (error) {
      console.warn('[updater] Could not read packaged update policy; online updates disabled.', error)
      packagedFeedEnabled = false
    }
  }
  return packagedFeedEnabled
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
