import { queryOptions } from '@tanstack/react-query'

import {
  getUsageFilterOptions,
  getUsageOverview,
  getUsageRequestDetail,
  getUsageRequests,
} from '@/features/usage/usage-api'
import type { UsageRange } from '@/features/usage/usage-types'

// Usage changes far less often than provider quota and every read is a database
// aggregate, so a short stale window is enough for the dashboard.
const usageStaleTime = 60_000

export type UsageFilterState = {
  apiKeyId: string | null
  model: string | null
  groupLabel: string | null
}

export const usageKeys = {
  filters: (range: UsageRange) =>
    ['usage', 'filters', range.fromMs, range.toMs] as const,
  overview: (range: UsageRange) =>
    ['usage', 'overview', range.fromMs, range.toMs] as const,
  requests: (
    range: UsageRange,
    filters: UsageFilterState,
    cursor: string | null,
  ) =>
    [
      'usage',
      'requests',
      range.fromMs,
      range.toMs,
      filters.apiKeyId ?? 'all',
      filters.model ?? 'all',
      filters.groupLabel ?? 'all',
      cursor ?? 'start',
    ] as const,
  requestDetail: (requestId: string, range: UsageRange) =>
    [
      'usage',
      'request-detail',
      requestId,
      range.fromMs,
      range.toMs,
    ] as const,
}

export function usageRequestDetailQueryOptions(
  requestId: string,
  range: UsageRange,
) {
  return queryOptions({
    queryKey: usageKeys.requestDetail(requestId, range),
    queryFn: () => getUsageRequestDetail(requestId, range),
    staleTime: usageStaleTime,
  })
}

export function usageFilterOptionsQueryOptions(range: UsageRange) {
  return queryOptions({
    queryKey: usageKeys.filters(range),
    queryFn: () => getUsageFilterOptions(range),
    staleTime: usageStaleTime,
    retry: 1,
  })
}

export function usageOverviewQueryOptions(range: UsageRange) {
  return queryOptions({
    queryKey: usageKeys.overview(range),
    queryFn: () => getUsageOverview(range),
    staleTime: usageStaleTime,
  })
}

export function usageRequestsQueryOptions(
  range: UsageRange,
  filters: UsageFilterState,
  cursor: string | null = null,
) {
  return queryOptions({
    queryKey: usageKeys.requests(range, filters, cursor),
    queryFn: () =>
      getUsageRequests(range, {
        apiKeyId: filters.apiKeyId,
        model: filters.model,
        groupLabel: filters.groupLabel,
        cursor,
      }),
    staleTime: usageStaleTime,
  })
}
