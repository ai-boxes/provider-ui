import { isOAuthProvider } from '@/features/providers/provider-format'
import type {
  CreatedProviderAccount,
  ProviderAccount,
  ProviderAccountWithQuota,
  ProviderAuthState,
  ProviderCredentialKind,
  ProviderKind,
  ProviderModel,
  ProviderModelCatalogSnapshot,
  ProviderModelCatalogSource,
  ProviderOAuthSession,
  ProviderOAuthStatus,
  ProviderQuota,
  ProviderQuotaErrorKind,
  ProviderQuotaFreshness,
  ProviderQuotaGroupScope,
  ProviderQuotaMetricKind,
  ProviderQuotaPeriodKind,
  ProviderQuotaSupport,
  ProviderQuotaUnit,
  ProviderVisibility,
} from '@/features/providers/provider-types'

const providerKinds = [
  'grok',
  'codex',
  'openai_compatible',
  'anthropic_compatible',
] as const satisfies readonly ProviderKind[]

const oauthProviderKinds = [
  'grok',
  'codex',
] as const satisfies readonly Extract<ProviderKind, 'grok' | 'codex'>[]

const providerVisibilities = [
  'private',
  'shared',
] as const satisfies readonly ProviderVisibility[]

const providerCredentialKinds = [
  'oauth',
  'api_key',
  'none',
] as const satisfies readonly ProviderCredentialKind[]

const providerAuthStates = [
  'active',
  'reauth_required',
] as const satisfies readonly ProviderAuthState[]

const providerModelCatalogSources = [
  'remote',
  'cached',
  'built_in',
  'empty',
] as const satisfies readonly ProviderModelCatalogSource[]

const providerOAuthStatuses = [
  'pending',
  'completed',
  'failed',
  'cancelled',
] as const satisfies readonly ProviderOAuthStatus[]

const providerQuotaSupports = [
  'supported',
  'unsupported',
] as const satisfies readonly ProviderQuotaSupport[]

const providerQuotaFreshnesses = [
  'fresh',
  'stale',
] as const satisfies readonly ProviderQuotaFreshness[]

const providerQuotaErrorKinds = [
  'unsupported',
  'authentication',
  'rate_limited',
  'upstream',
  'invalid_response',
  'internal',
] as const satisfies readonly ProviderQuotaErrorKind[]

const providerQuotaGroupScopes = [
  'aggregate',
  'product',
  'billing',
] as const satisfies readonly ProviderQuotaGroupScope[]

const providerQuotaMetricKinds = [
  'usage',
  'balance',
] as const satisfies readonly ProviderQuotaMetricKind[]

const providerQuotaUnits = [
  'percent',
  'usd_cents',
  'count',
  'credits',
] as const satisfies readonly ProviderQuotaUnit[]

const providerQuotaPeriodKinds = [
  'weekly',
  'monthly',
  'rolling',
  'unknown',
] as const satisfies readonly ProviderQuotaPeriodKind[]

export function decodeProviderAccounts(
  value: unknown,
): ProviderAccountWithQuota[] {
  if (!Array.isArray(value)) {
    throw new TypeError('provider accounts must be an array')
  }

  return value.map((account, index) => {
    const label = `provider account ${index + 1}`
    const record = requireRecord(account, label)

    return {
      ...decodeProviderAccountRecord(record),
      quota: decodeProviderQuota(record.quota),
    }
  })
}

export function decodeProviderAccount(value: unknown): ProviderAccount {
  return decodeProviderAccountValue(value, 'provider account')
}

export function decodeProviderModels(value: unknown): ProviderModel[] {
  if (!Array.isArray(value)) {
    throw new TypeError('provider models must be an array')
  }

  return value.map((model, index) =>
    decodeProviderModel(model, `provider model ${index + 1}`),
  )
}

export function decodeCreatedProviderAccount(
  value: unknown,
): CreatedProviderAccount {
  const record = requireRecord(value, 'created provider account')

  return {
    account: decodeProviderAccountValue(record.account, 'provider account'),
    models: decodeProviderModelCatalogSnapshot(record.models),
  }
}

export function decodeProviderOAuthSession(
  value: unknown,
): ProviderOAuthSession {
  const record = requireRecord(value, 'provider OAuth session')
  const challenge = requireRecord(record.challenge, 'provider OAuth challenge')

  return {
    id: requireNonEmptyString(record.id, 'OAuth session ID'),
    ownerUserId: requireNonEmptyString(
      record.owner_user_id,
      'OAuth session owner user ID',
    ),
    visibility: requireEnum(
      record.visibility,
      providerVisibilities,
      'OAuth session visibility',
    ),
    provider: requireEnum(
      record.provider,
      oauthProviderKinds,
      'OAuth session provider type',
    ),
    accountId: requireNonEmptyString(
      record.account_id,
      'OAuth provider account ID',
    ),
    label: requireNonEmptyString(record.label, 'OAuth provider label'),
    status: requireEnum(
      record.status,
      providerOAuthStatuses,
      'OAuth session status',
    ),
    challenge: {
      verificationUri: requireNonEmptyString(
        challenge.verification_uri,
        'OAuth verification URI',
      ),
      verificationUriComplete: optionalString(
        challenge.verification_uri_complete,
        'OAuth complete verification URI',
      ),
      userCode: requireNonEmptyString(
        challenge.user_code,
        'OAuth user code',
      ),
      expiresAt: requireTimestamp(
        challenge.expires_at,
        'OAuth challenge expiration',
      ),
      intervalSeconds: requirePositiveInteger(
        challenge.interval_seconds,
        'OAuth polling interval',
      ),
    },
    error: optionalString(record.error, 'OAuth session error'),
  }
}

function decodeProviderAccountValue(
  value: unknown,
  label: string,
): ProviderAccount {
  return decodeProviderAccountRecord(requireRecord(value, label))
}

function decodeProviderAccountRecord(
  record: Record<string, unknown>,
): ProviderAccount {
  const provider = requireEnum(record.provider, providerKinds, 'provider type')

  return {
    id: requireNonEmptyString(record.id, 'provider account ID'),
    ownerUserId: requireNonEmptyString(
      record.owner_user_id,
      'provider owner user ID',
    ),
    visibility: requireEnum(
      record.visibility,
      providerVisibilities,
      'provider visibility',
    ),
    provider,
    label: requireNonEmptyString(record.label, 'provider label'),
    baseUrl: decodeBaseUrl(record.config, provider),
    credentialKind: requireEnum(
      record.credential_kind,
      providerCredentialKinds,
      'provider credential kind',
    ),
    enabled: requireBoolean(record.enabled, 'provider enabled state'),
    authState: requireEnum(
      record.auth_state,
      providerAuthStates,
      'provider authentication state',
    ),
    safeErrorCode: optionalString(record.safe_error_code, 'provider error code'),
    createdAt: requireTimestamp(record.created_at, 'provider creation time'),
    updatedAt: requireTimestamp(record.updated_at, 'provider update time'),
  }
}

function decodeProviderModel(value: unknown, label: string): ProviderModel {
  const record = requireRecord(value, label)

  return {
    accountId: requireNonEmptyString(record.account_id, 'model account ID'),
    upstreamModel: requireNonEmptyString(
      record.upstream_model,
      'upstream model',
    ),
    alias: optionalString(record.alias, 'model alias'),
    effectiveModel: requireNonEmptyString(
      record.effective_model,
      'effective model',
    ),
    enabled: requireBoolean(record.enabled, 'model enabled state'),
    available: requireBoolean(record.available, 'model availability'),
    routable: requireBoolean(record.routable, 'model routable state'),
    metadata: optionalRecord(record.metadata, 'model metadata'),
    lastSeenAt: optionalTimestamp(record.last_seen_at, 'model last seen time'),
    createdAt: requireTimestamp(record.created_at, 'model creation time'),
    updatedAt: requireTimestamp(record.updated_at, 'model update time'),
  }
}

export function decodeProviderQuota(value: unknown): ProviderQuota {
  const record = requireRecord(value, 'provider quota')

  return {
    support: requireEnum(
      record.support,
      providerQuotaSupports,
      'quota support',
    ),
    freshness: optionalEnum(
      record.freshness,
      providerQuotaFreshnesses,
      'quota freshness',
    ),
    snapshot:
      record.snapshot == null
        ? null
        : decodeProviderQuotaSnapshot(record.snapshot),
    lastError: optionalEnum(
      record.last_error,
      providerQuotaErrorKinds,
      'quota error kind',
    ),
  }
}

function decodeProviderQuotaSnapshot(value: unknown) {
  const record = requireRecord(value, 'provider quota snapshot')

  return {
    accountId: requireNonEmptyString(record.account_id, 'quota account ID'),
    provider: requireEnum(record.provider, providerKinds, 'quota provider type'),
    fetchedAt: requireTimestamp(record.fetched_at, 'quota fetch time'),
    lastObservedAt: optionalTimestamp(
      record.last_observed_at,
      'quota observation time',
    ),
    groups: requireArray(record.groups, 'quota groups').map((group, index) =>
      decodeProviderQuotaGroup(group, `quota group ${index + 1}`),
    ),
    warnings: optionalArray(record.warnings, 'quota warnings').map(
      (warning, index) =>
        requireNonEmptyString(warning, `quota warning ${index + 1}`),
    ),
  }
}

function decodeProviderQuotaGroup(value: unknown, label: string) {
  const record = requireRecord(value, label)

  return {
    key: requireNonEmptyString(record.key, 'quota group key'),
    scope: requireEnum(
      record.scope,
      providerQuotaGroupScopes,
      'quota group scope',
    ),
    attributes: decodeQuotaAttributes(record.attributes),
    metrics: requireArray(record.metrics, 'quota metrics').map((metric, index) =>
      decodeProviderQuotaMetric(metric, `quota metric ${index + 1}`),
    ),
  }
}

function decodeProviderQuotaMetric(value: unknown, label: string) {
  const record = requireRecord(value, label)

  return {
    key: requireNonEmptyString(record.key, 'quota metric key'),
    kind: requireEnum(
      record.kind,
      providerQuotaMetricKinds,
      'quota metric kind',
    ),
    unit: requireEnum(record.unit, providerQuotaUnits, 'quota metric unit'),
    used: optionalQuotaAmount(record.used, 'quota used amount'),
    remaining: optionalQuotaAmount(record.remaining, 'quota remaining amount'),
    limit: optionalQuotaAmount(record.limit, 'quota limit amount'),
    period:
      record.period == null
        ? null
        : decodeProviderQuotaPeriod(record.period),
    breakdown: optionalArray(record.breakdown, 'quota breakdown').map(
      (item, index) =>
        decodeProviderQuotaBreakdown(item, `quota breakdown ${index + 1}`),
    ),
  }
}

function decodeProviderQuotaPeriod(value: unknown) {
  const record = requireRecord(value, 'quota period')

  return {
    kind: requireEnum(
      record.kind,
      providerQuotaPeriodKinds,
      'quota period kind',
    ),
    startsAt: optionalTimestamp(record.starts_at, 'quota period start'),
    endsAt: optionalTimestamp(record.ends_at, 'quota period end'),
    durationSeconds: optionalDurationSeconds(
      record.duration_seconds,
      'quota period duration',
    ),
  }
}

function decodeProviderQuotaBreakdown(value: unknown, label: string) {
  const record = requireRecord(value, label)

  return {
    key: requireNonEmptyString(record.key, 'quota breakdown key'),
    label: requireNonEmptyString(record.label, 'quota breakdown label'),
    used: requireQuotaAmount(record.used, 'quota breakdown used amount'),
  }
}

export function decodeProviderModelCatalogSnapshot(
  value: unknown,
): ProviderModelCatalogSnapshot {
  const record = requireRecord(value, 'provider model catalog')

  return {
    source: requireEnum(
      record.source,
      providerModelCatalogSources,
      'provider model catalog source',
    ),
    models: decodeProviderModels(record.models),
    warning: optionalString(record.warning, 'provider model catalog warning'),
  }
}

function decodeBaseUrl(value: unknown, provider: ProviderKind): string | null {
  const config = requireRecord(value, 'provider config')

  if (isOAuthProvider(provider)) {
    return null
  }

  return requireNonEmptyString(config.base_url, 'provider base URL')
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }

  return value as Record<string, unknown>
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new TypeError(`${label} is unsupported`)
  }

  return value as T
}

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T | null {
  if (value == null) {
    return null
  }

  return requireEnum(value, allowed, label)
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`)
  }

  return value
}

function optionalArray(value: unknown, label: string): unknown[] {
  if (value == null) {
    return []
  }

  return requireArray(value, label)
}

// Amounts arrive as a number or as a decimal string; both are normalized here
// so the rest of the app only deals with numbers.
function requireQuotaAmount(value: unknown, label: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  throw new TypeError(`${label} must be a finite numeric amount`)
}

function optionalQuotaAmount(value: unknown, label: string): number | null {
  if (value == null) {
    return null
  }

  return requireQuotaAmount(value, label)
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`)
  }

  return value
}

function optionalString(value: unknown, label: string): string | null {
  if (value === null) {
    return null
  }

  return requireNonEmptyString(value, label)
}

function optionalRecord(
  value: unknown,
  label: string,
): Record<string, unknown> | null {
  if (value === null) {
    return null
  }

  return requireRecord(value, label)
}

function decodeQuotaAttributes(
  value: unknown,
): Record<string, string | number | boolean> {
  if (value == null) {
    return {}
  }

  const record = requireRecord(value, 'quota attributes')
  const attributes: Record<string, string | number | boolean> = {}

  for (const [key, attribute] of Object.entries(record)) {
    if (
      typeof attribute !== 'string' &&
      typeof attribute !== 'boolean' &&
      !(typeof attribute === 'number' && Number.isSafeInteger(attribute))
    ) {
      throw new TypeError(`quota attribute ${key} has an unsupported value`)
    }

    attributes[key] = attribute
  }

  return attributes
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${label} must be a boolean`)
  }

  return value
}

function requireTimestamp(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${label} must be a positive integer timestamp`)
  }

  return value as number
}

function optionalTimestamp(value: unknown, label: string): number | null {
  if (value == null) {
    return null
  }

  return requireTimestamp(value, label)
}

function requirePositiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${label} must be a positive integer`)
  }

  return value as number
}

// Upstream reports the window length verbatim, so a zero-length window is
// possible. It carries no more information than an absent duration.
function optionalDurationSeconds(value: unknown, label: string): number | null {
  if (value == null) {
    return null
  }

  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${label} must be a non-negative integer`)
  }

  return (value as number) > 0 ? (value as number) : null
}
