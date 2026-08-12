import type { ProviderQuota } from './provider-types.ts'

export function shouldAutoFetchProviderQuota(quota: ProviderQuota) {
  return quota.support === 'supported' && quota.snapshot === null
}
