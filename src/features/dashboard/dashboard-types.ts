export type DashboardRange = {
  fromMs: number
  toMs: number
}

export type DashboardQuota = {
  tightestRemainingPercent: number | null
}

export type DashboardAccountMetrics = {
  accountId: string
  provider: ProviderKind
  label: string
  groupLabel: string
  enabled: boolean
  authState: 'active' | 'reauth_required'
  requests: number
  successes: number
  failures: number
  successRate: number | null
  ttftP50Ms: number | null
  durationP95Ms: number | null
  quota: DashboardQuota
}

export type DashboardSeries = {
  bucketMs: number
  buckets: number[]
  requests: number[]
  failures: number[]
}

export type DashboardFailureLayers = {
  upstreamFailedRequests: number
  zeroDispatchLogicalFailures: number
}

export type DashboardAccountCounts = {
  active: number
  reauthRequired: number
  disabled: number
}

export type DashboardOverview = {
  fromMs: number
  toMs: number
  requests: number
  successes: number
  failures: number
  successRate: number | null
  tokens: {
    cacheReadInput: number
    effectiveInput: number
    output: number
    total: number
  }
  totalTokens: {
    cacheReadInput: number
    effectiveInput: number
    output: number
    total: number
  }
  costUsd: string | null
  avgResponseMs: number | null
  ttftP50Ms: number | null
  accounts: DashboardAccountCounts
  failureLayers: DashboardFailureLayers
}

export type DashboardProviders = {
  accounts: DashboardAccountMetrics[]
  groups: string[]
  series: DashboardSeries
}
import type { ProviderKind } from '../providers/provider-types.ts'
