import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyTimeRangeParams,
  currentTimeRange,
  parseTimeRangeSelection,
} from '../src/features/time-range/time-range.ts'

test('shared time range defaults to 5h and writes quick presets', () => {
  const params = new URLSearchParams()
  assert.deepEqual(parseTimeRangeSelection(params), {
    kind: 'preset',
    preset: '5h',
  })

  applyTimeRangeParams(params, { kind: 'preset', preset: '7d' })
  assert.equal(params.toString(), 'window=7d')
  assert.deepEqual(parseTimeRangeSelection(params), {
    kind: 'preset',
    preset: '7d',
  })
})

test('shared time range round-trips custom boundaries', () => {
  const params = new URLSearchParams()
  const selection = {
    kind: 'custom' as const,
    fromMs: 1_700_000_000_000,
    toMs: 1_700_018_000_000,
  }

  applyTimeRangeParams(params, selection)
  assert.deepEqual(parseTimeRangeSelection(params), selection)
  assert.deepEqual(currentTimeRange(selection), {
    fromMs: selection.fromMs,
    toMs: selection.toMs,
  })
})

test('custom ranges wider than 90 days fall back to the default', () => {
  const params = new URLSearchParams({
    from_ms: '1700000000000',
    to_ms: String(1700000000000 + 90 * 24 * 60 * 60 * 1000 + 1),
  })

  assert.deepEqual(parseTimeRangeSelection(params), {
    kind: 'preset',
    preset: '5h',
  })
})
