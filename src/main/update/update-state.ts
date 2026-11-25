import type { UpdateStatus } from '../../shared/contracts'

export type UpdateStateEvent =
  | { type: 'check'; manual: boolean; source?: UpdateStatus['source'] }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'external-download' }
  | { type: 'not-available' }
  | { type: 'error'; message: string }
  | { type: 'unsupported'; message: string }
  | { type: 'present-manual' }
  | { type: 'reset' }

export function initialUpdateStatus(currentVersion: string): UpdateStatus {
  return { phase: 'idle', currentVersion, manual: false }
}

export function reduceUpdateStatus(
  current: UpdateStatus,
  event: UpdateStateEvent
): UpdateStatus {
  const base = {
    currentVersion: current.currentVersion,
    manual: current.manual,
    ...(current.source === undefined ? {} : { source: current.source }),
    ...(current.releaseNotes === undefined ? {} : { releaseNotes: current.releaseNotes })
  }

  switch (event.type) {
    case 'check':
      return { ...base, phase: 'checking', manual: event.manual, source: event.source ?? (event.manual ? 'manual' : 'runtime') }
    case 'available':
      return {
        ...base,
        phase: 'available',
        availableVersion: event.version,
        ...(event.releaseNotes === undefined ? {} : { releaseNotes: event.releaseNotes })
      }
    case 'external-download':
      return { ...current, phase: 'external-download' }
    case 'not-available':
      return { ...base, phase: 'up-to-date' }
    case 'error':
      return { ...base, phase: 'error', message: event.message }
    case 'unsupported':
      return { ...base, phase: 'unsupported', message: event.message }
    case 'present-manual':
      return { ...current, manual: true, source: 'manual' }
    case 'reset':
      return initialUpdateStatus(current.currentVersion)
  }
}

/** Adapt untrusted updater metadata to a bounded, serializable plain-text value. */
export function normalizeReleaseNotes(value: unknown): string | undefined {
  const notes = typeof value === 'string' ? [value] : Array.isArray(value)
    ? value.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || !('note' in entry)) return []
      return typeof entry.note === 'string' ? [entry.note] : []
    }) : []
  const text = notes.join('\n\n').replace(/\r\n?/g, '\n').trim().slice(0, 20_000)
  return text || undefined
}
