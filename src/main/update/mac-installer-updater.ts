import { app, shell } from 'electron'
import electronUpdater from 'electron-updater'
import type { ResolvedUpdateFileInfo } from 'electron-updater'
import type { DownloadUpdateOptions } from 'electron-updater/out/AppUpdater'
import { ElectronHttpExecutor } from 'electron-updater/out/electronHttpExecutor'

export function selectMacInstaller(files: readonly ResolvedUpdateFileInfo[], architecture: 'arm64' | 'x64'): ResolvedUpdateFileInfo {
  const file = files.find(candidate => candidate.url.pathname.toLowerCase().endsWith('.dmg') && candidate.url.pathname.includes(architecture))
  if (!file) throw new Error(`The update feed does not include a ${architecture} DMG installer.`)
  if (!['https:', 'http:'].includes(file.url.protocol) || typeof file.info.sha512 !== 'string' || !file.info.sha512.trim()) {
    throw new Error('The DMG update entry requires an HTTP(S) URL and a SHA-512 checksum.')
  }
  return file
}

/** Reuse updater download/cache/hash handling; installation remains a user action. */
export class MacInstallerUpdater extends electronUpdater.AppUpdater {
  private installerPath: string | undefined
  private readonly executor = new ElectronHttpExecutor((authInfo, callback) => this.emit('login', authInfo, callback))

  constructor() {
    super(null)
  }

  protected doDownloadUpdate(options: DownloadUpdateOptions): Promise<string[]> {
    this.installerPath = undefined
    const { info, provider } = options.updateInfoAndProvider
    const architecture = process.arch === 'arm64' || app.runningUnderARM64Translation ? 'arm64' : 'x64'
    const file = selectMacInstaller(provider.resolveFiles(info), architecture)
    return this.executeDownload({
      fileExtension: 'dmg', fileInfo: file, downloadUpdateOptions: options,
      task: (destination, downloadOptions) => this.executor.download(file.url, destination, downloadOptions),
      done: async event => {
        this.installerPath = event.downloadedFile
        this.dispatchUpdateDownloaded(event)
      }
    })
  }

  async openInstaller(): Promise<void> {
    if (!this.installerPath) throw new Error('Download the update installer before opening it.')
    const error = await shell.openPath(this.installerPath)
    if (error) throw new Error(`Could not open the update installer: ${error}`)
  }

  quitAndInstall(): void {
    throw new Error('Open the DMG installer to complete this update.')
  }
}
