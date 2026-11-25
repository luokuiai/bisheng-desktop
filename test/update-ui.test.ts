import { describe, expect, it } from 'vitest'
import type { UpdateStatus } from '../src/shared/contracts'
import {
  isUpdateDismissed,
  rollbackReleases,
  rollbackEmptyMessage,
  isNewManualPresentation,
  shouldShowUpdate,
  updateDownloadLabel,
  updateHeadline,
  updateInstallLabel,
  updateMessage
} from '../src/preload/update-view'

const downloading: UpdateStatus = {
  phase: 'downloading',
  currentVersion: '1.0.0',
  availableVersion: '1.1.0',
  percent: 42.2,
  manual: false
}

const downloaded: UpdateStatus = {
  phase: 'downloaded',
  currentVersion: '1.0.0',
  availableVersion: '1.1.0',
  manual: false
}

describe('update installation copy', () => {
  it.each(['zh', 'en'] as const)('labels manual installation actions in %s', locale => {
    const status: UpdateStatus = { ...downloaded, installationMode: 'manual' }
    expect(updateDownloadLabel(status, locale)).toBe(locale === 'zh' ? '下载新版' : 'Download new version')
    expect(updateInstallLabel(status, locale)).toBe(locale === 'zh' ? '打开安装包并退出' : 'Open installer and quit')
    expect(updateInstallLabel(status, locale, true)).toBe(locale === 'zh' ? '正在打开并退出…' : 'Opening and quitting…')
  })

  it.each(['zh', 'en'] as const)('preserves automatic and legacy action labels in %s', locale => {
    for (const installationMode of [undefined, 'automatic'] as const) {
      const status: UpdateStatus = { ...downloaded, manual: true, installationMode }
      expect(updateDownloadLabel(status, locale)).toBe(locale === 'zh' ? '更新' : 'Update')
      expect(updateInstallLabel(status, locale)).toBe(locale === 'zh' ? '重新启动并安装' : 'Restart and install')
      expect(updateInstallLabel(status, locale, true)).toBe(locale === 'zh' ? '正在重启…' : 'Restarting…')
    }
  })

  it('explains how to replace the app after a manual download in both languages', () => {
    const status: UpdateStatus = { ...downloaded, installationMode: 'manual' }
    expect(updateHeadline(status, 'zh')).toEqual({
      title: '更新已就绪',
      description: 'v1.1.0 已下载完成，请先保存工作。点击“打开安装包并退出”后，BISHENG 将打开安装包并自动退出。然后将新版拖到“应用程序”并替换旧版本。'
    })
    expect(updateHeadline(status, 'en')).toEqual({
      title: 'Update ready',
      description: 'v1.1.0 has downloaded. Save your work first. Click “Open installer and quit” to open the installer and automatically quit BISHENG. Then drag the new app to Applications and replace the old version.'
    })
  })

  it('preserves automatic and legacy downloaded headlines', () => {
    for (const installationMode of [undefined, 'automatic'] as const) {
      const status: UpdateStatus = { ...downloaded, installationMode }
      expect(updateHeadline(status, 'zh')).toEqual({
        title: '更新已就绪',
        description: 'v1.1.0 将在重启后生效。'
      })
      expect(updateHeadline(status, 'en')).toEqual({
        title: 'Update ready',
        description: 'v1.1.0 will be applied on next launch.'
      })
    }
  })
})

describe('desktop update card visibility', () => {
  it('shows automatic downloads but keeps automatic background checks quiet', () => {
    expect(shouldShowUpdate(downloading)).toBe(true)
    expect(
      shouldShowUpdate({ phase: 'checking', currentVersion: '1.0.0', manual: false })
    ).toBe(false)
    expect(
      shouldShowUpdate({ phase: 'checking', currentVersion: '1.0.0', manual: true })
    ).toBe(true)
  })

  it('keeps a dismissed version hidden while its download phase changes', () => {
    expect(isUpdateDismissed(downloading, '1.1.0')).toBe(true)
    expect(isUpdateDismissed({ ...downloading, availableVersion: '1.2.0' }, '1.1.0')).toBe(
      false
    )
  })

  it('dismisses a downloaded update when the user closes the card', () => {
    expect(isUpdateDismissed(downloaded, null)).toBe(false)
    expect(isUpdateDismissed(downloaded, '1.0.0')).toBe(false)
    expect(isUpdateDismissed(downloaded, '1.1.0')).toBe(true)
  })

  it('formats localized progress copy', () => {
    expect(updateMessage(downloading, 'zh')).toBe('正在下载更新 42%')
    expect(updateMessage(downloading, 'en')).toBe('Downloading update 42%')
  })
})

describe('accepting an update is what starts the download', () => {
  it('asks rather than announcing a download already under way', () => {
    const available: UpdateStatus = {
      phase: 'available',
      currentVersion: '0.4.3',
      availableVersion: '0.4.4',
      manual: false
    }
    expect(updateMessage(available, 'zh')).toBe('发现新版本 0.4.4，是否更新？')
    expect(updateMessage(available, 'en')).toBe('BISHENG 0.4.4 is available. Update now?')
  })

  it('explains when the current build does not support updates', () => {
    const unsupported: UpdateStatus = {
      phase: 'unsupported',
      currentVersion: '1.0.0',
      manual: true,
      message: 'Online updates are unavailable in this build.'
    }
    expect(updateHeadline(unsupported, 'zh')).toEqual({
      title: '当前构建不支持在线更新',
      description: '当前构建不支持在线更新。'
    })
    expect(updateHeadline(unsupported, 'en')).toEqual({
      title: 'Online updates are not available',
      description: 'Online updates are unavailable in this build.'
    })
    expect(updateMessage(unsupported, 'zh')).toBe('当前构建不支持在线更新。')
    expect(updateMessage(unsupported, 'en')).toBe('Online updates are unavailable in this build.')
  })
})
