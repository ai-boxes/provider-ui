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
  attemptsWithUnknownInput: number
  attemptsWithUnknownOutput: number
  attemptsWithUnknownCache: number
}

export type UsageCacheTotals = {
  reportedInputTokens: number
  cacheReadInputTokens: number
  attemptsWithUnknownCache: number
}

// Amounts stay decimal strings all the way to the formatter. The backend
// computes them as fixed-point i128 precisely so they never pass through a
// float, and summing them as JS numbers would lose that.
export type UsageCostTotals = {
  completeUsd: string
  completeAttempts: number
  partialAttempts: number
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

export type UsageRequestAttemptDetail = {
  attributed: boolean
  cost: {
    status: 'complete_for_observed_catalog_components' | 'partial' | 'unavailable'
    totalUsd: string | null
    inputUsd: string | null
    outputUsd: string | null
    cacheReadUsd: string | null
    cacheWriteUsd: string | null
    reasoningUsd: string | null
    inputAudioUsd: string | null
    outputAudioUsd: string | null
  }
  price: {
    pricingContextTokens: number | null
    tierThresholdTokens: number | null
    inputPerMillionUsd: string | null
    outputPerMillionUsd: string | null
    cacheReadPerMillionUsd: string | null
    cacheWritePerMillionUsd: string | null
    reasoningPerMillionUsd: string | null
    inputAudioPerMillionUsd: string | null
    outputAudioPerMillionUsd: string | null
  }
}

export type UsageRequestDetail = {
  requestId: string
  attempts: UsageRequestAttemptDetail[]
}

export type UsageRange = {
  fromMs: number
  toMs: number
}
