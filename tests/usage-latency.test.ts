import assert from 'node:assert/strict'
import test from 'node:test'

import {
  elapsedLatencyMs,
  formatUsageLatencyMs,
  totalLatencyMs,
} from '../src/features/usage/usage-latency-format.ts'

test('missing first-token time stays unknown instead of using total latency', () => {
  const startedAtMs = 1_000
  const completedAtMs = 1_007

  assert.equal(elapsedLatencyMs(startedAtMs, null), null)
  assert.equal(formatUsageLatencyMs(null), '—')
  assert.equal(totalLatencyMs(startedAtMs, completedAtMs), 7)
  assert.equal(formatUsageLatencyMs(7), '7ms')
})

test('first-token and total latency are calculated independently', () => {
  const startedAtMs = 1_000

  assert.equal(elapsedLatencyMs(startedAtMs, 1_125), 125)
  assert.equal(totalLatencyMs(startedAtMs, 1_840), 840)
})
