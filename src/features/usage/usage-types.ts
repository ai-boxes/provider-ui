export type UsageWindowId = '5h' | '24h' | '7d' | '30d' | '90d'

export type UsageTokenTotals = {
  effectiveInput: number
  cacheReadInput: number
  output: number
}

export type UsageCacheTotals = {
  reportedInputTokens: number
  cacheReadInputTokens: number
}

// Amounts stay decimal strings all the way to the formatter. The backend
// computes them as fixed-point i128 precisely so they never pass through a
// float, and summing them as JS numbers would lose that.
export type UsageCostTotals = {
  usd: string | null
}

export type UsageOverview = {
  fromMs: number
  toMs: number
  logicalRequests: number
  tokens: UsageTokenTotals
  cache: UsageCacheTotals
  cost: UsageCostTotals
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
  pageSize: number
  requests: UsageRequestSummary[]
  nextCursor: string | null
}

export type UsageRequestAttemptDetail = {
  cost: {
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
  attempt: UsageRequestAttemptDetail
}

export type UsageRange = {
  fromMs: number
  toMs: number
}
