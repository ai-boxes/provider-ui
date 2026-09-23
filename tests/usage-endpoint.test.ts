import assert from 'node:assert/strict'
import test from 'node:test'

import { decodeUsageRequests } from '../src/features/usage/usage-decoders.ts'
import {
  formatUsageEndpoint,
  formatUsageRequestStatus,
} from '../src/features/usage/usage-format.ts'

const endpoints = [
  ['openai_responses', '/v1/responses'],
  ['openai_chat_completions', '/v1/chat/completions'],
  ['claude_messages', '/v1/messages'],
] as const

test('usage request endpoints are decoded and formatted', () => {
  for (const [endpoint, label] of endpoints) {
    const decoded = decodeUsageRequests(usageRequestsPayload(endpoint))

    assert.equal(decoded.requests[0]?.endpoint, endpoint)
    assert.equal(formatUsageEndpoint(endpoint), label)
  }
})

test('missing historical endpoint remains unknown', () => {
  const payload = usageRequestsPayload(null)
  const request = (payload.requests as Record<string, unknown>[])[0]
  delete request.endpoint

  const decoded = decodeUsageRequests(payload)

  assert.equal(decoded.requests[0]?.endpoint, null)
  assert.equal(formatUsageEndpoint(null), '—')
})

test('unknown non-null endpoint violates the usage API contract', () => {
  assert.throws(
    () => decodeUsageRequests(usageRequestsPayload('legacy_chat')),
    /usage request 1 endpoint is unsupported/,
  )
})

test('usage request status is required and formatted', () => {
  const decoded = decodeUsageRequests(usageRequestsPayload('openai_responses'))
  assert.equal(decoded.total, 1)
  assert.equal(decoded.requests[0]?.status, 'succeeded')
  assert.equal(formatUsageRequestStatus('succeeded'), 'Succeeded')

  const payload = usageRequestsPayload('openai_responses')
  const request = (payload.requests as Record<string, unknown>[])[0]
  request.status = 'unknown'
  assert.throws(() => decodeUsageRequests(payload), /usage request 1 status is unsupported/)
})

function usageRequestsPayload(endpoint: unknown) {
  return {
    page_size: 50,
    total: 1,
    requests: [
      {
        request_id: 'request-1',
        status: 'succeeded',
        endpoint,
        api_key_id: null,
        api_key_label: null,
        api_key_group_labels: null,
        client_model: 'example-model',
        provider_reported_model: 'example-model',
        reasoning_effort: null,
        started_at_ms: 1_000,
        completed_at_ms: 2_000,
        first_token_at_ms: 1_500,
        tokens: {
          effective_input: 10,
          cache_read_input: 0,
          output: 5,
        },
        cost: { usd: '0.000001' },
      },
    ],
    next_cursor: null,
  }
}

test('usage request reported model is optional and preserved', () => {
  const matched = decodeUsageRequests(usageRequestsPayload('openai_responses'))
  assert.equal(matched.requests[0]?.clientModel, 'example-model')
  assert.equal(matched.requests[0]?.providerReportedModel, 'example-model')

  const payload = usageRequestsPayload('openai_responses')
  const request = (payload.requests as Record<string, unknown>[])[0]
  request.provider_reported_model = 'gpt-5.6-luna'
  const remapped = decodeUsageRequests(payload)
  assert.equal(remapped.requests[0]?.providerReportedModel, 'gpt-5.6-luna')

  delete request.provider_reported_model
  const missing = decodeUsageRequests(payload)
  assert.equal(missing.requests[0]?.providerReportedModel, null)
})
