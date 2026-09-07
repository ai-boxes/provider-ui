export type ProviderKind =
  | 'grok'
  | 'codex'
  | 'antigravity'
  | 'openai_compatible'
  | 'anthropic_compatible'

export type ProviderVisibility = 'private' | 'shared'

export type ProviderCredentialKind = 'oauth' | 'api_key'

export type ProviderAuthState = 'active' | 'reauth_required'

export type OpenAiUpstreamProtocol = 'chat_completions' | 'responses'

export type ProviderOAuthStatus =
  | 'pending'
  | 'provisioning'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ProviderAccount = {
  id: string
  ownerUserId: string
  visibility: ProviderVisibility
  provider: ProviderKind
  label: string
  groupLabel: string
  priority: number
  baseUrl: string | null
  upstreamProtocol: OpenAiUpstreamProtocol | null
  credentialKind: ProviderCredentialKind
  enabled: boolean
  authState: ProviderAuthState
  safeErrorCode: string | null
  createdAt: number
  updatedAt: number
}

export type ProviderQuotaSupport = 'supported' | 'unsupported'

export type ProviderQuotaFreshness = 'fresh' | 'stale'

export type ProviderQuotaErrorKind =
  | 'unsupported'
  | 'authentication'
  | 'rate_limited'
  | 'upstream'
  | 'invalid_response'
  | 'internal'

export type ProviderQuotaGroupScope = 'aggregate' | 'product' | 'billing'

export type ProviderQuotaMetricKind = 'usage' | 'balance'

export type ProviderQuotaUnit =
  | 'percent'
  | 'usd_cents'
  | 'count'
  | 'credits'

export type ProviderQuotaPeriodKind =
  | 'weekly'
  | 'monthly'
  | 'rolling'
  | 'unknown'

export type ProviderQuotaScalar = string | number | boolean

export type ProviderQuotaPeriod = {
  kind: ProviderQuotaPeriodKind
  startsAt: number | null
  endsAt: number | null
  durationSeconds: number | null
}

export type ProviderQuotaBreakdown = {
  key: string
  label: string
  used: number
}

export type ProviderQuotaMetric = {
  key: string
  kind: ProviderQuotaMetricKind
  unit: ProviderQuotaUnit
  used: number | null
  remaining: number | null
  limit: number | null
  period: ProviderQuotaPeriod | null
  breakdown: ProviderQuotaBreakdown[]
}

export type ProviderQuotaGroup = {
  key: string
  scope: ProviderQuotaGroupScope
  attributes: Record<string, ProviderQuotaScalar>
  metrics: ProviderQuotaMetric[]
}

export type ProviderQuotaSnapshot = {
  accountId: string
  provider: ProviderKind
  fetchedAt: number
  groups: ProviderQuotaGroup[]
  warnings: string[]
}

export type ProviderQuota = {
  support: ProviderQuotaSupport
  freshness: ProviderQuotaFreshness | null
  snapshot: ProviderQuotaSnapshot | null
  lastError: ProviderQuotaErrorKind | null
  estimate: ProviderQuotaEstimate | null
}

export type ProviderQuotaEstimateCompleteness = 'complete' | 'lower_bound'

export type ProviderQuotaEstimate = {
  quotaGroupKey: string
  quotaMetricKey: string
  periodKind: ProviderQuotaPeriodKind
  durationSeconds: number | null
  windowStartMs: number
  samplingIncomplete: boolean
  windowEndMs: number
  observedAtMs: number
  observedUsedPercent: number
  observedCostUsd: string
  estimatedLimitCostUsd: string
  costCompleteness: ProviderQuotaEstimateCompleteness
  pricedAttempts: number
  dispatchedAttempts: number
}

export type ProviderQuotaEstimateSeries = {
  groupKey: string
  metricKey: string
  periodKind: ProviderQuotaPeriodKind
  durationSeconds: number | null
  points: ProviderQuotaEstimate[]
}

export type ProviderQuotaEstimateHistory = {
  fromMs: number
  toMs: number
  series: ProviderQuotaEstimateSeries[]
}

export type ProviderAccountWithQuota = ProviderAccount & {
  quota: ProviderQuota
}

export type ProviderHealthAccount = {
  accountId: string
  requests: number
  successes: number
  failures: number
}

export type ProviderHealthSnapshot = {
  fromMs: number
  toMs: number
  accounts: ProviderHealthAccount[]
}

export type ProviderModel = {
  accountId: string
  upstreamModel: string
  alias: string | null
  effectiveModel: string
  enabled: boolean
  available: boolean
  routable: boolean
  inputModalities: ProviderModelInputModality[] | null
  metadata: Record<string, unknown> | null
  pricing: ProviderModelPricing | null
  lastSeenAt: number | null
  createdAt: number
  updatedAt: number
}

export type ProviderModelInputModality =
  | 'text'
  | 'image'
  | 'pdf'
  | 'audio'
  | 'video'

export type ProviderModelPricing = {
  input: string | null
  output: string | null
  cacheRead: string | null
  cacheWrite: string | null
  reasoning: string | null
  inputAudio: string | null
  outputAudio: string | null
  tiers: ProviderModelPricingTier[]
}

export type ProviderModelPricingTier = {
  thresholdTokens: number
  input: string | null
  output: string | null
  cacheRead: string | null
  cacheWrite: string | null
  reasoning: string | null
  inputAudio: string | null
  outputAudio: string | null
}

export type ProviderModelCatalogSnapshot = {
  models: ProviderModel[]
}

export type CreatedProviderAccount = {
  account: ProviderAccount
  models: ProviderModelCatalogSnapshot
}

export type OAuthProviderKind = Extract<
  ProviderKind,
  'grok' | 'codex' | 'antigravity'
>

export type CompatibleProviderKind = Exclude<ProviderKind, OAuthProviderKind>

export type ProviderOAuthSession = {
  id: string
  ownerUserId: string
  visibility: ProviderVisibility
  provider: OAuthProviderKind
  accountId: string
  label: string
  groupLabel: string
  status: ProviderOAuthStatus
  challenge: {
    verificationUri: string
    verificationUriComplete: string | null
    userCode: string
    expiresAt: number
    intervalSeconds: number
  }
  error: string | null
}

export type CreateProviderBaseInput = {
  label: string
  groupLabel: string
  priority: number
  visibility: ProviderVisibility
}

type CreateCompatibleProviderFields = CreateProviderBaseInput & {
  baseUrl: string
  apiKey: string
}

export type CreateCompatibleProviderInput = CreateCompatibleProviderFields &
  (
    | {
        provider: 'openai_compatible'
        upstreamProtocol: OpenAiUpstreamProtocol
      }
    | {
        provider: Exclude<CompatibleProviderKind, 'openai_compatible'>
        upstreamProtocol?: never
      }
  )

export type ImportOAuthProviderInput = CreateProviderBaseInput & {
  provider: OAuthProviderKind
  credentialJson: Record<string, unknown>
}

export type StartProviderOAuthInput = CreateProviderBaseInput & {
  provider: OAuthProviderKind
}

export type UpdateProviderAccountInput = {
  groupLabel: string
  accountId: string
  label: string
  visibility: ProviderVisibility
  priority: number
  baseUrl?: string
  upstreamProtocol?: OpenAiUpstreamProtocol
  apiKey?: string
}

export type SetProviderEnabledInput = {
  accountId: string
  enabled: boolean
}

export type UpdateProviderModelInput = {
  accountId: string
  upstreamModel: string
  alias?: string
  enabled: boolean
  inputModalities: ProviderModelInputModality[] | null
  pricingChanged: boolean
  pricing: ProviderModelPricing | null
}
