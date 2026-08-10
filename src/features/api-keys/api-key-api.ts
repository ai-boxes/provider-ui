import {
  requestAuthenticatedData,
  requestAuthenticatedEmpty,
} from '@/features/auth/authenticated-request'
import {
  decodeApiKey,
  decodeApiKeyDetail,
  decodeCreatedApiKey,
  decodeApiKeys,
} from '@/features/api-keys/api-key-decoders'
import {
  apiKeyPatchBody,
  createApiKeyBody,
} from '@/features/api-keys/api-key-payload'
import type {
  ApiKeyDetail,
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

export function getApiKey(keyId: string): Promise<ApiKeyDetail> {
  return requestAuthenticatedData(apiKeyEndpoint(keyId), decodeApiKeyDetail)
}

export function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
  return requestAuthenticatedData('/api/v1/keys', decodeCreatedApiKey, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(createApiKeyBody(input)),
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
