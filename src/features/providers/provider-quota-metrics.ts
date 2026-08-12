import type {
  ProviderQuota,
  ProviderQuotaGroup,
  ProviderQuotaMetric,
} from '@/features/providers/provider-types'

const percentFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
})

export function findPrimaryUsage(
  quota: ProviderQuota,
): { group: ProviderQuotaGroup; metric: ProviderQuotaMetric } | null {
  const group = quota.snapshot?.groups.find(
    (candidate) => candidate.scope === 'aggregate',
  )
  const metric = group?.metrics.find(
    (candidate) => candidate.kind === 'usage' && candidate.unit === 'percent',
  )

  return group && metric ? { group, metric } : null
}

export function percentageUsed(metric: ProviderQuotaMetric): number | null {
  if (metric.unit !== 'percent') {
    return null
  }

  if (metric.used !== null) {
    return metric.used
  }

  if (metric.limit !== null && metric.remaining !== null) {
    return Math.max(0, metric.limit - metric.remaining)
  }

  return null
}

export function percentageRemaining(metric: ProviderQuotaMetric): number | null {
  if (metric.unit !== 'percent') {
    return null
  }

  if (metric.remaining !== null) {
    return metric.remaining
  }

  if (metric.limit !== null && metric.used !== null) {
    return Math.max(0, metric.limit - metric.used)
  }

  return null
}

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`
}

export function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value))
}
