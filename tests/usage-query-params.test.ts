import assert from 'node:assert/strict'
import test from 'node:test'

import { usageQueryParams } from '../src/features/usage/usage-query-params.ts'

test('usage pagination carries filters and cursor without changing their values', () => {
  const params = usageQueryParams(
    { fromMs: 10, toMs: 20 },
    {
      apiKeyId: 'key/one',
      model: 'gpt test',
      groupLabel: 'shared',
      cursor: '20:req/one',
    },
  )

  assert.deepEqual(Object.fromEntries(params), {
    from_ms: '10',
    to_ms: '20',
    api_key_id: 'key/one',
    model: 'gpt test',
    group: 'shared',
    cursor: '20:req/one',
  })
})

test('usage pagination omits empty optional filters', () => {
  assert.equal(
    usageQueryParams(
      { fromMs: 10, toMs: 20 },
      { apiKeyId: null, model: '', groupLabel: null, cursor: null },
    ).toString(),
    'from_ms=10&to_ms=20',
  )
})
