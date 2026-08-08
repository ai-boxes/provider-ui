import type {
  UsageAttributionBasis,
  UsageCacheTotals,
  UsageCostTotals,
  UsageFilterOptions,
  UsageOverview,
  UsageRequestSummary,
  UsageRequestDetail,
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
const costStatuses = [
  'complete_for_observed_catalog_components',
  'partial',
  'unavailable',
] as const

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

export function decodeUsageRequestDetail(value: unknown): UsageRequestDetail {
  const record = requireRecord(value, 'usage request detail')
  return {
    requestId: requireNonEmptyString(record.request_id, 'usage request detail id'),
    attempts: requireArray(record.attempts, 'usage request detail attempts').map(
      (value, index) => {
        const label = `usage request attempt ${index + 1}`
        const attempt = requireRecord(value, label)
        const cost = requireRecord(attempt.cost, `${label} cost`)
        const components = requireRecord(
          cost.components,
          `${label} cost components`,
        )
        const price = requireRecord(attempt.price, `${label} price`)

        if (typeof attempt.attributed !== 'boolean') {
          throw new TypeError(`${label} attribution must be a boolean`)
        }

        return {
          attributed: attempt.attributed,
          cost: {
            status: requireEnum(cost.status, costStatuses, `${label} cost status`),
            totalUsd: nullableDecimalAmount(cost.usd, `${label} total cost`),
            inputUsd: nullableDecimalAmount(
              components.input_usd,
              `${label} input cost`,
            ),
            outputUsd: nullableDecimalAmount(
              components.output_usd,
              `${label} output cost`,
            ),
            cacheReadUsd: nullableDecimalAmount(
              components.cache_read_usd,
              `${label} cache read cost`,
            ),
            cacheWriteUsd: nullableDecimalAmount(
              components.cache_write_usd,
              `${label} cache write cost`,
            ),
            reasoningUsd: nullableDecimalAmount(
              components.reasoning_usd,
              `${label} reasoning cost`,
            ),
            inputAudioUsd: nullableDecimalAmount(
              components.input_audio_usd,
              `${label} input audio cost`,
            ),
            outputAudioUsd: nullableDecimalAmount(
              components.output_audio_usd,
              `${label} output audio cost`,
            ),
          },
          price: {
            pricingContextTokens: nullableNonNegativeInteger(
              price.pricing_context_tokens,
              `${label} pricing context tokens`,
            ),
            tierThresholdTokens: nullableNonNegativeInteger(
              price.tier_threshold_tokens,
              `${label} tier threshold tokens`,
            ),
            inputPerMillionUsd: nullableDecimalAmount(
              price.input_per_million_usd,
              `${label} input price`,
            ),
            outputPerMillionUsd: nullableDecimalAmount(
              price.output_per_million_usd,
              `${label} output price`,
            ),
            cacheReadPerMillionUsd: nullableDecimalAmount(
              price.cache_read_per_million_usd,
              `${label} cache read price`,
            ),
            cacheWritePerMillionUsd: nullableDecimalAmount(
              price.cache_write_per_million_usd,
              `${label} cache write price`,
            ),
            reasoningPerMillionUsd: nullableDecimalAmount(
              price.reasoning_per_million_usd,
              `${label} reasoning price`,
            ),
            inputAudioPerMillionUsd: nullableDecimalAmount(
              price.input_audio_per_million_usd,
              `${label} input audio price`,
            ),
            outputAudioPerMillionUsd: nullableDecimalAmount(
              price.output_audio_per_million_usd,
              `${label} output audio price`,
            ),
          },
        }
      },
    ),
  }
}

function nullableNonNegativeInteger(value: unknown, label: string): number | null {
  return value == null ? null : requireNonNegativeInteger(value, label)
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
    attemptsWithUnknownOutput: requireNonNegativeInteger(
      record.attempts_with_unknown_output,
      'attempts with unknown output',
    ),
    attemptsWithUnknownCache: requireNonNegativeInteger(
      record.attempts_with_unknown_cache,
      'attempts with unknown cache usage',
    ),
  }
}

function decodeCacheTotals(value: unknown): UsageCacheTotals {
  const record = requireRecord(value, 'usage cache totals')

  return {
    reportedInputTokens: requireNonNegativeInteger(
      record.reported_input_tokens,
      'cache reported input tokens',
    ),
    cacheReadInputTokens: requireNonNegativeInteger(
      record.cache_read_input_tokens,
      'cache read input tokens',
    ),
    attemptsWithUnknownCache: requireNonNegativeInteger(
      record.attempts_with_unknown_cache,
      'attempts with unknown cache usage',
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

function nullableDecimalAmount(value: unknown, label: string): string | null {
  return value == null ? null : requireDecimalAmount(value, label)
}
