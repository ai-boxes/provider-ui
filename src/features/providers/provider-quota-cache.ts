import type { QueryClient } from '@tanstack/react-query'

import { providerKeys } from '@/features/providers/providers-query'
import type {
  ProviderAccountWithQuota,
  ProviderQuota,
} from '@/features/providers/provider-types'

export function syncQuotaCache(
  queryClient: QueryClient,
  accountId: string,
  quota: ProviderQuota,
) {
  queryClient.setQueryData(providerKeys.quota(accountId), quota)
  syncProviderListQuota(queryClient, accountId, quota)
}

export function syncProviderListQuota(
  queryClient: QueryClient,
  accountId: string,
  quota: ProviderQuota,
) {
  queryClient.setQueryData<ProviderAccountWithQuota[]>(
    providerKeys.all,
    (accounts) =>
      accounts?.map((account) =>
        account.id === accountId ? { ...account, quota } : account,
      ),
  )
}
