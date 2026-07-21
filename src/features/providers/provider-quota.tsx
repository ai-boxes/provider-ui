import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  CircleAlertIcon,
  Clock3Icon,
  GaugeIcon,
  Loader2Icon,
  RefreshCwIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getProviderQuota,
  refreshProviderQuota,
} from '@/features/providers/provider-api'
import {
  providerKeys,
  providerQuotaQueryOptions,
} from '@/features/providers/providers-query'
import type {
  ProviderAccountWithQuota,
  ProviderQuota,
  ProviderQuotaErrorKind,
  ProviderQuotaMetric,
  ProviderQuotaPeriod,
} from '@/features/providers/provider-types'

const dateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
})

const shortDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

const percentFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
})

const currencyFormatter = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
})

const minuteListeners = new Set<(now: number) => void>()
let minuteTimer: ReturnType<typeof setInterval> | null = null

export function ProviderQuotaSummary({
  accountId,
  quota,
}: {
  accountId: string
  quota: ProviderQuota
}) {
  const queryClient = useQueryClient()
  const checkQuota = useMutation({
    mutationFn: () => getProviderQuota(accountId),
    onSuccess: (nextQuota) => syncQuotaCache(queryClient, accountId, nextQuota),
  })
  const usage = findPrimaryUsage(quota)

  if (quota.support === 'unsupported') {
    return <span className="text-sm text-muted-foreground">Not reported</span>
  }

  if (!quota.snapshot) {
    return (
      <div className="grid justify-items-start gap-1.5">
        <span className="text-sm text-muted-foreground">
          {quota.lastError ? 'Unable to check' : 'Not checked'}
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 h-6 px-2"
          disabled={checkQuota.isPending}
          onClick={() => checkQuota.mutate()}
        >
          {checkQuota.isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <RefreshCwIcon />
          )}
          {checkQuota.isPending
            ? 'Checking…'
            : quota.lastError
              ? 'Check again'
              : 'Check quota'}
        </Button>
        {checkQuota.isError ? (
          <span role="alert" className="text-xs text-destructive">
            Request failed
          </span>
        ) : null}
      </div>
    )
  }

  if (!usage) {
    return (
      <div className="grid gap-1">
        <span className="text-sm font-medium">Quota available</span>
        <QuotaFreshness quota={quota} compact />
      </div>
    )
  }

  const used = percentageUsed(usage)
  const remaining = percentageRemaining(usage)

  return (
    <div className="grid min-w-32 max-w-80 gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium tabular-nums">
          {remaining === null
            ? 'Available'
            : `${formatPercent(remaining)} available`}
        </span>
        {used !== null ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPercent(used)} used
          </span>
        ) : null}
      </div>
      {used !== null ? (
        <Progress
          value={clampPercentage(used)}
          aria-label={`${formatPercent(used)} used`}
        />
      ) : null}
      <QuotaFreshness quota={quota} compact />
    </div>
  )
}

export function ProviderQuotaCard({ accountId }: { accountId: string }) {
  const quota = useQuery(providerQuotaQueryOptions(accountId))
  const queryClient = useQueryClient()
  const [refreshAnnouncement, setRefreshAnnouncement] = useState('')
  const refreshQuota = useMutation({
    mutationFn: () => refreshProviderQuota(accountId),
    onMutate: () => setRefreshAnnouncement('Refreshing quota.'),
    onSuccess: (nextQuota) => {
      syncQuotaCache(queryClient, accountId, nextQuota)
      setRefreshAnnouncement(
        nextQuota.lastError
          ? 'The latest refresh failed. The last available quota remains visible.'
          : 'Quota refreshed.',
      )
    },
    onError: () => {
      setRefreshAnnouncement(
        'The refresh request failed. Existing quota data remains visible.',
      )
    },
  })

  useEffect(() => {
    if (quota.data) {
      syncProviderListQuota(queryClient, accountId, quota.data)
    }
  }, [accountId, queryClient, quota.data])

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <CardTitle>Quota</CardTitle>
            <CardDescription>
              Current usage and balances reported by the upstream Provider.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {quota.data?.snapshot ? (
              <QuotaFreshness quota={quota.data} />
            ) : null}
            {quota.data?.support === 'supported' ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={refreshQuota.isPending}
                onClick={() => refreshQuota.mutate()}
              >
                {refreshQuota.isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <RefreshCwIcon />
                )}
                {refreshQuota.isPending ? 'Refreshing…' : 'Refresh quota'}
              </Button>
            ) : null}
          </div>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {refreshAnnouncement}
        </p>
      </CardHeader>
      <CardContent>
        {quota.isPending ? <QuotaLoading /> : null}
        {quota.isError ? (
          <QuotaRequestError onRetry={() => void quota.refetch()} />
        ) : null}
        {quota.data ? <QuotaContent quota={quota.data} /> : null}
        {refreshQuota.isError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            The refresh request could not be completed. Existing quota data was
            kept.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function QuotaContent({ quota }: { quota: ProviderQuota }) {
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
  const billingMetrics = quota.snapshot.groups
    .filter((group) => group.scope === 'billing')
    .flatMap((group) => group.metrics)
  const otherMetrics = quota.snapshot.groups
    .filter((group) => group.scope !== 'billing')
    .flatMap((group) => group.metrics)
    .filter((metric) => metric !== primaryUsage)
  const hasUsageMetrics = Boolean(primaryUsage) || otherMetrics.length > 0
  const hasBillingMetrics = billingMetrics.length > 0

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
            {primaryUsage ? <PrimaryUsage metric={primaryUsage} /> : null}
            {otherMetrics.length > 0 ? (
              <div
                className={
                  primaryUsage
                    ? 'grid gap-4 border-t pt-4 sm:grid-cols-2'
                    : 'grid gap-4 sm:grid-cols-2'
                }
              >
                {otherMetrics.map((metric) => (
                  <QuotaMetricSummary key={metric.key} metric={metric} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasBillingMetrics ? (
          <BillingSummary
            metrics={billingMetrics}
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

function PrimaryUsage({ metric }: { metric: ProviderQuotaMetric }) {
  const used = percentageUsed(metric)
  const remaining = percentageRemaining(metric)

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Included usage
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
            aria-label={`${formatPercent(used)} of included usage used`}
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
  metrics,
  separated,
}: {
  metrics: ProviderQuotaMetric[]
  separated: boolean
}) {
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
      <div className="divide-y">
        {metrics.map((metric) => (
          <QuotaMetricSummary key={metric.key} metric={metric} />
        ))}
      </div>
    </section>
  )
}

function QuotaMetricSummary({ metric }: { metric: ProviderQuotaMetric }) {
  const display = quotaMetricDisplay(metric)

  return (
    <div className="grid content-start gap-1.5 py-3 first:pt-0 last:pb-0">
      <span className="text-xs font-medium text-muted-foreground">
        {quotaMetricLabel(metric.key)}
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
          aria-label={`${quotaMetricLabel(metric.key)}: ${formatPercent(display.percentage)} used`}
        />
      ) : null}
      <PeriodSummary period={metric.period} />
    </div>
  )
}

function PeriodSummary({ period }: { period: ProviderQuotaPeriod | null }) {
  const now = useMinuteNow()

  if (!period) {
    return null
  }

  const periodLabel =
    period.kind === 'weekly'
      ? 'Weekly allowance'
      : period.kind === 'monthly'
        ? 'Monthly allowance'
        : 'Usage period'

  if (!period.endsAt) {
    return <span className="text-xs text-muted-foreground">{periodLabel}</span>
  }

  const endDate = new Date(period.endsAt * 1000)

  const fullDate = dateFormatter.format(endDate)

  return (
    <span className="text-xs text-muted-foreground">
      {periodLabel} · {formatResetTime(period.endsAt, now)} ·{' '}
      <time
        dateTime={endDate.toISOString()}
        title={fullDate}
        aria-label={`Resets ${fullDate}`}
      >
        {shortDateFormatter.format(endDate)}
      </time>
    </span>
  )
}

function QuotaFreshness({
  quota,
  compact = false,
}: {
  quota: ProviderQuota
  compact?: boolean
}) {
  const now = useMinuteNow()

  if (!quota.snapshot) {
    return null
  }

  const timestamp = quota.snapshot.fetchedAt
  const label = formatRelativeTimestamp(timestamp, now)
  const fullTimestamp = dateTimeFormatter.format(new Date(timestamp * 1000))

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
            ? `Last data ${label} · refresh failed`
            : quota.freshness === 'stale'
              ? `Updated ${label} · refresh recommended`
              : `Updated ${label}`}
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
          Updated {label}
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

function QuotaLoading() {
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

function QuotaRequestError({ onRetry }: { onRetry: () => void }) {
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

function syncQuotaCache(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string,
  quota: ProviderQuota,
) {
  queryClient.setQueryData(providerKeys.quota(accountId), quota)
  syncProviderListQuota(queryClient, accountId, quota)
}

function syncProviderListQuota(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string,
  quota: ProviderQuota,
) {
  queryClient.setQueryData<ProviderAccountWithQuota[]>(
    providerKeys.all,
    (accounts) =>
      accounts?.map((account) =>
        account.id === accountId ? { ...account, quota } : account,
      ),
  )
}

function findPrimaryUsage(quota: ProviderQuota): ProviderQuotaMetric | null {
  return (
    quota.snapshot?.groups
      .find((group) => group.scope === 'aggregate')
      ?.metrics.find(
        (metric) => metric.kind === 'usage' && metric.unit === 'percent',
      ) ?? null
  )
}

function percentageUsed(metric: ProviderQuotaMetric): number | null {
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

function percentageRemaining(metric: ProviderQuotaMetric): number | null {
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

function quotaMetricDisplay(metric: ProviderQuotaMetric): {
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

  return formatPercent(amount)
}

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`
}

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function quotaMetricLabel(key: string): string {
  const labels: Record<string, string> = {
    included_usage: 'Included usage',
    on_demand: 'On-demand usage',
    prepaid: 'Prepaid balance',
  }

  return (
    labels[key] ??
    key.replaceAll('_', ' ').replace(/^./, (value) => value.toUpperCase())
  )
}

function quotaErrorMessage(error: ProviderQuotaErrorKind): string {
  const messages: Record<ProviderQuotaErrorKind, string> = {
    unsupported: 'This Provider does not support quota reporting.',
    authentication:
      'Quota could not be read because the Provider authentication is no longer valid.',
    rate_limited:
      'The upstream Provider is limiting quota checks. Try again later.',
    upstream: 'The upstream quota service is currently unavailable.',
    invalid_response:
      'The Provider returned quota data in an unsupported format.',
    internal: 'Quota data could not be processed.',
  }

  return messages[error]
}

function formatRelativeTimestamp(timestamp: number, now: number): string {
  const seconds = Math.min(0, Math.round(timestamp - now / 1000))
  const absoluteSeconds = Math.abs(seconds)

  if (absoluteSeconds < 60) {
    return 'just now'
  }

  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) {
    return relativeTimeFormatter.format(minutes, 'minute')
  }

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return relativeTimeFormatter.format(hours, 'hour')
  }

  return relativeTimeFormatter.format(Math.round(hours / 24), 'day')
}

function formatResetTime(timestamp: number, now: number): string {
  const remainingMilliseconds = timestamp * 1000 - now

  if (remainingMilliseconds <= 0) {
    return 'reset time passed'
  }

  const minutes = Math.ceil(remainingMilliseconds / 60_000)
  if (minutes < 60) {
    return `resets ${relativeTimeFormatter.format(minutes, 'minute')}`
  }

  const hours = Math.ceil(remainingMilliseconds / 3_600_000)
  if (hours < 24) {
    return `resets ${relativeTimeFormatter.format(hours, 'hour')}`
  }

  const days = Math.ceil(remainingMilliseconds / 86_400_000)
  return `resets ${relativeTimeFormatter.format(days, 'day')}`
}

function useMinuteNow(): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    minuteListeners.add(setNow)

    if (minuteTimer === null) {
      minuteTimer = setInterval(() => {
        const nextNow = Date.now()
        minuteListeners.forEach((listener) => listener(nextNow))
      }, 60_000)
    }

    return () => {
      minuteListeners.delete(setNow)

      if (minuteListeners.size === 0 && minuteTimer !== null) {
        clearInterval(minuteTimer)
        minuteTimer = null
      }
    }
  }, [])

  return now
}
