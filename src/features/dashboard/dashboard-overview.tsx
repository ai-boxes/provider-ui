import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  RefreshCwIcon,
  ServerIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

import { PageHeader } from '@/components/layout/page-header'
import { TimeRangeSelector } from '@/components/filters/time-range-selector'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatProviderKind } from '@/features/providers/provider-format'
import {
  formatUsageCompactCount,
  formatUsageCount,
  formatUsageCost,
} from '@/features/usage/usage-format'
import { formatUsageLatencyMs } from '@/features/usage/usage-latency-format'
import { formatUnixMs } from '@/lib/datetime'
import {
  statusBadgeTone,
  statusFillTone,
  type StatusTone,
} from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import {
  dashboardOverviewQueryOptions,
  dashboardProvidersQueryOptions,
} from './dashboard-query'
import {
  applyTimeRangeParams,
  currentTimeRange,
  rememberSharedTimeRangeSelection,
  resolveTimeRangeSelection,
  timeRangeSelectionLabel,
  type TimeRangeSelection,
} from '@/features/time-range/time-range'
import type {
  DashboardAccountMetrics,
  DashboardFailureLayers,
  DashboardOverview as DashboardOverviewData,
  DashboardProviders,
  DashboardQuota,
  DashboardSeries,
} from './dashboard-types'

const percentFormatter = new Intl.NumberFormat('en', {
  style: 'percent',
  maximumFractionDigits: 1,
})
const hourFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})
const dayFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})
const trendChartConfig = {
  requests: {
    label: 'Requests',
    color: 'var(--brand)',
  },
  failures: {
    label: 'Failures',
    color: 'var(--danger)',
  },
} satisfies ChartConfig
export function DashboardOverview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsKey = searchParams.toString()
  const timeRange = useMemo(
    () => resolveTimeRangeSelection(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  )
  const group = searchParams.get('group')?.trim() || null
  const [rangeRevision, setRangeRevision] = useState(0)
  const range = useMemo(() => {
    void rangeRevision
    return currentTimeRange(timeRange)
  }, [rangeRevision, timeRange])
  const overview = useQuery(dashboardOverviewQueryOptions(range, group))
  const providers = useQuery(dashboardProvidersQueryOptions(range, group))
  const busy = overview.isFetching || providers.isFetching

  useEffect(() => {
    rememberSharedTimeRangeSelection(timeRange)
  }, [timeRange])

  function patchParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams)
    mutate(params)
    setSearchParams(params, { replace: true })
  }

  function selectTimeRange(next: TimeRangeSelection) {
    rememberSharedTimeRangeSelection(next)
    patchParams((params) => {
      applyTimeRangeParams(params, next)
    })
  }

  function selectGroup(next: string) {
    patchParams((params) => {
      if (!next) {
        params.delete('group')
      } else {
        params.set('group', next)
      }
    })
  }

  function refresh() {
    setRangeRevision((current) => current + 1)
    if (timeRange.kind === 'custom') {
      void Promise.all([overview.refetch(), providers.refetch()])
    }
  }

  const groups = providers.data?.groups ?? []

  return (
    <section className="flex flex-1 flex-col gap-7">
      <PageHeader
        title="Dashboard"
        description={
          overview.data
            ? `${timeRangeSelectionLabel(timeRange)} · ${formatUnixMs(overview.data.fromMs)} – ${formatUnixMs(overview.data.toMs)}`
            : 'Provider fleet health across the selected window.'
        }
        actions={
          <>
            <TimeRangeSelector value={timeRange} onChange={selectTimeRange} />
            <DashboardGroupSelector
              value={group ?? ''}
              groups={groups}
              disabled={providers.isPending || providers.isError}
              onSelect={selectGroup}
            />
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
              disabled={busy}
              onClick={refresh}
            >
              <RefreshCwIcon className={busy ? 'animate-spin' : undefined} />
            </Button>
          </>
        }
      />

      {overview.isError || providers.isError ? (
        <DashboardError busy={busy} onRetry={refresh} />
      ) : overview.isPending || providers.isPending ? (
        <DashboardSkeleton />
      ) : overview.data && providers.data ? (
        <DashboardContent
          overview={overview.data}
          providers={providers.data}
          timeRange={timeRange}
        />
      ) : null}
    </section>
  )
}

function DashboardContent({
  overview,
  providers,
  timeRange,
}: {
  overview: DashboardOverviewData
  providers: DashboardProviders
  timeRange: TimeRangeSelection
}) {
  return (
    <>
      <DashboardPulse overview={overview} timeRange={timeRange} />
      <ProviderAccountsSection accounts={providers.accounts} />
      <TrendSection series={providers.series} timeRange={timeRange} />
      <DashboardIssues layers={overview.failureLayers} />
    </>
  )
}

function DashboardGroupSelector({
  value,
  groups,
  disabled,
  onSelect,
}: {
  value: string
  groups: string[]
  disabled: boolean
  onSelect: (value: string) => void
}) {
  return (
    <NativeSelect
      aria-label="Provider group filter"
      className="w-40"
      size="sm"
      value={value}
      disabled={disabled}
      onChange={(event) => onSelect(event.target.value)}
    >
      <NativeSelectOption value="">All groups</NativeSelectOption>
      {groups.map((group) => (
        <NativeSelectOption key={group} value={group}>
          {group}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

function DashboardPulse({
  overview,
  timeRange,
}: {
  overview: DashboardOverviewData
  timeRange: TimeRangeSelection
}) {
  const verdict = dashboardVerdict(overview)
  const tone = dashboardVerdictTone(overview)
  const periodLabel = timeRangeSelectionLabel(timeRange)

  return (
    <section className="grid gap-3">
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-brand/8 to-transparent" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid min-w-0 gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <span className={cn('size-2 rounded-full', statusFillTone(tone))} aria-hidden="true" />
              Fleet status
            </div>
            <h2 className="font-heading text-lg font-semibold tracking-tight sm:text-xl text-pretty">
              {verdict.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {verdict.description}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
            <StatusChip
              icon={<CircleCheckIcon aria-hidden="true" />}
              label={`${overview.accounts.active} active`}
              tone="success"
            />
            {overview.accounts.reauthRequired > 0 ? (
              <StatusChip
                icon={<ShieldAlertIcon aria-hidden="true" />}
                label={`${overview.accounts.reauthRequired} reauth`}
                tone="danger"
              />
            ) : null}
            {overview.accounts.disabled > 0 ? (
              <StatusChip
                icon={<CircleXIcon aria-hidden="true" />}
                label={`${overview.accounts.disabled} disabled`}
                tone="neutral"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs sm:grid-cols-3 xl:grid-cols-6 sm:divide-y-0">
        <DashboardKpi
          label={`${periodLabel} Tokens`}
          value={formatUsageCompactCount(overview.tokens.total)}
          detail={`${formatUsageCompactCount(overview.tokens.effectiveInput)} in · ${formatUsageCompactCount(overview.tokens.output)} out`}
          tone="info"
        />
        <DashboardKpi
          label="Total Tokens"
          value={formatUsageCompactCount(overview.totalTokens.total)}
          detail="All data"
          tone="neutral"
        />
        <DashboardKpi
          label="Performance"
          value={formatRate(overview.successRate)}
          detail={`${formatUsageCount(overview.successes)} ok · ${formatUsageCount(overview.failures)} failed`}
          tone={overview.successRate !== null && overview.successRate < 0.95 ? 'warning' : 'success'}
        />
        <DashboardKpi
          label="Avg Response"
          value={formatUsageLatencyMs(overview.avgResponseMs)}
          tone="neutral"
        />
        <DashboardKpi
          label={`${periodLabel} Cost`}
          value={overview.costUsd === null ? '—' : formatUsageCost(overview.costUsd)}
          tone="info"
        />
        <DashboardKpi
          label={`${periodLabel} Requests`}
          value={formatUsageCount(overview.requests)}
          detail={`TTFT ${formatUsageLatencyMs(overview.ttftP50Ms)}`}
          tone="success"
        />
      </div>
    </section>
  )
}

function ProviderAccountsSection({ accounts }: { accounts: DashboardAccountMetrics[] }) {
  return (
    <section className="grid min-w-0 gap-3">
      <SectionHeading
        title="Provider accounts"
      />
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        {accounts.length === 0 ? (
          <EmptySection icon={<ServerIcon aria-hidden="true" />} title="No provider accounts" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] caption-bottom text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/35">
                  <TableHead>Provider / group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Requests</TableHead>
                  <TableHead align="right">Success rate</TableHead>
                  <TableHead align="right">TTFT</TableHead>
                  <TableHead align="right">Response</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <ProviderAccountRow key={account.accountId} account={account} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function ProviderAccountRow({ account }: { account: DashboardAccountMetrics }) {
  const statusTone = account.enabled
    ? account.authState === 'reauth_required'
      ? 'danger'
      : 'success'
    : 'neutral'
  const statusLabel = !account.enabled
    ? 'Disabled'
    : account.authState === 'reauth_required'
      ? 'Reauth required'
      : 'Active'

  return (
    <tr className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/35">
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ServerIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate font-medium">{account.label}</span>
            <span className="text-xs text-muted-foreground">
              {formatProviderKind(account.provider)} · {account.groupLabel}
            </span>
          </span>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge tone={statusTone} label={statusLabel} />
      </TableCell>
      <TableCell align="right" className="font-medium tabular-nums">
        {formatUsageCount(account.requests)}
      </TableCell>
      <TableCell align="right" className="font-medium tabular-nums">
        {formatRate(account.successRate)}
      </TableCell>
      <TableCell align="right" className="tabular-nums text-muted-foreground">
        {formatUsageLatencyMs(account.ttftP50Ms)}
      </TableCell>
      <TableCell align="right" className="tabular-nums text-muted-foreground">
        {formatUsageLatencyMs(account.durationP95Ms)}
      </TableCell>
      <TableCell>
        <QuotaCell quota={account.quota} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Link
            to={`/providers/${encodeURIComponent(account.accountId)}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Details
            <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
          {account.authState === 'reauth_required' ? (
            <Link
              to={`/providers/${encodeURIComponent(account.accountId)}`}
              className="text-xs font-medium text-danger-subtle-foreground outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Reauth
            </Link>
          ) : null}
        </div>
      </TableCell>
    </tr>
  )
}

function TrendSection({
  series,
  timeRange,
}: {
  series: DashboardSeries
  timeRange: TimeRangeSelection
}) {
  const showDayLabels = series.buckets.length > 24
  const data = series.buckets.map((bucket, index) => ({
    label: showDayLabels
      ? dayFormatter.format(new Date(bucket))
      : hourFormatter.format(new Date(bucket)),
    requests: series.requests[index] ?? 0,
    failures: series.failures[index] ?? 0,
  }))
  const totalRequests = series.requests.reduce((sum, value) => sum + value, 0)
  const totalFailures = series.failures.reduce((sum, value) => sum + value, 0)

  return (
    <section className="grid min-w-0 gap-3">
      <SectionHeading
        title={`${timeRangeSelectionLabel(timeRange)} request trend`}
        aside={
          <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <span>{formatUsageCompactCount(totalRequests)} requests</span>
            {totalFailures > 0 ? (
              <span className="text-danger-subtle-foreground">
                {formatUsageCompactCount(totalFailures)} failures
              </span>
            ) : null}
          </div>
        }
      />
      <div className="min-w-0 rounded-xl border border-border/80 bg-card p-3 shadow-xs sm:p-4">
        {data.length === 0 ? (
          <EmptySection icon={<ServerIcon aria-hidden="true" />} title="No trend data" />
        ) : (
          <ChartContainer config={trendChartConfig} className="h-56 w-full aspect-auto">
            <AreaChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatUsageCompactCount}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="var(--color-requests)"
                fill="var(--color-requests)"
                fillOpacity={0.12}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              {totalFailures > 0 ? (
                <Area
                  type="monotone"
                  dataKey="failures"
                  stroke="var(--color-failures)"
                  fill="var(--color-failures)"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              ) : null}
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </section>
  )
}

function DashboardIssues({ layers }: { layers: DashboardFailureLayers }) {
  if (layers.upstreamFailedRequests === 0 && layers.zeroDispatchLogicalFailures === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-sm text-warning-foreground">
      <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {layers.upstreamFailedRequests > 0
          ? `${formatUsageCount(layers.upstreamFailedRequests)} upstream failed`
          : null}
        {layers.upstreamFailedRequests > 0 && layers.zeroDispatchLogicalFailures > 0 ? ' · ' : null}
        {layers.zeroDispatchLogicalFailures > 0
          ? `${formatUsageCount(layers.zeroDispatchLogicalFailures)} zero-dispatch`
          : null}
      </span>
    </div>
  )
}

function QuotaCell({ quota }: { quota: DashboardQuota }) {
  const percent = quota.tightestRemainingPercent
  return (
    <span className="text-xs font-medium tabular-nums text-muted-foreground">
      {percent === null ? '—' : formatPercentNumber(percent)}
    </span>
  )
}

function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <Badge className={cn(statusBadgeTone(tone), 'gap-1.5')}>
      <span className={cn('size-1.5 rounded-full', statusFillTone(tone))} aria-hidden="true" />
      {label}
    </Badge>
  )
}

function StatusChip({
  icon,
  label,
  tone,
}: {
  icon: ReactNode
  label: string
  tone: StatusTone
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1', statusBadgeTone(tone))}>
      <span className="[&>svg]:size-3.5">{icon}</span>
      {label}
    </span>
  )
}

function DashboardKpi({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail?: string
  tone: StatusTone
}) {
  return (
    <div className="grid min-h-24 content-center gap-1.5 px-3 py-3 sm:px-4">
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn('size-1.5 rounded-full', statusFillTone(tone))} aria-hidden="true" />
        {label}
      </span>
      <span className="font-heading text-[1.7rem] font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      {detail ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
    </div>
  )
}

function SectionHeading({
  title,
  aside,
}: {
  title: string
  aside?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight text-balance">{title}</h2>
      {aside}
    </div>
  )
}

function TableHead({
  children,
  align = 'left',
}: {
  children: ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={cn(
        'h-11 px-3 text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  )
}

function TableCell({
  children,
  align = 'left',
  className,
}: {
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  return (
    <td
      className={cn(
        'px-3 py-3 align-middle whitespace-nowrap',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </td>
  )
}

function EmptySection({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground [&>svg]:size-4">
        {icon}
      </span>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">No data was recorded in this window.</span>
    </div>
  )
}

function DashboardError({ busy, onRetry }: { busy: boolean; onRetry: () => void }) {
  return (
    <Alert className="max-w-2xl">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Dashboard unavailable</AlertTitle>
      <AlertDescription>Could not load fleet data.</AlertDescription>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-fit group-has-[>svg]/alert:col-start-2"
        disabled={busy}
        onClick={onRetry}
      >
        <RefreshCwIcon className={busy ? 'animate-spin' : undefined} />
        {busy ? 'Retrying…' : 'Retry'}
      </Button>
    </Alert>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <div className="rounded-2xl border border-border/80 bg-card p-6">
          <div className="grid gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-card sm:grid-cols-3 xl:grid-cols-6 sm:divide-y-0">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid gap-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card p-5">
          <div className="grid gap-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatRate(value: number | null): string {
  return value === null ? '—' : percentFormatter.format(value)
}

function formatPercentNumber(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

function dashboardVerdict(overview: DashboardOverviewData): {
  title: string
  description: string
} {
  if (overview.requests === 0) {
    return {
      title: 'Fleet is quiet in this window',
      description: 'No traffic in this window.',
    }
  }
  if (overview.accounts.reauthRequired > 0) {
    return {
      title: 'Credential attention needed',
      description: `${overview.accounts.reauthRequired} account${overview.accounts.reauthRequired === 1 ? '' : 's'} need reauth.`,
    }
  }
  if (overview.successRate !== null && overview.successRate < 0.95) {
    return {
      title: 'Traffic is showing elevated failures',
      description: `${formatRate(overview.successRate)} success in this window.`,
    }
  }
  return {
    title: 'Fleet is operating normally',
    description: `${formatRate(overview.successRate)} success · ${formatUsageLatencyMs(overview.ttftP50Ms)} TTFT.`,
  }
}

function dashboardVerdictTone(overview: DashboardOverviewData): StatusTone {
  if (overview.accounts.reauthRequired > 0) {
    return 'danger'
  }
  if (overview.requests > 0 && overview.successRate !== null && overview.successRate < 0.95) {
    return 'warning'
  }
  return overview.requests === 0 ? 'neutral' : 'success'
}
