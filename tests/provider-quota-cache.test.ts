import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldAutoFetchProviderQuota } from '../src/features/providers/provider-quota-policy.ts'
import type { ProviderQuota } from '../src/features/providers/provider-types.ts'

function quota(
  overrides: Partial<ProviderQuota> = {},
): ProviderQuota {
  return {
    support: 'supported',
    freshness: null,
    snapshot: null,
    lastError: null,
    ...overrides,
  }
}

test('quota auto-fetch runs only for supported accounts without a snapshot', () => {
  assert.equal(shouldAutoFetchProviderQuota(quota()), true)
  assert.equal(
    shouldAutoFetchProviderQuota(
      quota({
        snapshot: {
          accountId: 'account-1',
          provider: 'codex',
          fetchedAt: 1,
          groups: [],
          warnings: [],
        },
      }),
    ),
    false,
  )
  assert.equal(
    shouldAutoFetchProviderQuota(quota({ support: 'unsupported' })),
    false,
  )
})
