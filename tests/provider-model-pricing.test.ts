import assert from 'node:assert/strict'
import test from 'node:test'

import {
  compareTokenThresholds,
  isSafeTokenThreshold,
  MAX_SAFE_TOKEN_THRESHOLD,
} from '../src/features/providers/provider-model-pricing.ts'

test('token thresholds preserve the JavaScript safe integer boundary', () => {
  assert.equal(isSafeTokenThreshold(String(MAX_SAFE_TOKEN_THRESHOLD)), true)
  assert.equal(isSafeTokenThreshold('9007199254740992'), false)
  assert.equal(isSafeTokenThreshold('01'), false)
})

test('token thresholds compare exactly before number conversion', () => {
  assert.equal(compareTokenThresholds('9007199254740990', '9007199254740991'), -1)
  assert.equal(compareTokenThresholds('9007199254740991', '9007199254740991'), 0)
})
