import { useQuery } from '@tanstack/react-query'
import { ActivityIcon } from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { quotaEstimatePeriodLabel } from '@/features/providers/provider-quota-format'
import { providerQuotaEstimateHistoryQueryOptions } from '@/features/providers/providers-query'
import type {
  ProviderQuotaEstimate,
  ProviderQuotaEstimateSeries,
} from '@/features/providers/provider-types'
import {
  formatUsageCost,
  formatUsageDateTime,
  formatUsageRange,
} from '@/features/usage/usage-format'

const colors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
] as const

type ChartDatum = {
  windowEndMs: number
  [key: string]: number | ProviderQuotaEstimate | undefined
}

export function ProviderQuotaEstimateHistoryCard({
  accountId,
}: {
  accountId: string
}) {
  const history = useQuery(providerQuotaEstimateHistoryQueryOptions(accountId))
  const series = history.data?.series ?? []
  const chart = buildChart(series)

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Estimated quota limits</CardTitle>
        <CardDescription>
          Catalog-cost equivalents inferred from ended or fully used upstream quota windows over the last 3 months.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.isPending ? (
          <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
        ) : history.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Estimate history could not be loaded.
          </p>
        ) : chart.data.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-xl border border-dashed text-center">
            <div className="grid max-w-md justify-items-center gap-2 px-6 py-10">
              <ActivityIcon className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">No quota estimates yet</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                History appears when a reported quota window ends or reaches 100% usage.
              </p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chart.config} className="h-72 w-full aspect-auto">
            <LineChart accessibilityLayer data={chart.data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                dataKey="windowEndMs"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatDateTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={64}
                tickFormatter={(value) => `$${compactNumber(value)}`}
              />
              <ChartTooltip content={<EstimateTooltip />} />
              <ChartLegend content={<ChartLegendContent />} />
              {series.map((item, index) => (
                <Line
                  key={seriesKey(item, index)}
                  type="monotone"
                  dataKey={`value${index}`}
                  name={seriesLabel(item)}
                  stroke={`var(--color-value${index})`}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function buildChart(series: ProviderQuotaEstimateSeries[]) {
  const data = new Map<number, ChartDatum>()
  const config: ChartConfig = {}
  series.forEach((item, index) => {
    config[`value${index}`] = {
      label: seriesLabel(item),
      color: colors[index % colors.length],
    }
    item.points.forEach((point) => {
      const datum = data.get(point.windowEndMs) ?? {
        windowEndMs: point.windowEndMs,
      }
      datum[`value${index}`] = Number(point.estimatedLimitCostUsd)
      datum[`point${index}`] = point
      data.set(point.windowEndMs, datum)
    })
  })
  return {
    data: Array.from(data.values()).sort(
      (left, right) => left.windowEndMs - right.windowEndMs,
    ),
    config,
  }
}

function EstimateTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    dataKey?: string | number
    color?: string
    name?: string
    payload?: ChartDatum
  }>
}) {
  if (!active || !payload?.length) return null
  const entries = payload.flatMap((entry) => {
    const index = String(entry.dataKey).replace('value', '')
    const point = entry.payload?.[`point${index}`]
    return typeof point === 'object' ? [{ entry, point }] : []
  })
  if (entries.length === 0) return null

  return (
    <div className="grid min-w-64 gap-3 rounded-lg border bg-background p-3 text-xs shadow-xl">
      {entries.map(({ entry, point }) => {
        const lowerBound = point.costCompleteness === 'lower_bound'
        const coverage = Math.round(
          (point.pricedAttempts / point.dispatchedAttempts) * 100,
        )
        return (
          <div key={`${point.quotaGroupKey}:${point.quotaMetricKey}`} className="grid gap-1.5">
            <div className="flex items-center gap-2 font-medium">
              <span className="size-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </div>
            <TooltipRow label="Estimated limit" value={`${lowerBound ? '≥' : '≈'}${formatUsageCost(point.estimatedLimitCostUsd)}`} />
            <TooltipRow label="Observed cost" value={`${lowerBound ? '≥' : ''}${formatUsageCost(point.observedCostUsd)}`} />
            <TooltipRow label="Quota used" value={`${point.observedUsedPercent.toLocaleString('en', { maximumFractionDigits: 2 })}%`} />
            <TooltipRow label="Priced coverage" value={`${coverage}% (${point.pricedAttempts}/${point.dispatchedAttempts})`} />
            {point.samplingIncomplete ? (
              <TooltipRow label="Sampling coverage" value="Incomplete after early reset" />
            ) : null}
            <TooltipRow label="Observed" value={formatUsageDateTime(point.observedAtMs)} />
            <TooltipRow label="Window" value={formatUsageRange(point.windowStartMs, point.windowEndMs)} />
          </div>
        )
      })}
    </div>
  )
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-muted-foreground">
      <span>{label}</span>
      <span className="text-right tabular-nums text-foreground">{value}</span>
    </div>
  )
}

function seriesLabel(series: ProviderQuotaEstimateSeries): string {
  const label = quotaEstimatePeriodLabel(series.periodKind, series.durationSeconds)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function seriesKey(series: ProviderQuotaEstimateSeries, index: number): string {
  return `${series.groupKey}:${series.metricKey}:${index}`
}

function formatDateTick(value: number): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(value)
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
