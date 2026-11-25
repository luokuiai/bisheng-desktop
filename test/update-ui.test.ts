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
  updateMessage
} from '../src/preload/update-view'

const browserDownload: UpdateStatus = {
  phase: 'external-download', currentVersion: '1.0.0', availableVersion: '1.1.0', manual: false
}

describe('browser update copy', () => {
  it.each(['zh', 'en'] as const)('labels initial, busy, and repeated browser actions in %s', locale => {
    const available: UpdateStatus = { ...browserDownload, phase: 'available' }
    expect(updateDownloadLabel(available, locale)).toBe(locale === 'zh' ? '更新' : 'Update')
    expect(updateDownloadLabel(available, locale, true)).toBe(locale === 'zh' ? '正在打开浏览器…' : 'Opening browser…')
    expect(updateDownloadLabel(browserDownload, locale)).toBe(locale === 'zh' ? '重新下载' : 'Download again')
    const headline = updateHeadline(browserDownload, locale)
    expect(headline.title).toBe(locale === 'zh' ? '已打开浏览器下载' : 'Download opened in browser')
    expect(headline.description).toContain(locale === 'zh' ? '下载完成后保存工作并退出' : 'When it finishes, save your work and quit')
    expect(headline.description).not.toContain(locale === 'zh' ? '已下载完成' : 'has downloaded')
  })
})

describe('desktop update card visibility', () => {
  it('shows a browser handoff but keeps automatic background checks quiet', () => {
    expect(shouldShowUpdate(browserDownload)).toBe(true)
    expect(
      shouldShowUpdate({ phase: 'checking', currentVersion: '1.0.0', manual: false })
    ).toBe(false)
    expect(
      shouldShowUpdate({ phase: 'checking', currentVersion: '1.0.0', manual: true })
    ).toBe(true)
  })

  it('keeps a dismissed version hidden after the browser handoff', () => {
    expect(isUpdateDismissed(browserDownload, '1.1.0')).toBe(true)
    expect(isUpdateDismissed({ ...browserDownload, availableVersion: '1.2.0' }, '1.1.0')).toBe(
      false
    )
  })

  it('dismisses the browser handoff when the user closes the card', () => {
    expect(isUpdateDismissed(browserDownload, null)).toBe(false)
    expect(isUpdateDismissed(browserDownload, '1.0.0')).toBe(false)
    expect(isUpdateDismissed(browserDownload, '1.1.0')).toBe(true)
  })

  it('describes the browser handoff without claiming download completion', () => {
    expect(updateMessage(browserDownload, 'zh')).toBe('已在浏览器中打开下载')
    expect(updateMessage(browserDownload, 'en')).toBe('Download opened in your browser')
  })
})

describe('an explicit action opens the browser download', () => {
  it('asks rather than announcing a download already under way', () => {
    const available: UpdateStatus = {
      phase: 'available',
      currentVersion: '0.4.3',
      availableVersion: '0.4.4',
      manual: false
    }
    expect(updateMessage(available, 'zh')).toBe('发现新版本 0.4.4，是否更新？')
    expect(updateMessage(available, 'en')).toBe('LUOKUI-AI 0.4.4 is available. Update now?')
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
