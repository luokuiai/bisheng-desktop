import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { expect, it } from 'vitest'

const source = await readFile(new URL('../packages/dsh-desktop-settings/client.js', import.meta.url), 'utf8')
let definition
vm.runInNewContext(source, { window: { __ModuleLoader__: { load: entry => { definition = entry } } } })
const plugin = definition.factory(id => ({ react: {}, '@deepseek-ai/dsh-client-ui-primitives': {} })[id])
const { buildHeatmapLayout, sumCurrentYearMessages, peakTokens, longestMessageStreak, tokenDeltaPercent, formatDeltaPercent } = plugin.helpers

const point = (date, tokens, messages = 1) => ({
  start_at: `${date}T00:00:00+08:00`,
  end_at: `${new Date(Date.parse(`${date}T00:00:00+08:00`) + 86400000).toISOString()}`,
  total_tokens: tokens,
  message_count: messages
})
const now = Date.parse('2026-11-26T12:00:00+08:00')

it('builds rolling 7 / 42 / 266 day windows with seven rows and no axis labels', () => {
  const points = [point('2026-11-25', 100)]
  const year = buildHeatmapLayout(points, 'year', 'tokens', now)
  expect(year).toMatchObject({ rows: 7, columns: 38 })
  expect(year.cells).toHaveLength(266)
  expect(year.cells.at(-1).date).toBe('2026-11-26')
  expect(year.cells[0].date).toBe('2026-03-06')
  expect(buildHeatmapLayout(points, 'month', 'tokens', now).cells).toHaveLength(42)
  expect(buildHeatmapLayout(points, 'week', 'tokens', now).cells).toHaveLength(7)
})

it('levels cells against the metric maximum and marks future days separately', () => {
  const points = [point('2026-11-25', 100), point('2026-11-24', 20)]
  const layout = buildHeatmapLayout(points, 'week', 'tokens', now)
  const levels = Object.fromEntries(layout.cells.filter(cell => cell.point).map(cell => [cell.date, cell.level]))
  expect(levels['2026-11-25']).toBe(5)
  expect(levels['2026-11-24']).toBe(1)
  expect(layout.cells.every(cell => cell.state === 'future')).toBe(false)
  expect(layout.cells.some(cell => cell.state === 'outside')).toBe(true)
})

it('derives current-year contributions, peak tokens and the Shanghai streak', () => {
  const points = [point('2025-12-31', 10), point('2026-01-01', 50), point('2026-01-02', 30), point('2026-11-25', 80, 0)]
  expect(sumCurrentYearMessages(points, now)).toBe(2)
  expect(peakTokens(points)).toBe(80)
  expect(longestMessageStreak(points)).toBe(3)
  expect(peakTokens([point('2026-01-01', null, 1)])).toBeNull()
})

it('hides the trend delta until two comparable 30-day windows exist', () => {
  const recent = [point('2026-11-25', 10)]
  expect(tokenDeltaPercent(recent)).toBeNull()
  expect(tokenDeltaPercent([point('2026-09-30', 5), point('2026-11-25', 10)])).toBe(100)
  expect(formatDeltaPercent(9.44)).toBe('+9.4%')
  expect(formatDeltaPercent(null)).toBeNull()
})
