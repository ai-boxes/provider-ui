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
import {
  usageQueryParams,
  type UsageQueryFilters,
} from '@/features/usage/usage-query-params'

export async function getUsageOverview(
  range: UsageRange,
): Promise<UsageOverview> {
  return requestAuthenticatedData(
    `/api/v1/usage/overview?${usageQueryParams(range).toString()}`,
    decodeUsageOverview,
  )
}

export async function getUsageFilterOptions(
  range: UsageRange,
): Promise<UsageFilterOptions> {
  return requestAuthenticatedData(
    `/api/v1/usage/filters?${usageQueryParams(range).toString()}`,
    decodeUsageFilterOptions,
  )
}

export async function getUsageRequests(
  range: UsageRange,
  filters?: UsageQueryFilters,
): Promise<UsageRequests> {
  return requestAuthenticatedData(
    `/api/v1/usage/requests?${usageQueryParams(range, filters).toString()}`,
    decodeUsageRequests,
  )
}

export async function getUsageRequestDetail(
  requestId: string,
  range: UsageRange,
): Promise<UsageRequestDetail> {
  return requestAuthenticatedData(
    `/api/v1/usage/requests/${encodeURIComponent(requestId)}?${usageQueryParams(range).toString()}`,
    decodeUsageRequestDetail,
  )
}
