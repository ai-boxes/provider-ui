import type {
  ProviderQuotaErrorKind,
  ProviderQuotaGroup,
  ProviderQuotaMetric,
} from '@/features/providers/provider-types'
import {
  formatPercent,
  percentageUsed,
} from '@/features/providers/provider-quota-metrics'

const amountFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
})

const currencyFormatter = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
})

export function quotaMetricDisplay(metric: ProviderQuotaMetric): {
  primary: string
  secondary: string | null
  percentage: number | null
} {
  const used = formatQuotaAmount(metric.used, metric.unit)
  const remaining = formatQuotaAmount(metric.remaining, metric.unit)
  const limit = formatQuotaAmount(metric.limit, metric.unit)
  const percentage = metric.unit === 'percent' ? percentageUsed(metric) : null

  if (metric.kind === 'balance') {
    if (metric.key === 'prepaid' && metric.remaining === 0) {
      return {
        primary: 'No prepaid balance',
        secondary: null,
        percentage,
      }
    }

    return {
      primary: remaining ?? 'Balance unavailable',
      secondary: null,
      percentage,
    }
  }

  const disabled =
    metric.limit === 0 &&
    (metric.used === null || metric.used === 0) &&
    (metric.remaining === null || metric.remaining === 0)

  if (disabled) {
    return {
      primary: 'Not enabled',
      secondary: null,
      percentage,
    }
  }

  let secondary: string | null = null
  if (used && limit) {
    secondary = `${used} used of ${limit}`
  } else if (used) {
    secondary = `${used} used`
  } else if (limit) {
    secondary = `${limit} limit`
  }

  return {
    primary:
      remaining !== null
        ? `${remaining} available`
        : used ?? 'Usage unavailable',
    secondary,
    percentage,
  }
}

function formatQuotaAmount(
  amount: number | null,
  unit: ProviderQuotaMetric['unit'],
): string | null {
  if (amount === null) {
    return null
  }

  if (unit === 'usd_cents') {
    return currencyFormatter.format(amount / 100)
  }

  if (unit === 'percent') {
    return formatPercent(amount)
  }

  const formatted = amountFormatter.format(amount)
  return unit === 'credits' ? `${formatted} credits` : formatted
}

export function quotaMetricLabel(
  key: string,
  group?: ProviderQuotaGroup,
): string {
  const limitName = group?.attributes.limit_name
  if (typeof limitName === 'string' && limitName.trim()) {
    const windowName = key === 'primary' ? 'Primary' : key === 'secondary' ? 'Secondary' : null
    return windowName ? `${limitName} · ${windowName}` : limitName
  }

  const labels: Record<string, string> = {
    included_usage: 'Included usage',
    on_demand: 'On-demand usage',
    prepaid: 'Prepaid balance',
    primary: 'Primary limit',
    secondary: 'Secondary limit',
    credits: 'Credit balance',
    reset_credits: 'Reset credits',
  }

  return (
    labels[key] ??
    key.replaceAll('_', ' ').replace(/^./, (value) => value.toUpperCase())
  )
}

export function quotaErrorMessage(error: ProviderQuotaErrorKind): string {
  const messages: Record<ProviderQuotaErrorKind, string> = {
    unsupported: 'This Provider does not support quota reporting.',
    authentication:
      'Quota could not be read because the Provider authentication is no longer valid.',
    rate_limited:
      'The upstream Provider is limiting quota checks. Try again later.',
    upstream: 'The upstream quota service is currently unavailable.',
    invalid_response:
      'The Provider returned an invalid quota response.',
    internal: 'Quota data could not be processed.',
  }

  return messages[error]
}

export function metricItems(groups: ProviderQuotaGroup[]) {
  return groups.flatMap((group) =>
    group.metrics.map((metric) => ({ group, metric })),
  )
}

export function billingAttributes(group: ProviderQuotaGroup) {
  const values: Array<{ key: string; label: string; value: string }> = []
  const planType = group.attributes.plan_type
  const unlimited = group.attributes.unlimited
  const hasCredits = group.attributes.has_credits
  const spendReached = group.attributes.spend_control_reached
  const spendRemainingPercent = group.attributes.spend_remaining_percent
  const rateLimitReachedType = group.attributes.rate_limit_reached_type

  if (typeof planType === 'string' && planType.trim()) {
    values.push({
      key: `${group.key}:plan_type`,
      label: 'Plan',
      value: titleCase(planType),
    })
  }
  if (unlimited === true) {
    values.push({
      key: `${group.key}:unlimited`,
      label: 'Credits',
      value: 'Unlimited',
    })
  } else if (hasCredits === false) {
    values.push({
      key: `${group.key}:has_credits`,
      label: 'Credits',
      value: 'Unavailable',
    })
  }
  if (typeof spendRemainingPercent === 'number') {
    values.push({
      key: `${group.key}:spend_remaining_percent`,
      label: 'Spend available',
      value: formatPercent(spendRemainingPercent),
    })
  }
  if (spendReached === true) {
    values.push({
      key: `${group.key}:spend_control_reached`,
      label: 'Spend control',
      value: 'Reached',
    })
  }
  if (typeof rateLimitReachedType === 'string' && rateLimitReachedType.trim()) {
    values.push({
      key: `${group.key}:rate_limit_reached_type`,
      label: 'Rate limit',
      value: titleCase(rateLimitReachedType),
    })
  }

  return values
}

export function rollingPeriodLabel(durationSeconds: number | null): string {
  if (!durationSeconds) {
    return 'Rolling allowance'
  }

  if (durationSeconds % 86_400 === 0) {
    const days = durationSeconds / 86_400
    return `${days}-day rolling allowance`
  }

  if (durationSeconds % 3_600 === 0) {
    const hours = durationSeconds / 3_600
    return `${hours}-hour rolling allowance`
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60))
  return `${minutes}-minute rolling allowance`
}

function titleCase(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}
