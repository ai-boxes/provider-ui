import { requestAuthenticatedData } from '@/features/auth/authenticated-request'
import {
  decodeDashboardOverview,
  decodeDashboardProviders,
} from '@/features/dashboard/dashboard-decoders'
import type {
  DashboardRange,
  DashboardOverview,
  DashboardProviders,
} from '@/features/dashboard/dashboard-types'

export function getDashboardOverview(
  range: DashboardRange,
  group: string | null,
): Promise<DashboardOverview> {
  return requestAuthenticatedData(
    dashboardEndpoint('/api/v1/ops/overview', range, group),
    decodeDashboardOverview,
  )
}

export function getDashboardProviders(
  range: DashboardRange,
  group: string | null,
): Promise<DashboardProviders> {
  return requestAuthenticatedData(
    dashboardEndpoint('/api/v1/ops/providers', range, group),
    decodeDashboardProviders,
  )
}

function dashboardEndpoint(
  path: string,
  range: DashboardRange,
  group: string | null,
): string {
  const params = new URLSearchParams({
    from_ms: String(range.fromMs),
    to_ms: String(range.toMs),
  })
  if (group) {
    params.set('group', group)
  }
  return `${path}?${params.toString()}`
}
