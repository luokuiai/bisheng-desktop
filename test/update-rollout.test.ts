import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ipc: new Map<string, (...args: unknown[]) => unknown>(),
  listeners: new Map<string, (...args: unknown[]) => void>(),
  userData: '',
  supported: true,
  openDownload: vi.fn(async () => {}),
  defaultUpdaterAccess: vi.fn(),
  quit: vi.fn(),
  updater: {
    autoDownload: true,
    allowDowngrade: true,
    allowPrerelease: true,
    autoInstallOnAppQuit: true,
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn()
  }
}))

vi.mock('electron-updater', () => ({ default: { get autoUpdater() { mocks.defaultUpdaterAccess(); return mocks.updater } } }))
vi.mock('../src/main/update/browser-updater', () => ({
  BrowserUpdater: class { constructor() { return Object.assign(mocks.updater, { openDownload: mocks.openDownload }) } }
}))
vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '1.0.1',
    getPath: () => mocks.userData,
    getAppPath: () => mocks.userData,
    quit: mocks.quit,
    isReady: () => true
  },
  BrowserWindow: { getAllWindows: () => [] },
  powerMonitor: { on: vi.fn(), removeListener: vi.fn() },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      mocks.ipc.set(channel, handler)
    })
  }
}))
vi.mock('../src/main/update/update-policy', async (importOriginal) => ({
  ...await importOriginal<object>(),
  supportsAutoUpdates: () => mocks.supported
}))

let manager: typeof import('../src/main/update/update-manager')
const originalPlatform = process.platform

function start() {
  manager.startUpdateManager()
}
function emit(event: string, value?: unknown) {
  mocks.listeners.get(event)?.(value)
}

beforeEach(async () => {
  Object.defineProperty(process, 'platform', { value: 'win32' })
  vi.useFakeTimers()
  vi.resetModules()
  vi.resetAllMocks()
  mocks.ipc.clear()
  mocks.listeners.clear()
  mocks.supported = true
  mocks.userData = await mkdtemp(join(tmpdir(), 'bisheng-update-'))
  await writeFile(join(mocks.userData, 'package.json'), JSON.stringify({ dshDesktopUpdatesEnabled: true }))
  mocks.updater.on.mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
    mocks.listeners.set(event, listener)
  })
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    emit('checking-for-update')
    emit('update-not-available')
  })
  manager = await import('../src/main/update/update-manager')
})

afterEach(async () => {
  manager.stopUpdateManager()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  await rm(mocks.userData, { recursive: true, force: true })
  Object.defineProperty(process, 'platform', { value: originalPlatform })
})

it('checks the stable feed on manual request and reports the current version', async () => {
  start()
  manager.registerUpdateHandlers()
  await mocks.ipc.get('updates:check')?.()
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledOnce()
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'up-to-date', manual: true })
  expect(mocks.updater).toMatchObject({
    autoDownload: false, allowDowngrade: false, allowPrerelease: false, autoInstallOnAppQuit: false
  })
})

it('checks automatically on startup and at the periodic interval', async () => {
  start()
  start()
  await vi.advanceTimersByTimeAsync(30_000)
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledOnce()
  expect(manager.getUpdateStatus().manual).toBe(false)
  await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1_000)
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(2)
})

it('does not check or configure the updater when a Dev build has not started the manager', async () => {
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus().phase).toBe('unsupported')
  expect(mocks.updater.on).not.toHaveBeenCalled()
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
})

it('keeps unsupported platforms and unpackaged builds disabled', async () => {
  mocks.supported = false
  start()
  await manager.checkForUpdates(true)
  await vi.advanceTimersByTimeAsync(30_000)
  expect(manager.getUpdateStatus().phase).not.toBe('checking')
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
})

it.each(['win32', 'darwin'])('does not initialize or check updates on %s when the packaged feed is disabled', async platform => {
  Object.defineProperty(process, 'platform', { value: platform })
  await writeFile(join(mocks.userData, 'package.json'), JSON.stringify({ dshDesktopUpdatesEnabled: false }))
  vi.stubEnv('BISHENG_UPDATE_URL', 'https://updates.example.com/should-not-enable/')
  start()
  manager.registerUpdateHandlers()
  await mocks.ipc.get('updates:check')?.()
  await vi.advanceTimersByTimeAsync(7 * 60 * 60 * 1_000)
  expect(manager.getUpdateStatus().phase).toBe('unsupported')
  expect(vi.getTimerCount()).toBe(0)
  expect(mocks.defaultUpdaterAccess).not.toHaveBeenCalled()
  expect(mocks.updater.on).not.toHaveBeenCalled()
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  await manager.openUpdateDownload()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  expect(mocks.openDownload).not.toHaveBeenCalled()
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
})

it('keeps packages without an explicit update policy disabled', async () => {
  await writeFile(join(mocks.userData, 'package.json'), '{}')
  start()
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus().phase).toBe('unsupported')
  expect(mocks.defaultUpdaterAccess).not.toHaveBeenCalled()
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
})

it.each(['darwin', 'win32'])('opens the browser on %s only after a trusted explicit click and permits reopening', async platform => {
  Object.defineProperty(process, 'platform', { value: platform })
  start()
  mocks.updater.checkForUpdates.mockImplementation(async () => emit('update-available', { version: '1.0.2' }))
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'available', availableVersion: '1.0.2' })
  expect(mocks.openDownload).not.toHaveBeenCalled()
  const trusted: unknown = { sender: 'main', senderFrame: 'main-frame' }
  manager.registerUpdateHandlers({ assertTrusted: event => {
    if (event !== trusted) throw new Error('Untrusted update sender')
  } })
  const open = mocks.ipc.get('updates:open-download')
  expect(() => open?.({ sender: 'foreign' })).toThrow('Untrusted update sender')
  expect(mocks.openDownload).not.toHaveBeenCalled()
  let finishOpening: (() => void) | undefined
  mocks.openDownload.mockImplementationOnce(() => new Promise<void>(resolve => { finishOpening = resolve }))
  const opening = open?.(trusted)
  expect(mocks.openDownload).toHaveBeenCalledOnce()
  await open?.(trusted)
  expect(mocks.openDownload).toHaveBeenCalledOnce()
  await manager.checkForUpdates(true)
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledOnce()
  finishOpening?.()
  await opening
  expect(manager.getUpdateStatus().phase).toBe('external-download')
  await open?.(trusted)
  expect(mocks.openDownload).toHaveBeenCalledTimes(2)
  expect(mocks.defaultUpdaterAccess).not.toHaveBeenCalled()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
  expect(mocks.quit).not.toHaveBeenCalled()
})

it('does not allow the browser action without trusted sender validation', () => {
  manager.registerUpdateHandlers()
  expect(() => mocks.ipc.get('updates:open-download')?.({})).toThrow('trusted main-window sender')
  expect(mocks.openDownload).not.toHaveBeenCalled()
})

it('continues periodic version checks after handing the download to the browser', async () => {
  start()
  await vi.advanceTimersByTimeAsync(30_000)
  mocks.updater.checkForUpdates.mockImplementation(async () => emit('update-available', { version: '1.0.2' }))
  await manager.checkForUpdates(true)
  await manager.openUpdateDownload()
  expect(manager.getUpdateStatus().phase).toBe('external-download')
  mocks.updater.checkForUpdates.mockImplementation(async () => emit('update-available', { version: '1.0.3' }))
  await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1_000)
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(3)
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'available', availableVersion: '1.0.3' })
  expect(mocks.openDownload).toHaveBeenCalledOnce()
})

it('does not open a changed offer while an earlier consent waits for a manual check', async () => {
  start()
  mocks.updater.checkForUpdates.mockImplementation(async () => emit('update-available', { version: '1.0.2' }))
  await manager.checkForUpdates(true)
  let finishCheck: (() => void) | undefined
  mocks.updater.checkForUpdates.mockImplementationOnce(() => {
    emit('update-available', { version: '1.0.2' })
    return new Promise<void>(resolve => { finishCheck = resolve })
  })
  const checking = manager.checkForUpdates(true)
  await Promise.resolve()
  const opening = manager.openUpdateDownload()
  emit('update-available', { version: '1.0.3' })
  finishCheck?.()
  await checking
  await opening
  expect(mocks.openDownload).not.toHaveBeenCalled()
})

it('preserves a failed check and allows a manual retry', async () => {
  start()
  mocks.updater.checkForUpdates.mockRejectedValueOnce(new Error('metadata request failed'))
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'error', message: 'metadata request failed' })
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus().phase).toBe('up-to-date')
})

it('preserves a browser launch error and permits checking again', async () => {
  start()
  mocks.updater.checkForUpdates.mockImplementation(async () => emit('update-available', { version: '1.0.2' }))
  await manager.checkForUpdates(true)
  mocks.openDownload.mockRejectedValueOnce(new Error('browser failed'))
  await manager.openUpdateDownload()
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'error', message: 'browser failed' })
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus().phase).toBe('available')
})

it('honors a skipped version in the background and offers it again on manual request', async () => {
  start()
  manager.skipUpdate('1.0.2')
  mocks.updater.checkForUpdates.mockImplementation(async () => emit('update-available', { version: '1.0.2' }))
  await manager.checkForUpdates()
  expect(manager.getUpdateStatus().phase).toBe('idle')
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus().phase).toBe('available')
})

it('does not expose the removed version-list and rollback handlers', () => {
  manager.registerUpdateHandlers()
  expect(mocks.ipc.has('updates:list-versions')).toBe(false)
  expect(mocks.ipc.has('updates:install-version')).toBe(false)
  expect(mocks.ipc.has('updates:install')).toBe(false)
  expect(mocks.ipc.has('updates:download')).toBe(false)
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
})
