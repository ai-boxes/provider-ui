export type ProviderKind =
  | 'grok'
  | 'codex'
  | 'openai_compatible'
  | 'anthropic_compatible'

export type ProviderVisibility = 'private' | 'shared'

export type ProviderCredentialKind = 'oauth' | 'api_key' | 'none'

export type ProviderAuthState = 'active' | 'reauth_required'

export type ProviderModelCatalogSource =
  | 'remote'
  | 'cached'
  | 'built_in'
  | 'empty'

export type ProviderOAuthStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ProviderAccount = {
  id: string
  ownerUserId: string
  visibility: ProviderVisibility
  provider: ProviderKind
  label: string
  baseUrl: string | null
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
  lastObservedAt: number | null
  groups: ProviderQuotaGroup[]
  warnings: string[]
}

export type ProviderQuota = {
  support: ProviderQuotaSupport
  freshness: ProviderQuotaFreshness | null
  snapshot: ProviderQuotaSnapshot | null
  lastError: ProviderQuotaErrorKind | null
}

export type ProviderAccountWithQuota = ProviderAccount & {
  quota: ProviderQuota
}

export type ProviderModel = {
  accountId: string
  upstreamModel: string
  alias: string | null
  effectiveModel: string
  enabled: boolean
  available: boolean
  routable: boolean
  metadata: Record<string, unknown> | null
  lastSeenAt: number | null
  createdAt: number
  updatedAt: number
}

export type ProviderModelCatalogSnapshot = {
  source: ProviderModelCatalogSource
  models: ProviderModel[]
  warning: string | null
}

export type CreatedProviderAccount = {
  account: ProviderAccount
  models: ProviderModelCatalogSnapshot
}

export type OAuthProviderKind = Extract<ProviderKind, 'grok' | 'codex'>

export type CompatibleProviderKind = Exclude<ProviderKind, OAuthProviderKind>

export type ProviderOAuthSession = {
  id: string
  ownerUserId: string
  visibility: ProviderVisibility
  provider: OAuthProviderKind
  accountId: string
  label: string
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
  visibility: ProviderVisibility
}

export type CreateCompatibleProviderInput = CreateProviderBaseInput & {
  provider: CompatibleProviderKind
  baseUrl: string
  apiKey?: string
}

export type ImportOAuthProviderInput = CreateProviderBaseInput & {
  provider: OAuthProviderKind
  credentialJson: Record<string, unknown>
}

export type StartProviderOAuthInput = CreateProviderBaseInput & {
  provider: OAuthProviderKind
}

export type UpdateProviderAccountInput = {
  accountId: string
  label: string
  visibility: ProviderVisibility
  baseUrl?: string
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
}
