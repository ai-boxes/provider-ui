export type ProviderGroupAccount = {
  groupLabel: string
  enabled: boolean
  authState: 'active' | 'reauth_required'
}

export type ProviderGroupCatalog = {
  values: string[]
  status: 'loading' | 'error' | 'ready'
  refreshing: boolean
  retry: () => void
}

export function availableProviderGroups(
  accounts: readonly ProviderGroupAccount[],
): string[] {
  return [
    ...new Set(
      accounts
        .filter((account) => account.enabled && account.authState === 'active')
        .map((account) => account.groupLabel),
    ),
  ].sort()
}
