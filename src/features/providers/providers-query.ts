import { queryOptions } from '@tanstack/react-query'

import {
  getProviderAccount,
  getProviderAccounts,
  getProviderHealth,
  getProviderModels,
  getProviderOAuthSession,
  getProviderQuota,
} from '@/features/providers/provider-api'

export const providerKeys = {
  all: ['providers'] as const,
  detail: (accountId: string) => ['providers', accountId] as const,
  models: (accountId: string) =>
    ['providers', accountId, 'models'] as const,
  quota: (accountId: string) => ['providers', accountId, 'quota'] as const,
  health: () => ['providers', 'health'] as const,
  oauthSession: (sessionId: string) =>
    ['provider-oauth-session', sessionId] as const,
}

export const providersQueryOptions = queryOptions({
  queryKey: providerKeys.all,
  queryFn: getProviderAccounts,
})

export function providerQueryOptions(accountId: string) {
  return queryOptions({
    queryKey: providerKeys.detail(accountId),
    queryFn: () => getProviderAccount(accountId),
  })
}

export function providerModelsQueryOptions(accountId: string) {
  return queryOptions({
    queryKey: providerKeys.models(accountId),
    queryFn: () => getProviderModels(accountId),
  })
}

export function providerQuotaQueryOptions(accountId: string) {
  return queryOptions({
    queryKey: providerKeys.quota(accountId),
    queryFn: () => getProviderQuota(accountId),
    // Mirrors the backend 30s quota freshness window, so the list and the
    // detail page share one upstream fetch within that window.
    staleTime: 30_000,
  })
}

export function providerHealthQueryOptions() {
  return queryOptions({
    queryKey: providerKeys.health(),
    queryFn: getProviderHealth,
    staleTime: 30_000,
  })
}

export function providerOAuthSessionQueryOptions(sessionId: string) {
  return queryOptions({
    queryKey: providerKeys.oauthSession(sessionId),
    queryFn: () => getProviderOAuthSession(sessionId),
  })
}
