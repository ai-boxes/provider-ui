import {
  requestAuthenticatedData,
  requestAuthenticatedEmpty,
} from '@/features/auth/authenticated-request'
import {
  decodeApiKey,
  decodeCreatedApiKey,
  decodeApiKeys,
} from '@/features/api-keys/api-key-decoders'
import type {
  ApiKeySummary,
  CreateApiKeyInput,
  CreatedApiKey,
  UpdateApiKeyInput,
} from '@/features/api-keys/api-key-types'

const jsonHeaders = {
  'Content-Type': 'application/json',
}

export function getApiKeys(): Promise<ApiKeySummary[]> {
  return requestAuthenticatedData('/api/v1/keys', decodeApiKeys)
}

export function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
  return requestAuthenticatedData('/api/v1/keys', decodeCreatedApiKey, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      label: input.label,
      group_label: input.groupLabel,
      expires_at: input.expiresAt,
      quota_limit_usd: input.quotaLimitUsd,
    }),
  })
}

export function updateApiKey(input: UpdateApiKeyInput): Promise<ApiKeySummary> {
  return requestAuthenticatedData(apiKeyEndpoint(input.keyId), decodeApiKey, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(apiKeyPatchBody(input)),
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

function apiKeyPatchBody(input: UpdateApiKeyInput): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (input.label !== undefined) {
    body.label = input.label
  }
  if (input.groupLabel !== undefined) {
    body.group_label = input.groupLabel
  }
  if (input.enabled !== undefined) {
    body.enabled = input.enabled
  }
  if (input.expiresAt !== undefined) {
    body.expires_at = input.expiresAt
  }
  if (input.quotaLimitUsd !== undefined) {
    body.quota_limit_usd = input.quotaLimitUsd
  }

  return body
}
