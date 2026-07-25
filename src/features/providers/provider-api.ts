import {
  requestAuthenticatedData,
  requestAuthenticatedEmpty,
} from '@/features/auth/authenticated-request'
import {
  decodeCreatedProviderAccount,
  decodeProviderAccount,
  decodeProviderAccounts,
  decodeProviderModels,
  decodeProviderModelCatalogSnapshot,
  decodeProviderOAuthSession,
  decodeProviderQuota,
} from '@/features/providers/provider-decoders'
import type {
  CreateCompatibleProviderInput,
  CreatedProviderAccount,
  ImportOAuthProviderInput,
  ProviderAccount,
  ProviderAccountWithQuota,
  ProviderModel,
  ProviderModelCatalogSnapshot,
  ProviderOAuthSession,
  ProviderQuota,
  SetProviderEnabledInput,
  StartProviderOAuthInput,
  UpdateProviderAccountInput,
  UpdateProviderModelInput,
} from '@/features/providers/provider-types'

const jsonHeaders = {
  'Content-Type': 'application/json',
}

export function getProviderAccounts(): Promise<ProviderAccountWithQuota[]> {
  return requestAuthenticatedData(
    '/api/v1/providers',
    decodeProviderAccounts,
  )
}

export function getProviderAccount(accountId: string): Promise<ProviderAccount> {
  return requestAuthenticatedData(
    providerEndpoint(accountId),
    decodeProviderAccount,
  )
}

export function getProviderModels(accountId: string): Promise<ProviderModel[]> {
  return requestAuthenticatedData(
    `${providerEndpoint(accountId)}/models`,
    decodeProviderModels,
  )
}

export function getProviderQuota(accountId: string): Promise<ProviderQuota> {
  return requestAuthenticatedData(
    `${providerEndpoint(accountId)}/quota`,
    decodeProviderQuota,
  )
}

export function refreshProviderQuota(accountId: string): Promise<ProviderQuota> {
  return requestAuthenticatedData(
    `${providerEndpoint(accountId)}/quota/refresh`,
    decodeProviderQuota,
    { method: 'POST' },
  )
}

export function createCompatibleProvider(
  input: CreateCompatibleProviderInput,
): Promise<CreatedProviderAccount> {
  return requestAuthenticatedData(
    '/api/v1/providers',
    decodeCreatedProviderAccount,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        method: 'direct',
        provider: input.provider,
        label: input.label,
        base_url: input.baseUrl,
        api_key: input.apiKey || undefined,
        visibility: input.visibility,
      }),
    },
  )
}

export function importOAuthProvider(
  input: ImportOAuthProviderInput,
): Promise<CreatedProviderAccount> {
  return requestAuthenticatedData(
    '/api/v1/providers',
    decodeCreatedProviderAccount,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        method: 'credential_json',
        provider: input.provider,
        label: input.label,
        credential_json: input.credentialJson,
        visibility: input.visibility,
      }),
    },
  )
}

export function startProviderOAuth(
  input: StartProviderOAuthInput,
): Promise<ProviderOAuthSession> {
  return requestAuthenticatedData(
    '/api/v1/oauth/sessions',
    decodeProviderOAuthSession,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        provider: input.provider,
        label: input.label,
        visibility: input.visibility,
      }),
    },
  )
}

export function getProviderOAuthSession(
  sessionId: string,
): Promise<ProviderOAuthSession> {
  return requestAuthenticatedData(
    oauthSessionEndpoint(sessionId),
    decodeProviderOAuthSession,
  )
}

export function cancelProviderOAuthSession(
  sessionId: string,
): Promise<ProviderOAuthSession> {
  return requestAuthenticatedData(
    oauthSessionEndpoint(sessionId),
    decodeProviderOAuthSession,
    { method: 'DELETE' },
  )
}

export function updateProviderAccount(
  input: UpdateProviderAccountInput,
): Promise<ProviderAccount> {
  return requestAuthenticatedData(
    providerEndpoint(input.accountId),
    decodeProviderAccount,
    {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({
        label: input.label,
        visibility: input.visibility,
        base_url: input.baseUrl,
      }),
    },
  )
}

export function setProviderEnabled(
  input: SetProviderEnabledInput,
): Promise<ProviderAccount> {
  return requestAuthenticatedData(
    `${providerEndpoint(input.accountId)}/enabled`,
    decodeProviderAccount,
    {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: input.enabled }),
    },
  )
}

export function deleteProviderAccount(accountId: string): Promise<void> {
  return requestAuthenticatedEmpty(providerEndpoint(accountId), {
    method: 'DELETE',
  })
}

export function refreshProviderModels(
  accountId: string,
): Promise<ProviderModelCatalogSnapshot> {
  return requestAuthenticatedData(
    `${providerEndpoint(accountId)}/models/refresh`,
    decodeProviderModelCatalogSnapshot,
    { method: 'POST' },
  )
}

export function updateProviderModel(
  input: UpdateProviderModelInput,
): Promise<ProviderModel[]> {
  return requestAuthenticatedData(
    `${providerEndpoint(input.accountId)}/models`,
    decodeProviderModels,
    {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({
        upstream_model: input.upstreamModel,
        alias: input.alias,
        enabled: input.enabled,
      }),
    },
  )
}

function providerEndpoint(accountId: string): string {
  return `/api/v1/providers/${encodeURIComponent(accountId)}`
}

function oauthSessionEndpoint(sessionId: string): string {
  return `/api/v1/oauth/sessions/${encodeURIComponent(sessionId)}`
}
