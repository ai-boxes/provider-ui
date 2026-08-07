import { requestAuthenticatedData } from '@/features/auth/authenticated-request'
import {
  decodeUsageFilterOptions,
  decodeUsageOverview,
  decodeUsageRequests,
} from '@/features/usage/usage-decoders'
import type {
  UsageAttributionBasis,
  UsageFilterOptions,
  UsageOverview,
  UsageRange,
  UsageRequests,
} from '@/features/usage/usage-types'

export type UsageQueryFilters = {
  apiKeyId?: string | null
  model?: string | null
  groupLabel?: string | null
  cursor?: string | null
}

function rangeParams(
  range: UsageRange,
  basis: UsageAttributionBasis,
  extra?: Record<string, string>,
  filters?: UsageQueryFilters,
): URLSearchParams {
  const params = new URLSearchParams({
    from_ms: String(range.fromMs),
    to_ms: String(range.toMs),
    basis,
    ...extra,
  })
  if (filters?.apiKeyId) {
    params.set('api_key_id', filters.apiKeyId)
  }
  if (filters?.model) {
    params.set('model', filters.model)
  }
  if (filters?.groupLabel) {
    params.set('group', filters.groupLabel)
  }
  if (filters?.cursor) {
    params.set('cursor', filters.cursor)
  }
  return params
}

export async function getUsageOverview(
  range: UsageRange,
  basis: UsageAttributionBasis,
): Promise<UsageOverview> {
  const overview = await requestAuthenticatedData(
    `/api/v1/usage/overview?${rangeParams(range, basis).toString()}`,
    decodeUsageOverview,
  )

  // The two attribution bases are both correct and give different totals, so a
  // response counting something other than what was asked for would silently
  // redefine every number on the page. The UI does not name the basis, which
  // makes this the only place the mismatch could be caught.
  if (overview.attributionBasis !== basis) {
    throw new TypeError('usage overview used a different attribution basis')
  }

  return overview
}

export async function getUsageFilterOptions(
  range: UsageRange,
  basis: UsageAttributionBasis,
): Promise<UsageFilterOptions> {
  return requestAuthenticatedData(
    `/api/v1/usage/filters?${rangeParams(range, basis).toString()}`,
    decodeUsageFilterOptions,
  )
}

export async function getUsageRequests(
  range: UsageRange,
  basis: UsageAttributionBasis,
  filters?: UsageQueryFilters,
): Promise<UsageRequests> {
  const requests = await requestAuthenticatedData(
    `/api/v1/usage/requests?${rangeParams(range, basis, undefined, filters).toString()}`,
    decodeUsageRequests,
  )
  if (requests.attributionBasis !== basis) {
    throw new TypeError('usage requests used a different attribution basis')
  }
  return requests
}
