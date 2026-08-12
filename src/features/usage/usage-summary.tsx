import { ChartNoAxesColumnIcon } from 'lucide-react'

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
  formatUsageCompactCount,
  formatUsageCount,
  formatUsageWindowCost,
} from '@/features/usage/usage-format'
import type { UsageOverview as UsageOverviewData } from '@/features/usage/usage-types'

export function UsageSummary({ overview }: { overview: UsageOverviewData }) {
  if (overview.logicalRequests === 0) {
    return <UsageEmpty />
  }

  const { cost, tokens, cache } = overview
  const windowCost = cost.usd === null ? '—' : formatUsageWindowCost(cost.usd)

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <UsageStat
        label="Requests"
        value={formatUsageCount(overview.logicalRequests)}
      />
      <UsageStat
        label="Input tokens"
        value={formatUsageCompactCount(tokens.effectiveInput)}
      />
      <UsageStat
        label="Output tokens"
        value={formatUsageCompactCount(tokens.output)}
      />
      <UsageStat label="Window cost" value={windowCost} />
      <UsageStat label="Cache hit rate" value={formatCacheHitRate(cache)} />
    </div>
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

function UsageEmpty() {
  return (
    <Card className="min-h-80 justify-center">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-10 rounded-xl">
            <ChartNoAxesColumnIcon />
          </EmptyMedia>
          <EmptyTitle>No usage data recorded</EmptyTitle>
          <EmptyDescription>
            Nothing was recorded in this window. Try a longer one.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  )
}

export function UsageOverviewLoading() {
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
