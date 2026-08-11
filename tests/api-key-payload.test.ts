import assert from 'node:assert/strict'
import test from 'node:test'

import {
  apiKeyPatchBody,
  createApiKeyBody,
} from '../src/features/api-keys/api-key-payload.ts'

test('API key creation uses the exact management contract', () => {
  assert.deepEqual(
    createApiKeyBody({
      key: 'custom-api-key',
      label: 'CI',
      groupLabel: 'shared-codex',
      expiresAt: null,
      quotaLimitUsd: '12.5',
    }),
    {
      key: 'custom-api-key',
      label: 'CI',
      group_label: 'shared-codex',
      expires_at: null,
      quota_limit_usd: '12.5',
    },
  )
})

test('API key updates omit untouched fields and preserve explicit nulls', () => {
  assert.deepEqual(
    apiKeyPatchBody({
      keyId: 'key-1',
      enabled: false,
      expiresAt: null,
      quotaLimitUsd: null,
    }),
    {
      enabled: false,
      expires_at: null,
      quota_limit_usd: null,
    },
  )
})
