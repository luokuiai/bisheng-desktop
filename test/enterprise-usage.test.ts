import { describe, expect, it } from 'vitest'
import { parseUsageStorage, parseUsageSummary } from '../src/shared/enterprise-usage'
import { parseEnterpriseProfile } from '../src/shared/enterprise-profile'

const totals = { message_count: 12, input_tokens: 100, output_tokens: 20, total_tokens: 120, missing_usage_count: 0 }
const point = { ...totals, start_at: '2026-10-22T00:00:00+08:00', end_at: '2026-10-23T00:00:00+08:00' }
const summary = { start_at: point.start_at, end_at: '2026-10-22T14:00:00+08:00', timezone: 'Asia/Shanghai', granularity: 'day', totals, points: [point] }
describe('enterprise usage IPC projection', () => {
  it('preserves enterprise totals and missing tokens without converting null to zero', () => {
    expect(parseUsageSummary(summary)).toMatchObject({ totals, points: [point] })
    expect(parseUsageSummary({ ...summary, totals: { ...totals, total_tokens: null } }).totals.total_tokens).toBeNull()
  })
  it('rejects malformed, duplicate and unbounded buckets', () => {
    expect(() => parseUsageSummary({ ...summary, points: [point, point] })).toThrow()
    expect(() => parseUsageSummary({ ...summary, points: Array(367).fill(point) })).toThrow()
    expect(() => parseUsageSummary({ ...summary, totals: { ...totals, message_count: -1 } })).toThrow()
    expect(() => parseUsageSummary({ ...summary, timezone: 'UTC' })).toThrow()
    expect(() => parseUsageSummary({ ...summary, points: [{ ...point, start_at: 'invalid' }] })).toThrow()
  })
  it('reads only personal storage in GB and preserves unlimited and zero quotas', () => {
    expect(parseUsageStorage([{ resource_type: 'knowledge_space_file', user_used: 0.05, effective: -1, secret: 'ignored' }])).toEqual({ used: 0.05, limit: -1 })
    expect(parseUsageStorage([{ resource_type: 'knowledge_space_file', user_used: 0, effective: 0 }])).toEqual({ used: 0, limit: 0 })
    expect(parseUsageStorage([])).toBeNull()
    expect(() => parseUsageStorage([{ resource_type: 'knowledge_space_file', user_used: -1, effective: 2 }])).toThrow()
  })
})

describe('enterprise identity projection', () => {
  it('projects only avatar and department name', () => {
    expect(parseEnterpriseProfile(
      { avatar: 'https://example.test/a.png', username: 'admin', role: '1,2' },
      { username: 'admin', department_name: ' 临时访客 ' }
    )).toEqual({ avatar: 'https://example.test/a.png', department_name: '临时访客' })
  })
  it('degrades missing or malformed sides to null without inventing roles', () => {
    expect(parseEnterpriseProfile(undefined, undefined)).toEqual({ avatar: null, department_name: null })
    expect(parseEnterpriseProfile({ avatar: 42 }, { department_name: 'x'.repeat(201) })).toEqual({ avatar: null, department_name: null })
  })
  it('resolves the platform-relative avatar against the enterprise origin', () => {
    expect(parseEnterpriseProfile(
      { avatar: 'avatar/1/a.png' },
      { department_name: '临时访客' },
      'https://bs.example.test'
    )).toEqual({ avatar: 'https://bs.example.test/avatar/1/a.png', department_name: '临时访客' })
    expect(parseEnterpriseProfile({ avatar: 'avatar/1/a.png' }, {})).toEqual({ avatar: null, department_name: null })
    expect(parseEnterpriseProfile({ avatar: 'javascript:alert(1)' }, {}, 'https://bs.example.test')).toEqual({ avatar: null, department_name: null })
  })
})
