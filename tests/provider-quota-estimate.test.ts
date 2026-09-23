import assert from 'node:assert/strict'
import test from 'node:test'

import { matchingPrimaryEstimate } from '../src/features/providers/provider-quota-metrics.ts'
import type { ProviderQuota } from '../src/features/providers/provider-types.ts'

const estimate: NonNullable<ProviderQuota['estimate']> = {
  quotaGroupKey: 'codex',
  quotaMetricKey: 'primary',
  periodKind: 'rolling',
  durationSeconds: 18_000,
  windowStartMs: 1_700_000_000_000,
  samplingIncomplete: false,
  windowEndMs: 1_700_018_000_000,
  observedAtMs: 1_700_017_000_000,
  observedUsedPercent: 50,
  observedCostUsd: '20.00000000000000',
  estimatedLimitCostUsd: '40.00000000000000',
  costCompleteness: 'lower_bound',
  pricedAttempts: 96,
  dispatchedAttempts: 100,
}

function quota(metricKey = 'primary') {
  return {
    support: 'supported',
    freshness: 'fresh',
    snapshot: {
      accountId: 'account-1',
      provider: 'codex',
      fetchedAt: 1_700_017_000,
      groups: [
        {
          key: 'codex',
          scope: 'aggregate',
          attributes: {},
          metrics: [
            {
              key: metricKey,
              kind: 'usage',
              unit: 'percent',
              used: 1,
              remaining: 99,
              limit: 100,
              period: {
                kind: 'rolling',
                startsAt: 1_700_000_000,
                endsAt: 1_700_018_000,
                durationSeconds: 18_000,
              },
              breakdown: [],
            },
          ],
        },
      ],
      warnings: [],
    },
    lastError: null,
    estimate,
  } satisfies ProviderQuota
}

test('Estimate is usable only when it follows the primary Quota metric', () => {
  assert.equal(matchingPrimaryEstimate(quota())?.estimatedLimitCostUsd, '40.00000000000000')
  assert.equal(matchingPrimaryEstimate(quota('secondary')), null)
})

test('Estimate is hidden when its period differs from the primary Quota period', () => {
  const value = quota()
  value.snapshot.groups[0].metrics[0].period = {
    kind: 'rolling',
    startsAt: null,
    endsAt: null,
    durationSeconds: 18_000,
  }
  value.estimate = { ...estimate, durationSeconds: 604_800, periodKind: 'weekly' }
  assert.equal(matchingPrimaryEstimate(value), null)
})
