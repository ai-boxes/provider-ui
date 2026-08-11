import assert from 'node:assert/strict'
import test from 'node:test'

import { availableProviderGroups } from '../src/features/api-keys/provider-group-options.ts'

test('provider groups are deduplicated and limited to usable accounts', () => {
  assert.deepEqual(
    availableProviderGroups([
      { groupLabel: 'zeta', enabled: true, authState: 'active' },
      { groupLabel: 'alpha', enabled: true, authState: 'active' },
      { groupLabel: 'alpha', enabled: true, authState: 'active' },
      { groupLabel: 'disabled', enabled: false, authState: 'active' },
      {
        groupLabel: 'reauth',
        enabled: true,
        authState: 'reauth_required',
      },
    ]),
    ['alpha', 'zeta'],
  )
})
