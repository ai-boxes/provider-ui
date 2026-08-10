import assert from 'node:assert/strict'
import test from 'node:test'

import {
  elapsedLatencyMs,
  formatUsageLatencyMs,
  totalLatencyMs,
} from '../src/features/usage/usage-latency-format.ts'
import {
  latencyIndicator,
} from '../src/features/usage/usage-latency-scale.ts'

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

test('TTFT and total latency use independent progress scales', () => {
  assert.deepEqual(latencyIndicator(100, 'ttft'), {
    color: '#22c55e',
    progressPercent: 100 / 30,
    tone: 'green',
  })
  assert.deepEqual(latencyIndicator(30_000, 'total'), {
    color: '#ef4444',
    progressPercent: 100,
    tone: 'red',
  })
})

test('latency status moves from green to yellow to red', () => {
  assert.equal(latencyIndicator(1_000, 'ttft')?.tone, 'green')
  assert.equal(latencyIndicator(1_001, 'ttft')?.tone, 'yellow')
  assert.equal(latencyIndicator(3_000, 'ttft')?.tone, 'red')
  assert.equal(latencyIndicator(10_000, 'total')?.tone, 'green')
  assert.equal(latencyIndicator(10_001, 'total')?.tone, 'yellow')
  assert.equal(latencyIndicator(30_000, 'total')?.tone, 'red')
})
