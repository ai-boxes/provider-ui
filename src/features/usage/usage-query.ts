import { queryOptions } from '@tanstack/react-query'

import {
  getUsageFilterOptions,
  getUsageOverview,
  getUsageRequests,
} from '@/features/usage/usage-api'
import type {
  UsageAttributionBasis,
  UsageWindowId,
} from '@/features/usage/usage-types'
import { currentUsageRange } from '@/features/usage/usage-window'

const usageBasis: UsageAttributionBasis = 'user_final_attempt'

// Usage changes far less often than provider quota and every read is a database
// aggregate, so a short stale window is enough for the dashboard.
const usageStaleTime = 60_000

export type UsageFilterState = {
  apiKeyId: string | null
  model: string | null
  groupLabel: string | null
}

export const usageKeys = {
  overview: (window: UsageWindowId) => ['usage', 'overview', window] as const,
  requests: (
    window: UsageWindowId,
    filters: UsageFilterState,
    cursor: string | null,
  ) =>
    [
      'usage',
      'requests',
      window,
      filters.apiKeyId ?? 'all',
      filters.model ?? 'all',
      filters.groupLabel ?? 'all',
      cursor ?? 'start',
    ] as const,
}

export function usageFilterOptionsQueryOptions(window: UsageWindowId) {
  return queryOptions({
    queryKey: ['usage', 'filters', window] as const,
    queryFn: () => getUsageFilterOptions(currentUsageRange(window), usageBasis),
    staleTime: usageStaleTime,
  })
}

export function usageOverviewQueryOptions(window: UsageWindowId) {
  return queryOptions({
    queryKey: usageKeys.overview(window),
    queryFn: () => getUsageOverview(currentUsageRange(window), usageBasis),
    staleTime: usageStaleTime,
  })
}

export function usageRequestsQueryOptions(
  window: UsageWindowId,
  filters: UsageFilterState,
  cursor: string | null = null,
) {
  return queryOptions({
    queryKey: usageKeys.requests(window, filters, cursor),
    queryFn: () =>
      getUsageRequests(currentUsageRange(window), usageBasis, {
        apiKeyId: filters.apiKeyId,
        model: filters.model,
        groupLabel: filters.groupLabel,
        cursor,
      }),
    staleTime: usageStaleTime,
  })
}
