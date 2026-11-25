import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { parse } from 'yaml'

const require = createRequire(import.meta.url)
const { Platform } = require('app-builder-lib')
const { PublishManager, getAppUpdatePublishConfiguration } = require('app-builder-lib/out/publish/PublishManager.js')
const { getConfig } = require('app-builder-lib/out/util/config/config.js')
const { resolveFunction } = require('app-builder-lib/out/util/resolve.js')
const { expandMacro } = require('app-builder-lib/out/util/macroExpander.js')
const { createTransformer } = require('app-builder-lib/out/fileTransformer.js')
const { createUpdateInfoTasks, writeUpdateInfoFiles } = require('app-builder-lib/out/publish/updateInfoBuilder.js')
const { CancellationToken } = require('builder-util-runtime')
const configureUpdateFeed = require('../scripts/configure-update-feed.cjs')
const projectRoot = path.resolve(import.meta.dirname, '..')
const temporaryRoots = []

afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

const feedCases = ['darwin', 'win32'].flatMap(platform =>
  [' https://updates.example.com/desktop ', undefined, '', '  '].map(value => ({ platform, value }))
)

it.each(feedCases)('embeds the build-time feed and enablement for $platform with URL $value', async ({ platform, value }) => {
  vi.stubEnv('BISHENG_UPDATE_URL', value)
  const config = await getConfig(projectRoot)
  const appInfo = { version: '1.2.3', updaterCacheDirName: 'desktop-updater' }
  const directory = await mkdtemp(path.join(tmpdir(), 'desktop-update-feed-'))
  temporaryRoots.push(directory)
  const packager = {
    config,
    platform: platform === 'darwin' ? Platform.MAC : Platform.WINDOWS,
    platformSpecificBuildOptions: platform === 'darwin' ? config.mac : config.win,
    appInfo,
    info: { config, appInfo },
    expandMacro: value => expandMacro(value, null, appInfo),
    isForceCodeSigningVerification: false,
    getResource: async () => null,
    getResourcesDir: () => directory
  }
  const beforePack = await resolveFunction('module', config.beforePack, 'beforePack', projectRoot)
  await beforePack({ packager })
  const transform = createTransformer(projectRoot, config, config.extraMetadata)
  const metadata = JSON.parse(await transform(path.join(projectRoot, 'package.json')))
  expect(metadata.dshDesktopUpdatesEnabled).toBe(Boolean(value?.trim()))
  // A user's launch environment cannot change the URL already embedded by packaging.
  vi.stubEnv('BISHENG_UPDATE_URL', undefined)
  const handlers = []
  new PublishManager({
    cancellationToken: new CancellationToken(),
    onAfterPack: handler => handlers.push(handler),
    onArtifactCreated: vi.fn()
  }, { publish: 'never' })
  await handlers[0]({
    packager,
    electronPlatformName: platform,
    targets: [{ name: platform === 'darwin' ? 'dmg' : 'nsis' }],
    appOutDir: directory,
    arch: 1
  })
  expect(parse(await readFile(path.join(directory, 'app-update.yml'), 'utf8'))).toMatchObject({
    provider: 'generic',
    url: value?.trim() ? 'https://updates.example.com/desktop/' : '',
    updaterCacheDirName: 'desktop-updater'
  })
  const assetName = platform === 'darwin' ? 'bisheng-mac-x64.dmg' : 'bisheng-windows-x64-setup.exe'
  const content = Buffer.from('release-metadata-fixture')
  const file = path.join(directory, assetName)
  await writeFile(file, content)
  const sha512 = createHash('sha512').update(content).digest('base64')
  const feedConfig = await getAppUpdatePublishConfiguration(packager, null, 1, false)
  const tasks = await createUpdateInfoTasks({
    packager, file, arch: 1, target: { outDir: directory }, updateInfo: { size: content.length, sha512 }
  }, [feedConfig])
  await writeUpdateInfoFiles(tasks, { emitArtifactCreated: vi.fn() })
  const manifestName = platform === 'darwin' ? 'latest-mac.yml' : 'latest.yml'
  const manifest = parse(await readFile(path.join(directory, manifestName), 'utf8'))
  expect(manifest.version).toBe('1.2.3')
  expect(manifest.files).toContainEqual({
    url: assetName, size: content.length, sha512
  })
})

it.each(['not-a-url', '/updates/', 'file:///updates/',
  'ftp://updates.example.com/', 'https://user@updates.example.com/',
  'https://updates.example.com/?token=example', 'https://updates.example.com/#latest',
  'https://updates.example.com/latest-mac.yml'])('rejects an invalid nonempty feed: %s', value => {
  vi.stubEnv('BISHENG_UPDATE_URL', value)
  expect(() => configureUpdateFeed({ packager: { config: { publish: [{ provider: 'generic' }] } } }))
    .toThrow(/BISHENG_UPDATE_URL/)
})

it.each([undefined, 'https://updates.example.com/desktop/'])('keeps development packages without an update feed with URL %s', async value => {
  vi.stubEnv('BISHENG_UPDATE_URL', value)
  const config = await getConfig(projectRoot, 'electron-builder.dev.cjs')
  configureUpdateFeed({ packager: { config } })
  const result = await getAppUpdatePublishConfiguration({ config, platformSpecificBuildOptions: config.win }, null, 1, false)
  expect(result).toBeNull()
  expect(config.extraMetadata.dshDesktopUpdatesEnabled).toBe(false)
})

it('passes the repository update URL variable into both GitHub packaging workflows', async () => {
  for (const filename of ['release.yml', 'desktop-build.yml']) {
    const workflow = parse(await readFile(path.join(projectRoot, '.github/workflows', filename), 'utf8'))
    expect(workflow.env.BISHENG_UPDATE_URL).toBe('${{ vars.BISHENG_UPDATE_URL }}')
  }
})
