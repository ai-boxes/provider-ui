import { queryOptions } from '@tanstack/react-query'

import {
  getDashboardOverview,
  getDashboardProviders,
} from '@/features/dashboard/dashboard-api'
import type { DashboardRange } from '@/features/dashboard/dashboard-types'

const dashboardStaleTime = 30_000

export const dashboardKeys = {
  overview: (range: DashboardRange, group: string | null) =>
    [
      'dashboard',
      'overview',
      range.fromMs,
      range.toMs,
      group ?? 'all',
    ] as const,
  providers: (range: DashboardRange, group: string | null) =>
    [
      'dashboard',
      'providers',
      range.fromMs,
      range.toMs,
      group ?? 'all',
    ] as const,
}

export function dashboardOverviewQueryOptions(
  range: DashboardRange,
  group: string | null,
) {
  return queryOptions({
    queryKey: dashboardKeys.overview(range, group),
    queryFn: () => getDashboardOverview(range, group),
    staleTime: dashboardStaleTime,
  })
}

export function dashboardProvidersQueryOptions(
  range: DashboardRange,
  group: string | null,
) {
  return queryOptions({
    queryKey: dashboardKeys.providers(range, group),
    queryFn: () => getDashboardProviders(range, group),
    staleTime: dashboardStaleTime,
  })
}
