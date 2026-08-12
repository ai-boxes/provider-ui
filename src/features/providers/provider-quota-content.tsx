import { CircleAlertIcon, Clock3Icon, GaugeIcon, RefreshCwIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  ProviderQuota,
  ProviderQuotaGroup,
  ProviderQuotaMetric,
  ProviderQuotaPeriod,
} from '@/features/providers/provider-types'
import {
  clampPercentage,
  findPrimaryUsage,
  formatPercent,
  percentageRemaining,
  percentageUsed,
} from '@/features/providers/provider-quota-metrics'
import {
  billingAttributes,
  metricItems,
  quotaErrorMessage,
  quotaMetricDisplay,
  quotaMetricLabel,
  rollingPeriodLabel,
} from '@/features/providers/provider-quota-format'
import { formatUnixSeconds } from '@/lib/datetime'

export function ProviderQuotaContent({ quota }: { quota: ProviderQuota }) {
  if (quota.support === 'unsupported') {
    return (
      <div className="flex min-h-28 items-center gap-3 text-sm text-muted-foreground">
        <GaugeIcon className="size-5" />
        This Provider does not report quota data.
      </div>
    )
  }

  if (!quota.snapshot) {
    return (
      <Alert variant={quota.lastError ? 'destructive' : 'default'}>
        <CircleAlertIcon />
        <AlertTitle>
          {quota.lastError
            ? 'Unable to read quota'
            : 'Quota has not been checked'}
        </AlertTitle>
        <AlertDescription>
          {quota.lastError
            ? quotaErrorMessage(quota.lastError)
            : 'Use Refresh quota to request the latest data from the upstream Provider.'}
        </AlertDescription>
      </Alert>
    )
  }

  const primaryUsage = findPrimaryUsage(quota)
  const billingGroups = quota.snapshot.groups.filter(
    (group) => group.scope === 'billing',
  )
  const billingMetrics = metricItems(billingGroups)
  const otherMetrics = metricItems(
    quota.snapshot.groups.filter((group) => group.scope !== 'billing'),
  ).filter(({ metric }) => metric !== primaryUsage?.metric)
  const hasUsageMetrics = Boolean(primaryUsage) || otherMetrics.length > 0
  const hasBillingMetrics =
    billingMetrics.length > 0 ||
    billingGroups.some((group) => Object.keys(group.attributes).length > 0)

  return (
    <div className="grid gap-5">
      {quota.lastError ? (
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>Showing the last available quota</AlertTitle>
          <AlertDescription>
            {quotaErrorMessage(quota.lastError)}
          </AlertDescription>
        </Alert>
      ) : null}

      <div
        className={
          hasUsageMetrics && hasBillingMetrics
            ? 'grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,0.8fr)] lg:gap-8'
            : 'grid gap-6'
        }
      >
        {hasUsageMetrics ? (
          <div className="grid content-start gap-4">
            {primaryUsage ? (
              <PrimaryUsage
                metric={primaryUsage.metric}
                label={quotaMetricLabel(
                  primaryUsage.metric.key,
                  primaryUsage.group,
                )}
              />
            ) : null}
            {otherMetrics.length > 0 ? (
              <div
                className={
                  primaryUsage
                    ? 'grid gap-4 border-t pt-4 sm:grid-cols-2'
                    : 'grid gap-4 sm:grid-cols-2'
                }
              >
                {otherMetrics.map(({ group, metric }) => (
                  <QuotaMetricSummary
                    key={`${group.key}:${metric.key}`}
                    group={group}
                    metric={metric}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasBillingMetrics ? (
          <BillingSummary
            groups={billingGroups}
            separated={hasUsageMetrics}
          />
        ) : null}

        {!hasUsageMetrics && !hasBillingMetrics ? (
          <p className="text-sm text-muted-foreground">
            No quota metrics are currently available.
          </p>
        ) : null}
      </div>

      {quota.snapshot.warnings.length > 0 ? (
        <p className="border-t pt-4 text-xs text-muted-foreground">
          Some upstream quota details could not be displayed. The available
          totals are shown above.
        </p>
      ) : null}
    </div>
  )
}

function PrimaryUsage({
  metric,
  label,
}: {
  metric: ProviderQuotaMetric
  label: string
}) {
  const used = percentageUsed(metric)
  const remaining = percentageRemaining(metric)

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {remaining === null
              ? 'Available'
              : `${formatPercent(remaining)} available`}
          </span>
        </div>
        <PeriodSummary period={metric.period} />
      </div>

      {used !== null ? (
        <div className="grid gap-2">
          <Progress
            value={clampPercentage(used)}
            className="gap-2 [&_[data-slot=progress-track]]:h-1.5"
            aria-label={`${label}: ${formatPercent(used)} used`}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPercent(used)} used
          </span>
        </div>
      ) : null}

      {metric.breakdown.length > 0 ? (
        <div className="grid gap-3 border-t pt-4">
          <span className="text-xs font-medium text-muted-foreground">
            Usage by product
          </span>
          <div className="grid gap-4 sm:grid-cols-2">
            {metric.breakdown.map((item) => (
              <div key={item.key} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatPercent(item.used)} used
                  </span>
                </div>
                <Progress
                  value={clampPercentage(item.used)}
                  aria-label={`${item.label}: ${formatPercent(item.used)} used`}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function BillingSummary({
  groups,
  separated,
}: {
  groups: ProviderQuotaGroup[]
  separated: boolean
}) {
  const metrics = metricItems(groups)
  const attributes = groups.flatMap((group) => billingAttributes(group))

  return (
    <section
      className={
        separated
          ? 'grid content-start gap-3 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7'
          : 'grid content-start gap-3'
      }
    >
      <div className="grid gap-0.5">
        <span className="text-sm font-medium">Billing</span>
        <span className="text-xs text-muted-foreground">
          Account-funded usage and balances.
        </span>
      </div>
      {attributes.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/35 p-3 text-xs">
          {attributes.map((attribute) => (
            <div key={attribute.key} className="grid gap-0.5">
              <dt className="text-muted-foreground">{attribute.label}</dt>
              <dd className="font-medium">{attribute.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="divide-y">
        {metrics.map(({ group, metric }) => (
          <QuotaMetricSummary
            key={`${group.key}:${metric.key}`}
            group={group}
            metric={metric}
          />
        ))}
      </div>
    </section>
  )
}

function QuotaMetricSummary({
  metric,
  group,
}: {
  metric: ProviderQuotaMetric
  group?: ProviderQuotaGroup
}) {
  const display = quotaMetricDisplay(metric)

  return (
    <div className="grid content-start gap-1.5 py-3 first:pt-0 last:pb-0">
      <span className="text-xs font-medium text-muted-foreground">
        {quotaMetricLabel(metric.key, group)}
      </span>
      <span className="text-base font-semibold tracking-tight tabular-nums">
        {display.primary}
      </span>
      {display.secondary ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {display.secondary}
        </span>
      ) : null}
      {display.percentage !== null ? (
        <Progress
          value={clampPercentage(display.percentage)}
          aria-label={`${quotaMetricLabel(metric.key, group)}: ${formatPercent(display.percentage)} used`}
        />
      ) : null}
      <PeriodSummary period={metric.period} />
    </div>
  )
}

function PeriodSummary({ period }: { period: ProviderQuotaPeriod | null }) {
  if (!period) {
    return null
  }

  const periodLabel =
    period.kind === 'weekly'
      ? 'Weekly allowance'
      : period.kind === 'monthly'
        ? 'Monthly allowance'
        : period.kind === 'rolling'
          ? rollingPeriodLabel(period.durationSeconds)
          : 'Usage period'

  if (!period.endsAt) {
    return <span className="text-xs text-muted-foreground">{periodLabel}</span>
  }

  const endDate = new Date(period.endsAt * 1000)
  const fullDate = formatUnixSeconds(period.endsAt)

  return (
    <span className="text-xs text-muted-foreground">
      {periodLabel} · resets{' '}
      <time
        dateTime={endDate.toISOString()}
        title={fullDate}
        aria-label={`Resets ${fullDate}`}
      >
        {fullDate}
      </time>
    </span>
  )
}

export function ProviderQuotaFreshness({
  quota,
  compact = false,
}: {
  quota: ProviderQuota
  compact?: boolean
}) {
  if (!quota.snapshot) {
    return null
  }

  const timestamp = quota.snapshot.fetchedAt
  const fullTimestamp = formatUnixSeconds(timestamp)

  const fetchedAt = new Date(timestamp * 1000)

  if (compact) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock3Icon className="size-3" />
        <time
          dateTime={fetchedAt.toISOString()}
          title={fullTimestamp}
          aria-label={`Quota updated ${fullTimestamp}`}
        >
          {quota.lastError
            ? `Last data ${fullTimestamp} · refresh failed`
            : quota.freshness === 'stale'
              ? `Updated ${fullTimestamp} · refresh recommended`
              : `Updated ${fullTimestamp}`}
        </time>
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock3Icon className="size-3.5" />
        <time
          dateTime={fetchedAt.toISOString()}
          title={fullTimestamp}
          aria-label={`Quota updated ${fullTimestamp}`}
        >
          Updated {fullTimestamp}
        </time>
      </span>
      {quota.lastError ? (
        <Badge
          variant="outline"
          className="gap-1.5 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <CircleAlertIcon />
          Refresh failed
        </Badge>
      ) : quota.freshness === 'stale' ? (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          Refresh recommended
        </Badge>
      ) : null}
    </div>
  )
}

export function ProviderQuotaLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,0.8fr)] lg:gap-8">
      <div className="grid gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-3 w-28" />
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="grid content-start gap-4 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

export function ProviderQuotaRequestError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert>
      <CircleAlertIcon />
      <AlertTitle>Unable to load quota</AlertTitle>
      <AlertDescription>
        The Provider account loaded, but its quota could not be read.
      </AlertDescription>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-fit group-has-[>svg]/alert:col-start-2"
        onClick={onRetry}
      >
        <RefreshCwIcon />
        Retry
      </Button>
    </Alert>
  )
}
