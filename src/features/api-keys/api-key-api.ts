import {
  requestAuthenticatedData,
  requestAuthenticatedEmpty,
} from '@/features/auth/authenticated-request'
import {
  decodeApiKey,
  decodeApiKeyDetail,
  decodeApiKeys,
  decodeGeneratedApiKey,
} from '@/features/api-keys/api-key-decoders'
import type {
  ApiKeyDetail,
  ApiKeySummary,
  CreateApiKeyInput,
  UpdateApiKeyInput,
} from '@/features/api-keys/api-key-types'

const jsonHeaders = {
  'Content-Type': 'application/json',
}

export function getApiKeys(): Promise<ApiKeySummary[]> {
  return requestAuthenticatedData('/api/v1/keys', decodeApiKeys)
}

export function getApiKey(keyId: string): Promise<ApiKeyDetail> {
  return requestAuthenticatedData(apiKeyEndpoint(keyId), decodeApiKeyDetail)
}

export function generateApiKey(): Promise<string> {
  return requestAuthenticatedData(
    '/api/v1/keys/generate',
    decodeGeneratedApiKey,
    { method: 'POST' },
  )
}

export function createApiKey(input: CreateApiKeyInput): Promise<ApiKeyDetail> {
  return requestAuthenticatedData('/api/v1/keys', decodeApiKeyDetail, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      label: input.label,
      group_label: input.groupLabel,
      key: input.key,
      expires_at: input.expiresAt,
      quota_limit_usd: input.quotaLimitUsd,
    }),
  })
}

export function updateApiKey(input: UpdateApiKeyInput): Promise<ApiKeySummary> {
  return requestAuthenticatedData(apiKeyEndpoint(input.keyId), decodeApiKey, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({
      label: input.label,
      group_label: input.groupLabel,
      enabled: input.enabled,
      expires_at: input.expiresAt,
      quota_limit_usd: input.quotaLimitUsd,
    }),
  })
}

export function deleteApiKey(keyId: string): Promise<void> {
  return requestAuthenticatedEmpty(apiKeyEndpoint(keyId), {
    method: 'DELETE',
  })
}

function apiKeyEndpoint(keyId: string): string {
  return `/api/v1/keys/${encodeURIComponent(keyId)}`
}
