import { useQuery } from '@tanstack/react-query'
import {
  ChartNoAxesColumnIcon,
  CircleAlertIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useSearchParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatCacheHitRate,
  formatUsageCost,
  formatUsageCount,
  formatUsageRange,
} from '@/features/usage/usage-format'
import { usageOverviewQueryOptions } from '@/features/usage/usage-query'
import type {
  UsageOverview as UsageOverviewData,
  UsageWindowId,
} from '@/features/usage/usage-types'
import {
  defaultUsageWindow,
  parseUsageWindow,
  usageWindows,
} from '@/features/usage/usage-window'

export function UsageOverview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const windowId = parseUsageWindow(searchParams.get('window'))
  const overview = useQuery(usageOverviewQueryOptions(windowId))

  function selectWindow(next: UsageWindowId) {
    // Patched rather than replaced so a filter added to this page later is not
    // dropped by changing the window.
    const params = new URLSearchParams(searchParams)

    if (next === defaultUsageWindow) {
      params.delete('window')
    } else {
      params.set('window', next)
    }

    setSearchParams(params, { replace: true })
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {overview.data
            ? formatUsageRange(overview.data.fromMs, overview.data.toMs)
            : 'Usage observed on your requests.'}
        </p>
        <div className="flex items-center gap-2 self-start">
          <UsageWindowSelector value={windowId} onSelect={selectWindow} />
          <Button
            variant="outline"
            size="sm"
            disabled={overview.isFetching}
            onClick={() => void overview.refetch()}
          >
            <RefreshCwIcon
              className={overview.isFetching ? 'animate-spin' : undefined}
            />
            Refresh
          </Button>
        </div>
      </div>

      {overview.isPending ? <UsageOverviewLoading /> : null}
      {overview.isError ? (
        <UsageOverviewError onRetry={() => void overview.refetch()} />
      ) : null}
      {overview.data ? <UsageSummary overview={overview.data} /> : null}
    </section>
  )
}

function UsageWindowSelector({
  value,
  onSelect,
}: {
  value: UsageWindowId
  onSelect: (next: UsageWindowId) => void
}) {
  return (
    <div
      role="group"
      aria-label="Time window"
      className="flex items-center gap-1 rounded-lg border bg-background p-1"
    >
      {usageWindows.map((window) => (
        <Button
          key={window.id}
          size="sm"
          variant={window.id === value ? 'secondary' : 'ghost'}
          aria-pressed={window.id === value}
          title={window.label}
          className="h-7 px-2.5 text-xs"
          onClick={() => onSelect(window.id)}
        >
          {window.short}
        </Button>
      ))}
    </div>
  )
}

function UsageSummary({ overview }: { overview: UsageOverviewData }) {
  // The overview always answers; "empty" means no usage data was recorded in
  // the window. A tracking gap makes that different from claiming no usage
  // happened, so the empty state has to preserve that warning.
  if (overview.logicalRequests === 0 && overview.attempts === 0) {
    return <UsageEmpty hasTrackingGaps={overview.trackingGaps > 0} />
  }

  const { cost, tokens, cache } = overview
  const hitRate = formatCacheHitRate(cache)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <UsageStat
          label="Requests"
          value={formatUsageCount(overview.logicalRequests)}
        />
        <UsageStat
          label="Input tokens"
          value={formatUsageCount(tokens.effectiveInput)}
        />
        <UsageStat
          label="Output tokens"
          value={formatUsageCount(tokens.output)}
        />
        {/* Only the completely priced amount. The partly priced total is
            reported below and never folded in: adding it would present an
            incomplete estimate as a complete one. With nothing priced
            completely there is no amount at all, and $0.00 would claim the
            usage was free rather than unpriced. */}
        <UsageStat
          label="Estimated cost"
          value={
            cost.completeAttempts > 0
              ? `≈ ${formatUsageCost(cost.completeUsd)}`
              : '—'
          }
        />
        <UsageStat label="Cache hit rate" value={hitRate ?? '—'} />
      </div>

      <UsageNotes overview={overview} />
    </>
  )
}

// One quiet paragraph. In a healthy window it is a single sentence saying the
// cost is an estimate; each way the numbers can be incomplete adds a sentence,
// so an undercount is never presented as a total.
function UsageNotes({ overview }: { overview: UsageOverviewData }) {
  const { cost, tokens } = overview
  const notes = ['Estimated from public model prices, not a bill.']

  if (cost.partialAttempts > 0) {
    notes.push(
      `${formatUsageCount(cost.partialAttempts)} calls were only partly priced, a further ${formatUsageCost(cost.partialKnownUsd)} not included above.`,
    )
  }

  if (cost.unavailableAttempts > 0) {
    notes.push(
      `${formatUsageCount(cost.unavailableAttempts)} calls could not be priced.`,
    )
  }

  if (tokens.attemptsWithUnknownInput > 0) {
    notes.push('Some calls did not report token counts.')
  }

  if (overview.trackingGaps > 0) {
    notes.push('Some usage was not recorded, so these numbers are incomplete.')
  }

  return (
    <p className="text-xs leading-5 text-muted-foreground">{notes.join(' ')}</p>
  )
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-2 p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl leading-none font-semibold tabular-nums">
        {value}
      </span>
    </Card>
  )
}

function UsageEmpty({ hasTrackingGaps }: { hasTrackingGaps: boolean }) {
  return (
    <Card className="min-h-80 justify-center">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-10 rounded-xl">
            <ChartNoAxesColumnIcon />
          </EmptyMedia>
          <EmptyTitle>No usage data recorded</EmptyTitle>
          <EmptyDescription>
            {hasTrackingGaps
              ? 'Some usage could not be recorded, so this window may not be empty.'
              : 'Nothing was recorded in this window. Try a longer one.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  )
}

function UsageOverviewLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => (
        <Card key={index} className="gap-2 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
        </Card>
      ))}
    </div>
  )
}

function UsageOverviewError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert className="max-w-2xl">
      <CircleAlertIcon />
      <AlertTitle>Unable to load usage</AlertTitle>
      <AlertDescription>
        Check the server connection and try again.
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
