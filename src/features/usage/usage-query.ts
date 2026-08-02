import { queryOptions } from '@tanstack/react-query'

import { getUsageOverview } from '@/features/usage/usage-api'
import type {
  UsageAttributionBasis,
  UsageWindowId,
} from '@/features/usage/usage-types'
import { currentUsageRange } from '@/features/usage/usage-window'

// The only basis this slice reads. Both are correct answers to different
// questions, and mixing them in one view would be wrong, so the choice is fixed
// until there is a control that makes the switch explicit.
const usageBasis: UsageAttributionBasis = 'user_final_attempt'

// Usage changes far less often than provider quota and every read is a database
// aggregate, so it is refreshed on demand rather than polled.
const usageStaleTime = 60_000

export const usageKeys = {
  overview: (window: UsageWindowId) => ['usage', 'overview', window] as const,
}

export function usageOverviewQueryOptions(window: UsageWindowId) {
  return queryOptions({
    queryKey: usageKeys.overview(window),
    queryFn: () => getUsageOverview(currentUsageRange(window), usageBasis),
    staleTime: usageStaleTime,
  })
}
