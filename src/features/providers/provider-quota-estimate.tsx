import { matchingPrimaryEstimate } from '@/features/providers/provider-quota-metrics'
import { quotaEstimatePeriodLabel } from '@/features/providers/provider-quota-format'
import type { ProviderQuota } from '@/features/providers/provider-types'
import { formatUsageCost } from '@/features/usage/usage-format'

export function ProviderQuotaEstimate({ quota }: { quota: ProviderQuota }) {
  const estimate = matchingPrimaryEstimate(quota)
  if (!estimate) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <div className="grid gap-0.5 tabular-nums">
      <span className="text-sm font-medium">
        {estimate.costCompleteness === 'lower_bound' ? '≥' : '≈'}
        {formatUsageCost(estimate.estimatedLimitCostUsd)}
      </span>
      <span className="text-xs text-muted-foreground">
        {estimate.observedUsedPercent >= 100 ? 'Current' : 'Previous'}{' '}
        {quotaEstimatePeriodLabel(estimate.periodKind, estimate.durationSeconds)}
        {estimate.observedUsedPercent >= 100 ? ' · fully used' : ''}
      </span>
    </div>
  )
}
