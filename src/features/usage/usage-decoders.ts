import type {
  UsageAttributionBasis,
  UsageCacheTotals,
  UsageCostTotals,
  UsageFilterOptions,
  UsageOverview,
  UsageRequestSummary,
  UsageRequests,
  UsageTokenTotals,
} from '@/features/usage/usage-types'
import {
  requireArray,
  requireEnum,
  requireNonEmptyString,
  requireNonNegativeInteger,
  requirePositiveInteger,
  requireRecord,
  requireTimestamp,
} from '@/lib/api/decode'

export const usageAttributionBases = [
  'user_final_attempt',
  'key_triggered_confirmed_dispatch',
] as const satisfies readonly UsageAttributionBasis[]

// The only cost basis this UI knows how to describe. Its wording ("estimated
// from public model prices") is a claim about what the number means, so a basis
// we have not seen is rejected rather than labelled with someone else's caveat.
const costBases = ['observed_catalog'] as const

export function decodeUsageOverview(value: unknown): UsageOverview {
  const record = requireRecord(value, 'usage overview')

  return {
    attributionBasis: requireEnum(
      record.attribution_basis,
      usageAttributionBases,
      'usage attribution basis',
    ),
    fromMs: requireTimestamp(record.from_ms, 'usage range start'),
    toMs: requireTimestamp(record.to_ms, 'usage range end'),
    logicalRequests: requireNonNegativeInteger(
      record.logical_requests,
      'usage logical requests',
    ),
    attempts: requireNonNegativeInteger(record.attempts, 'usage attempts'),
    tokens: decodeTokenTotals(record.tokens),
    cache: decodeCacheTotals(record.cache),
    cost: decodeCostTotals(record.cost),
    trackingGaps: requireNonNegativeInteger(
      record.tracking_gaps,
      'usage tracking gaps',
    ),
  }
}

export function decodeUsageFilterOptions(value: unknown): UsageFilterOptions {
  const record = requireRecord(value, 'usage filter options')
  return {
    models: requireArray(record.models, 'usage filter models').map((model, index) =>
      requireNonEmptyString(model, `usage filter model ${index + 1}`),
    ),
    groups: requireArray(record.groups, 'usage filter groups').map((group, index) =>
      requireNonEmptyString(group, `usage filter group ${index + 1}`),
    ),
  }
}

export function decodeUsageRequests(value: unknown): UsageRequests {
  const record = requireRecord(value, 'usage requests')
  return {
    attributionBasis: requireEnum(
      record.attribution_basis,
      usageAttributionBases,
      'usage requests attribution basis',
    ),
    pageSize: requirePositiveInteger(record.page_size, 'usage requests page size'),
    requests: requireArray(record.requests, 'usage requests').map(
      (request, index) => decodeRequestSummary(request, `usage request ${index + 1}`),
    ),
    nextCursor: record.next_cursor == null
      ? null
      : requireNonEmptyString(record.next_cursor, 'usage requests next cursor'),
  }
}

function decodeRequestSummary(value: unknown, label: string): UsageRequestSummary {
  const record = requireRecord(value, label)
  const startedAtMs = requireTimestamp(record.started_at_ms, `${label} started at`)
  const completedAtMs = requireTimestamp(
    record.completed_at_ms,
    `${label} completed at`,
  )
  if (completedAtMs < startedAtMs) {
    throw new TypeError(`${label} completed before it started`)
  }
  const firstTokenAtMs = record.first_token_at_ms == null
    ? null
    : requireTimestamp(record.first_token_at_ms, `${label} first token at`)
  if (
    firstTokenAtMs !== null &&
    (firstTokenAtMs < startedAtMs || firstTokenAtMs > completedAtMs)
  ) {
    throw new TypeError(`${label} first token timestamp is outside the request`)
  }

  return {
    requestId: requireNonEmptyString(record.request_id, `${label} request id`),
    apiKeyId:
      record.api_key_id == null
        ? null
        : requireNonEmptyString(record.api_key_id, `${label} api key id`),
    apiKeyLabel:
      record.api_key_label == null
        ? null
        : requireNonEmptyString(record.api_key_label, `${label} api key label`),
    apiKeyGroupLabel:
      record.api_key_group_label == null
        ? null
        : requireNonEmptyString(
            record.api_key_group_label,
            `${label} api key group`,
          ),
    clientModel:
      record.client_model == null
        ? null
        : requireNonEmptyString(record.client_model, `${label} model`),
    reasoningEffort:
      record.reasoning_effort == null
        ? null
        : requireNonEmptyString(
            record.reasoning_effort,
            `${label} reasoning effort`,
          ),
    startedAtMs,
    completedAtMs,
    firstTokenAtMs,
    tokens: decodeTokenTotals(record.tokens),
    cost: decodeCostTotals(record.cost),
  }
}

function decodeTokenTotals(value: unknown): UsageTokenTotals {
  const record = requireRecord(value, 'usage token totals')

  return {
    effectiveInput: requireNonNegativeInteger(
      record.effective_input,
      'effective input tokens',
    ),
    uncachedInput: requireNonNegativeInteger(
      record.uncached_input,
      'uncached input tokens',
    ),
    cacheReadInput: requireNonNegativeInteger(
      record.cache_read_input,
      'cache read input tokens',
    ),
    output: requireNonNegativeInteger(record.output, 'output tokens'),
    attemptsWithUnknownInput: requireNonNegativeInteger(
      record.attempts_with_unknown_input,
      'attempts with unknown input',
    ),
  }
}

function decodeCacheTotals(value: unknown): UsageCacheTotals {
  const record = requireRecord(value, 'usage cache totals')

  return {
    // Hit rate is measured against this, not against hits plus misses: reads
    // that were expected but never reported belong in the denominator without
    // being counted as misses.
    coverageDenominator: requireNonNegativeInteger(
      record.coverage_denominator,
      'cache coverage denominator',
    ),
    hits: requireNonNegativeInteger(record.hits, 'cache hits'),
    misses: requireNonNegativeInteger(record.misses, 'cache misses'),
    expectedButUnreported: requireNonNegativeInteger(
      record.expected_but_unreported,
      'cache expected but unreported',
    ),
  }
}

function decodeCostTotals(value: unknown): UsageCostTotals {
  const record = requireRecord(value, 'usage cost totals')
  requireEnum(record.basis, costBases, 'usage cost basis')

  return {
    completeUsd: requireDecimalAmount(record.complete_usd, 'complete cost'),
    completeAttempts: requireNonNegativeInteger(
      record.complete_attempts,
      'completely priced attempts',
    ),
    partialAttempts: requireNonNegativeInteger(
      record.partial_attempts,
      'partially priced attempts',
    ),
    unavailableAttempts: requireNonNegativeInteger(
      record.unavailable_attempts,
      'attempts without a cost',
    ),
  }
}


// Kept as a string. The backend computes amounts as fixed-point integers so
// they never touch a float, and validating the shape here lets the formatter
// parse with BigInt instead of guarding every call site. An observed cost is
// never negative, so a sign is a contract violation rather than a credit.
function requireDecimalAmount(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) {
    throw new TypeError(`${label} must be a non-negative decimal amount`)
  }

  return value
}
