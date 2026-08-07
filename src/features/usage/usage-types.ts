// Observed usage: what we saw the upstream consume, priced from a public
// catalog. Nothing here is a bill, and a missing value is never a zero.

export type UsageAttributionBasis =
  | 'user_final_attempt'
  | 'key_triggered_confirmed_dispatch'

export type UsageWindowId = '5h' | '24h' | '7d' | '30d' | '90d'

export type UsageTokenTotals = {
  // Total input, cache reads included. Uncached input is what upstream reported
  // minus the cached part, so the two must never be added together.
  effectiveInput: number
  uncachedInput: number
  cacheReadInput: number
  // Reasoning tokens are already inside this figure for the only provider that
  // reports usage today, and whether they are is a per-provider contract fact
  // this aggregate does not carry. Nothing here may be summed with reasoning.
  output: number
  // Attempts that contributed nothing to effectiveInput because the upstream
  // never reported it. They are not zeroes, they make the totals an undercount.
  attemptsWithUnknownInput: number
}

export type UsageCacheTotals = {
  coverageDenominator: number
  hits: number
  misses: number
  expectedButUnreported: number
}

// Amounts stay decimal strings all the way to the formatter. The backend
// computes them as fixed-point i128 precisely so they never pass through a
// float, and summing them as JS numbers would lose that.
export type UsageCostTotals = {
  completeUsd: string
  completeAttempts: number
  partialAttempts: number
  // No amount at all. Never rendered as 0.
  unavailableAttempts: number
}

export type UsageOverview = {
  attributionBasis: UsageAttributionBasis
  fromMs: number
  toMs: number
  logicalRequests: number
  attempts: number
  tokens: UsageTokenTotals
  cache: UsageCacheTotals
  cost: UsageCostTotals
  // Known bookkeeping losses. Non-zero means every number is an undercount and
  // the UI has to say so.
  trackingGaps: number
}

export type UsageFilterOptions = {
  models: string[]
  groups: string[]
}

export type UsageRequestSummary = {
  requestId: string
  apiKeyId: string | null
  apiKeyLabel: string | null
  apiKeyGroupLabel: string | null
  clientModel: string | null
  reasoningEffort: string | null
  startedAtMs: number
  completedAtMs: number
  firstTokenAtMs: number | null
  tokens: UsageTokenTotals
  cost: UsageCostTotals
}

export type UsageRequests = {
  attributionBasis: UsageAttributionBasis
  pageSize: number
  requests: UsageRequestSummary[]
  nextCursor: string | null
}

export type UsageRange = {
  fromMs: number
  toMs: number
}
