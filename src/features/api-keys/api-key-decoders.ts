import type {
  ApiKeyDetail,
  ApiKeySummary,
  CreatedApiKey,
} from '@/features/api-keys/api-key-types'
import {
  optionalTimestamp,
  requireArray,
  requireBoolean,
  requireNonEmptyString,
  requireRecord,
  requireTimestamp,
} from '@/lib/api/decode'

export function decodeApiKeys(value: unknown): ApiKeySummary[] {
  return requireArray(value, 'API keys').map((key, index) =>
    decodeApiKeySummary(key, `API key ${index + 1}`),
  )
}

export function decodeApiKey(value: unknown): ApiKeySummary {
  return decodeApiKeySummary(value, 'API key')
}

export function decodeCreatedApiKey(value: unknown): CreatedApiKey {
  const record = requireRecord(value, 'created API key')
  const common = decodeCommonApiKey(record)

  return {
    ...common,
    key: requireNonEmptyString(record.key, 'created API key secret'),
  }
}

export function decodeApiKeyDetail(value: unknown): ApiKeyDetail {
  const record = requireRecord(value, 'API key detail')
  const common = decodeCommonApiKey(record)

  return {
    ...common,
    key: requireNonEmptyString(record.key, 'API key secret'),
  }
}

function decodeApiKeySummary(value: unknown, label: string): ApiKeySummary {
  const record = requireRecord(value, label)
  return {
    ...decodeCommonApiKey(record),
    maskedKey: requireNonEmptyString(record.key, 'masked API key'),
  }
}

function decodeCommonApiKey(record: Record<string, unknown>) {
  return {
    id: requireNonEmptyString(record.id, 'API key ID'),
    ownerUserId: requireNonEmptyString(record.owner_user_id, 'API key owner ID'),
    groupLabel: requireNonEmptyString(record.group_label, 'API key group label'),
    label: requireNonEmptyString(record.label, 'API key label'),
    enabled: requireBoolean(record.enabled, 'API key enabled state'),
    expiresAt: optionalTimestamp(record.expires_at, 'API key expiration'),
    quotaLimitUsd: optionalPositiveUsdAmount(
      record.quota_limit_usd,
      'API key quota limit',
    ),
    spentUsd: requireUsdAmount(record.spent_usd, 'API key spent amount', true),
    lastUsedAt: optionalTimestamp(record.last_used_at, 'API key last used time'),
    createdAt: requireTimestamp(record.created_at, 'API key creation time'),
    updatedAt: requireTimestamp(record.updated_at, 'API key update time'),
  }
}

function optionalPositiveUsdAmount(value: unknown, label: string): string | null {
  if (value == null) {
    return null
  }
  return requireUsdAmount(value, label)
}

function requireUsdAmount(
  value: unknown,
  label: string,
  allowZero = false,
): string {
  if (
    typeof value !== 'string' ||
    !/^\d+(\.\d+)?$/.test(value) ||
    (!allowZero && !/[1-9]/.test(value))
  ) {
    throw new TypeError(
      `${label} must be a ${allowZero ? 'non-negative' : 'positive'} decimal amount`,
    )
  }
  return value
}
