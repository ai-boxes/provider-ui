import { requestAuthenticatedData } from '@/features/auth/authenticated-request'
import {
  decodeUsageFilterOptions,
  decodeUsageOverview,
  decodeUsageRequestDetail,
  decodeUsageRequests,
} from '@/features/usage/usage-decoders'
import type {
  UsageFilterOptions,
  UsageOverview,
  UsageRequestDetail,
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
  extra?: Record<string, string>,
  filters?: UsageQueryFilters,
): URLSearchParams {
  const params = new URLSearchParams({
    from_ms: String(range.fromMs),
    to_ms: String(range.toMs),
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
): Promise<UsageOverview> {
  return requestAuthenticatedData(
    `/api/v1/usage/overview?${rangeParams(range).toString()}`,
    decodeUsageOverview,
  )
}

export async function getUsageFilterOptions(
  range: UsageRange,
): Promise<UsageFilterOptions> {
  return requestAuthenticatedData(
    `/api/v1/usage/filters?${rangeParams(range).toString()}`,
    decodeUsageFilterOptions,
  )
}

export async function getUsageRequests(
  range: UsageRange,
  filters?: UsageQueryFilters,
): Promise<UsageRequests> {
  return requestAuthenticatedData(
    `/api/v1/usage/requests?${rangeParams(range, undefined, filters).toString()}`,
    decodeUsageRequests,
  )
}

export async function getUsageRequestDetail(
  requestId: string,
  range: UsageRange,
): Promise<UsageRequestDetail> {
  return requestAuthenticatedData(
    `/api/v1/usage/requests/${encodeURIComponent(requestId)}?${rangeParams(range).toString()}`,
    decodeUsageRequestDetail,
  )
}
