import type {
  ApiKeyDetail,
  ApiKeySummary,
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

export function decodeGeneratedApiKey(value: unknown): string {
  const record = requireRecord(value, 'generated API key')
  return requireNonEmptyString(record.key, 'generated API key secret')
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
  const common = decodeCommonApiKey(record)

  return {
    ...common,
    maskedKey: requireNonEmptyString(record.key, 'masked API key'),
  }
}

function decodeCommonApiKey(record: Record<string, unknown>) {
  return {
    id: requireNonEmptyString(record.id, 'API key ID'),
    ownerUserId: requireNonEmptyString(record.owner_user_id, 'API key owner ID'),
    label: requireNonEmptyString(record.label, 'API key label'),
    enabled: requireBoolean(record.enabled, 'API key enabled state'),
    expiresAt: optionalTimestamp(record.expires_at, 'API key expiration'),
    lastUsedAt: optionalTimestamp(record.last_used_at, 'API key last used time'),
    createdAt: requireTimestamp(record.created_at, 'API key creation time'),
    updatedAt: requireTimestamp(record.updated_at, 'API key update time'),
  }
}

