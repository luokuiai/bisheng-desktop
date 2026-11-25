import { describe, expect, it } from 'vitest'
import {
  initialUpdateStatus,
  normalizeReleaseNotes,
  reduceUpdateStatus
} from '../src/main/update/update-state'

describe('desktop update state', () => {
  it('tracks the browser handoff without claiming package download completion', () => {
    let status = initialUpdateStatus('1.0.0')
    status = reduceUpdateStatus(status, { type: 'check', manual: false })
    status = reduceUpdateStatus(status, { type: 'available', version: '1.1.0' })
    status = reduceUpdateStatus(status, { type: 'external-download' })
    expect(status).toEqual({
      phase: 'external-download', currentVersion: '1.0.0', availableVersion: '1.1.0', manual: false, source: 'runtime'
    })
  })

  it('preserves whether a check was initiated from the application menu', () => {
    let status = initialUpdateStatus('1.0.0')
    status = reduceUpdateStatus(status, { type: 'check', manual: true })
    status = reduceUpdateStatus(status, { type: 'not-available' })

    expect(status.phase).toBe('up-to-date')
    expect(status.manual).toBe(true)
  })
})

it('preserves startup source and release notes after opening the browser', () => {
  let status = reduceUpdateStatus(initialUpdateStatus('1.0.0'), { type: 'check', manual: false, source: 'startup' })
  status = reduceUpdateStatus(status, { type: 'available', version: '1.1.0', releaseNotes: 'Fixes' })
  status = reduceUpdateStatus(status, { type: 'external-download' })
  expect(status.source).toBe('startup')
  expect(status.releaseNotes).toBe('Fixes')
  expect(reduceUpdateStatus(status, { type: 'present-manual' })).toMatchObject({ phase: 'external-download', source: 'manual', manual: true, releaseNotes: 'Fixes' })
})

it('normalizes only supported release notes and bounds external text', () => {
  expect(normalizeReleaseNotes([{ note: 'first' }, { note: 4 }, null, { note: 'second' }])).toBe('first\n\nsecond')
  expect(normalizeReleaseNotes(' A\r\nB ')).toBe('A\nB')
  expect(normalizeReleaseNotes({ html: '<script>' })).toBeUndefined()
  expect(normalizeReleaseNotes('x'.repeat(30_000))?.length).toBe(20_000)
})
