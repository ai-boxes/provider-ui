import type {
  UsageAttributionBasis,
  UsageCacheTotals,
  UsageCostTotals,
  UsageOverview,
  UsageTokenTotals,
} from '@/features/usage/usage-types'
import {
  requireEnum,
  requireNonNegativeInteger,
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

function decodeTokenTotals(value: unknown): UsageTokenTotals {
  const record = requireRecord(value, 'usage token totals')

  return {
    effectiveInput: requireNonNegativeInteger(
      record.effective_input,
      'effective input tokens',
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
    partialKnownUsd: requireDecimalAmount(
      record.partial_known_usd,
      'partially known cost',
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
