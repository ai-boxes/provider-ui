import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decodeDashboardOverview,
  decodeDashboardProviders,
} from '../src/features/dashboard/dashboard-decoders.ts'

function overviewPayload() {
  return {
    from_ms: 1_700_000_000_000,
    to_ms: 1_700_086_400_000,
    requests: 4,
    successes: 3,
    failures: 1,
    success_rate: 0.75,
    tokens: {
      cache_read_input: 20,
      effective_input: 100,
      output: 50,
      total: 150,
    },
    total_tokens: {
      cache_read_input: 40,
      effective_input: 200,
      output: 100,
      total: 300,
    },
    cost: { usd: '1.25000000000000' },
    avg_response_ms: 480,
    ttft_p50_ms: 120,
    accounts: {
      active: 1,
      reauth_required: 0,
      disabled: 1,
    },
    failure_layers: {
      upstream_failed_requests: 1,
      zero_dispatch_logical_failures: 2,
    },
  }
}

test('dashboard decoders preserve null KPI values and quota percentages', () => {
  const overview = decodeDashboardOverview(overviewPayload())
  assert.equal(overview.successRate, 0.75)
  assert.equal(overview.tokens.total, 150)
  assert.equal(overview.totalTokens.total, 300)
  assert.equal(overview.costUsd, '1.25000000000000')
  assert.equal(overview.avgResponseMs, 480)
  assert.equal(overview.failureLayers.zeroDispatchLogicalFailures, 2)

  const providers = decodeDashboardProviders({
    accounts: [
      {
        account_id: 'account-1',
        provider: 'codex',
        label: 'Codex',
        group_label: 'codex',
        enabled: true,
        auth_state: 'active',
        requests: 4,
        successes: 3,
        failures: 1,
        success_rate: 0.75,
        ttft_p50_ms: 120,
        duration_p95_ms: 900,
        quota: {
          tightest_remaining_percent: 18,
        },
      },
    ],
    groups: ['codex'],
    series: {
      bucket_ms: 3_600_000,
      buckets: [1_700_000_000_000],
      requests: [4],
      failures: [1],
    },
  })

  assert.equal(providers.accounts[0]?.quota.tightestRemainingPercent, 18)
  assert.deepEqual(providers.series.failures, [1])
})

test('dashboard decoders reject a malformed hourly series', () => {
  assert.throws(
    () =>
      decodeDashboardProviders({
        accounts: [],
        groups: [],
        series: {
          bucket_ms: 3_600_000,
          buckets: [1_700_000_000_000],
          requests: [],
          failures: [0],
        },
        failure_layers: {
          upstream_failed_requests: 0,
          zero_dispatch_logical_failures: 0,
        },
      }),
    /same length/,
  )
})
