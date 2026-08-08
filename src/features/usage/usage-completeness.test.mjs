import assert from 'node:assert/strict'
import test from 'node:test'

import {
  cacheCompleteness,
  costCompleteness,
  tokenCompleteness,
} from './usage-completeness.ts'

const completeCost = {
  completeUsd: '1.25',
  completeAttempts: 1,
  partialAttempts: 0,
  unavailableAttempts: 0,
}

test('cost is displayable only when every attempt and the range are complete', () => {
  assert.equal(costCompleteness(completeCost), 'complete')
  assert.equal(
    costCompleteness({ ...completeCost, partialAttempts: 1 }),
    'unavailable',
  )
  assert.equal(
    costCompleteness({ ...completeCost, unavailableAttempts: 1 }),
    'unavailable',
  )
  assert.equal(costCompleteness(completeCost, 1), 'unavailable')
})

test('unknown tokens are lower bounds while unknown cache is reported-only', () => {
  assert.equal(
    tokenCompleteness({
      effectiveInput: 10,
      uncachedInput: 10,
      cacheReadInput: 0,
      output: 5,
      attemptsWithUnknownInput: 1,
      attemptsWithUnknownOutput: 0,
      attemptsWithUnknownCache: 0,
    }),
    'lower_bound',
  )
  assert.equal(
    cacheCompleteness({
      reportedInputTokens: 10,
      cacheReadInputTokens: 5,
      attemptsWithUnknownCache: 1,
    }),
    'reported_only',
  )
})
