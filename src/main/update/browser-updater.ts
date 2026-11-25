import { app, shell } from 'electron'
import electronUpdater from 'electron-updater'
import type { ResolvedUpdateFileInfo } from 'electron-updater'

export function selectUpdateInstaller(files: readonly ResolvedUpdateFileInfo[], platform: NodeJS.Platform, architecture: string): ResolvedUpdateFileInfo {
  if (!((platform === 'darwin' && ['arm64', 'x64'].includes(architecture)) || (platform === 'win32' && architecture === 'x64'))) {
    throw new Error(`Unsupported update installer target: ${platform}/${architecture}`)
  }
  const extension = platform === 'darwin' ? '.dmg' : '.exe'
  const file = files.find(candidate => {
    const name = candidate.url.pathname.split('/').at(-1)?.toLowerCase() ?? ''
    return name.endsWith(extension) && new RegExp(`(?:^|[-_.])${architecture}(?:[-_.]|$)`).test(name)
  })
  if (!file) throw new Error(`The update feed does not include a ${platform}/${architecture} ${extension} installer.`)
  if (!['https:', 'http:'].includes(file.url.protocol) || file.url.username || file.url.password) {
    throw new Error('The update installer requires an HTTP(S) URL without embedded credentials.')
  }
  return file
}

/** Reuse the feed/version protocol; the browser owns package downloads. */
export class BrowserUpdater extends electronUpdater.AppUpdater {
  constructor() {
    super(null)
  }

  async openDownload(): Promise<void> {
    const update = this.updateInfoAndProvider
    if (!update) throw new Error('Check for an available update before opening its download.')
    const architecture = process.platform === 'darwin' && app.runningUnderARM64Translation ? 'arm64' : process.arch
    const file = selectUpdateInstaller(update.provider.resolveFiles(update.info), process.platform, architecture)
    await shell.openExternal(file.url.href)
  }

  protected async doDownloadUpdate(): Promise<string[]> {
    throw new Error('Update packages are downloaded in the browser.')
  }

  quitAndInstall(): void {
    throw new Error('Run the installer downloaded by your browser to update the app.')
  }
}
