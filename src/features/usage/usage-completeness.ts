import type {
  UsageCacheTotals,
  UsageCostTotals,
  UsageTokenTotals,
} from '@/features/usage/usage-types'

export type UsageValueCompleteness =
  | 'complete'
  | 'lower_bound'
  | 'reported_only'
  | 'unavailable'

export function tokenCompleteness(
  tokens: UsageTokenTotals,
  trackingGaps = 0,
): UsageValueCompleteness {
  return trackingGaps > 0 ||
    tokens.attemptsWithUnknownInput > 0 ||
    tokens.attemptsWithUnknownOutput > 0
    ? 'lower_bound'
    : 'complete'
}

export function cacheCompleteness(
  cache: UsageCacheTotals,
  trackingGaps = 0,
): UsageValueCompleteness {
  if (trackingGaps > 0) {
    return 'unavailable'
  }
  return cache.attemptsWithUnknownCache > 0 ? 'reported_only' : 'complete'
}

export function costCompleteness(
  cost: UsageCostTotals,
  trackingGaps = 0,
): UsageValueCompleteness {
  return trackingGaps > 0 ||
    cost.completeAttempts === 0 ||
    cost.partialAttempts > 0 ||
    cost.unavailableAttempts > 0
    ? 'unavailable'
    : 'complete'
}
