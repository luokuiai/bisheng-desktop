import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ openExternal: vi.fn(), rosetta: false }))
vi.mock('electron', () => ({
  app: { get runningUnderARM64Translation() { return mocks.rosetta } },
  shell: { openExternal: mocks.openExternal }
}))
vi.mock('electron-updater', () => ({ default: { AppUpdater: class extends EventEmitter {} } }))

import { BrowserUpdater, selectUpdateInstaller } from '../src/main/update/browser-updater'

const originalArchitecture = process.arch
const originalPlatform = process.platform
const files = ['bisheng', 'luokui-ai'].flatMap(brand => [
  ...['arm64', 'x64'].flatMap(architecture => ['dmg', 'zip'].map(extension => `${brand}-mac-${architecture}.${extension}`)),
  `${brand}-windows-x64-setup.exe`
]).map(filename => ({
  url: new URL(filename, 'https://updates.example.test/'),
  info: { url: filename, sha512: `${filename}-digest`, size: 120 }
}))

function offeredUpdater(brand = 'luokui-ai') {
  const updater = new BrowserUpdater()
  updater.updateInfoAndProvider = {
    info: { version: '1.3.0' },
    provider: { resolveFiles: () => files.filter(file => file.info.url.startsWith(`${brand}-`)) }
  }
  return updater
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.rosetta = false
  mocks.openExternal.mockResolvedValue(undefined)
  Object.defineProperty(process, 'platform', { value: 'darwin' })
  Object.defineProperty(process, 'arch', { value: 'x64' })
})
afterEach(() => {
  Object.defineProperty(process, 'arch', { value: originalArchitecture })
  Object.defineProperty(process, 'platform', { value: originalPlatform })
})

it.each(['bisheng', 'luokui-ai'].flatMap(brand => [
  ['darwin', 'arm64', brand, `${brand}-mac-arm64.dmg`],
  ['darwin', 'x64', brand, `${brand}-mac-x64.dmg`],
  ['win32', 'x64', brand, `${brand}-windows-x64-setup.exe`]
]))('opens the %s/%s installer for the %s feed only on request', async (platform, architecture, brand, installer) => {
  Object.defineProperty(process, 'platform', { value: platform })
  Object.defineProperty(process, 'arch', { value: architecture })
  const updater = offeredUpdater(brand)
  expect(mocks.openExternal).not.toHaveBeenCalled()
  await updater.openDownload()
  expect(mocks.openExternal).toHaveBeenCalledWith(`https://updates.example.test/${installer}`)
  await updater.openDownload()
  expect(mocks.openExternal).toHaveBeenCalledTimes(2)
})

it('selects Apple Silicon installers under Rosetta', async () => {
  mocks.rosetta = true
  await offeredUpdater().openDownload()
  expect(mocks.openExternal).toHaveBeenCalledWith('https://updates.example.test/luokui-ai-mac-arm64.dmg')
})

it.each(['file:', 'javascript:', 'ftp:'])('rejects %s installer URLs before invoking the system handler', protocol => {
  const url = new URL(`${protocol}//updates.example.test/installer-x64.dmg`)
  expect(() => selectUpdateInstaller([{ url }], 'darwin', 'x64')).toThrow('HTTP(S)')
})

it('rejects embedded credentials and missing or unsupported installer targets', () => {
  expect(() => selectUpdateInstaller([{ url: new URL('https://user@updates.example.test/installer-x64.dmg') }], 'darwin', 'x64')).toThrow('credentials')
  expect(() => selectUpdateInstaller(files.filter(file => file.url.pathname.endsWith('.zip')), 'darwin', 'x64')).toThrow('does not include')
  expect(() => selectUpdateInstaller([{ url: new URL('https://updates.example.test/badarm64name.dmg') }], 'darwin', 'arm64')).toThrow('does not include')
  expect(() => selectUpdateInstaller(files, 'win32', 'arm64')).toThrow('Unsupported')
  expect(() => selectUpdateInstaller(files, 'linux', 'x64')).toThrow('Unsupported')
})

it('requires a checked feed, reports browser errors and supports reopening', async () => {
  await expect(new BrowserUpdater().openDownload()).rejects.toThrow('Check for an available update')
  expect(mocks.openExternal).not.toHaveBeenCalled()
  const updater = offeredUpdater()
  mocks.openExternal.mockRejectedValueOnce(new Error('Browser launch failed'))
  await expect(updater.openDownload()).rejects.toThrow('Browser launch failed')
  await updater.openDownload()
  expect(mocks.openExternal).toHaveBeenCalledTimes(2)
})

it('does not support internal downloads or automatic installation', async () => {
  const updater = offeredUpdater()
  await expect(updater.doDownloadUpdate()).rejects.toThrow('downloaded in the browser')
  expect(() => updater.quitAndInstall()).toThrow('downloaded by your browser')
  expect(mocks.openExternal).not.toHaveBeenCalled()
})
