import { queryOptions } from '@tanstack/react-query'

import {
  getProviderAccount,
  getProviderAccounts,
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
  })
}

export function providerOAuthSessionQueryOptions(sessionId: string) {
  return queryOptions({
    queryKey: providerKeys.oauthSession(sessionId),
    queryFn: () => getProviderOAuthSession(sessionId),
  })
}
