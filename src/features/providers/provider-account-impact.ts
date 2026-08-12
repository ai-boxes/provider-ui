import type { ProviderAccount } from '@/features/providers/provider-types'

export function providerGroupImpact(
  account: ProviderAccount,
  providers: ProviderAccount[] | undefined,
  apiKeys: Array<{ groupLabel: string }> | undefined,
  pending: boolean,
  failed: boolean,
) {
  return {
    ready: !pending && !failed,
    pending,
    failed,
    apiKeyCount:
      apiKeys?.filter((key) => key.groupLabel === account.groupLabel).length ?? 0,
    alternativeEnabledProviders:
      providers?.filter(
        (provider) =>
          provider.id !== account.id &&
          provider.enabled &&
          provider.groupLabel === account.groupLabel,
      ).length ?? 0,
  }
}
