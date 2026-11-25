import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ download: vi.fn(), openPath: vi.fn(), rosetta: false }))
vi.mock('electron', () => ({
  app: { get runningUnderARM64Translation() { return mocks.rosetta } },
  shell: { openPath: mocks.openPath }
}))
vi.mock('electron-updater/out/electronHttpExecutor', () => ({
  ElectronHttpExecutor: class { download = mocks.download }
}))
vi.mock('electron-updater', async () => {
  const { EventEmitter } = await import('node:events')
  return { default: { AppUpdater: class extends EventEmitter {
    async executeDownload(task) {
      const path = `/fixture/update-cache/${task.fileInfo.url.pathname.split('/').at(-1)}`
      await task.task(path, { sha512: task.fileInfo.info.sha512 })
      await task.done({ ...task.downloadUpdateOptions.updateInfoAndProvider.info, downloadedFile: path })
      return [path]
    }
    dispatchUpdateDownloaded(event) { this.emit('update-downloaded', event) }
  } } }
})

import { MacInstallerUpdater, selectMacInstaller } from '../src/main/update/mac-installer-updater'

const originalArchitecture = process.arch
const files = ['arm64', 'x64'].flatMap(architecture => ['dmg', 'zip'].map(extension => ({
  url: new URL(`https://updates.example.test/bisheng-mac-${architecture}.${extension}`),
  info: { url: `bisheng-mac-${architecture}.${extension}`, sha512: `${architecture}-${extension}-digest`, size: 120 }
})))
const options = () => ({
  updateInfoAndProvider: { info: { version: '1.3.0' }, provider: { resolveFiles: () => files } },
  requestHeaders: {}, cancellationToken: {}
})

beforeEach(() => {
  vi.resetAllMocks()
  mocks.rosetta = false
  mocks.download.mockResolvedValue('/fixture/update-cache/installer.dmg')
  mocks.openPath.mockResolvedValue('')
  Object.defineProperty(process, 'arch', { value: 'x64' })
})
afterEach(() => { Object.defineProperty(process, 'arch', { value: originalArchitecture }) })

it.each(['arm64', 'x64'])('selects only the %s DMG and retains its checksum', architecture => {
  const selected = selectMacInstaller(files, architecture)
  expect(selected.url.href).toBe(`https://updates.example.test/bisheng-mac-${architecture}.dmg`)
  expect(selected.info.sha512).toBe(`${architecture}-dmg-digest`)
  expect(() => selectMacInstaller(files.filter(file => !file.url.pathname.includes(architecture)), architecture)).toThrow('does not include')
})

it('rejects unsupported protocols and missing checksums instead of opening arbitrary URLs', () => {
  const valid = selectMacInstaller(files, 'x64')
  expect(() => selectMacInstaller([{ ...valid, url: new URL('file:///private/installer-x64.dmg') }], 'x64')).toThrow('HTTP(S)')
  expect(() => selectMacInstaller([{ ...valid, info: { ...valid.info, sha512: '' } }], 'x64')).toThrow('checksum')
})

it('uses updater download/checksum handling and opens only the completed cached installer on request', async () => {
  const updater = new MacInstallerUpdater()
  const downloaded = vi.fn()
  updater.on('update-downloaded', downloaded)
  await expect(updater.openInstaller()).rejects.toThrow('Download the update')
  await updater.doDownloadUpdate(options())
  expect(mocks.download).toHaveBeenCalledWith(
    new URL('https://updates.example.test/bisheng-mac-x64.dmg'),
    '/fixture/update-cache/bisheng-mac-x64.dmg',
    { sha512: 'x64-dmg-digest' }
  )
  expect(downloaded).toHaveBeenCalledWith(expect.objectContaining({ version: '1.3.0' }))
  expect(mocks.openPath).not.toHaveBeenCalled()
  await updater.openInstaller()
  expect(mocks.openPath).toHaveBeenCalledWith('/fixture/update-cache/bisheng-mac-x64.dmg')
  expect(() => updater.quitAndInstall()).toThrow('Open the DMG')
  mocks.openPath.mockResolvedValueOnce('Volume could not be mounted')
  await expect(updater.openInstaller()).rejects.toThrow('Volume could not be mounted')
  await updater.openInstaller()
  expect(mocks.openPath).toHaveBeenCalledTimes(3)
})

it('selects Apple Silicon installers under Rosetta', async () => {
  mocks.rosetta = true
  const updater = new MacInstallerUpdater()
  await updater.doDownloadUpdate(options())
  expect(mocks.download.mock.calls[0][0].pathname).toBe('/bisheng-mac-arm64.dmg')
})

it('does not publish or open a partial installer when download or digest verification fails', async () => {
  const updater = new MacInstallerUpdater()
  const downloaded = vi.fn()
  updater.on('update-downloaded', downloaded)
  mocks.download.mockRejectedValueOnce(new Error('SHA-512 mismatch'))
  await expect(updater.doDownloadUpdate(options())).rejects.toThrow('SHA-512 mismatch')
  expect(downloaded).not.toHaveBeenCalled()
  await expect(updater.openInstaller()).rejects.toThrow('Download the update')
  expect(mocks.openPath).not.toHaveBeenCalled()
})
