import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { DatabaseZapIcon } from 'lucide-react'
import { useState } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  formatUsageCompactCount,
  formatUsageCost,
  formatUsageCostDetailed,
  formatUsageCount,
  formatUsagePrice,
} from '@/features/usage/usage-format'
import { usageRequestDetailQueryOptions } from '@/features/usage/usage-query'
import type {
  UsageCostTotals,
  UsageRange,
  UsageRequestDetail,
  UsageTokenTotals,
} from '@/features/usage/usage-types'

export function TokensBreakdown({ tokens }: { tokens: UsageTokenTotals }) {
  const total = tokens.effectiveInput + tokens.output

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex min-h-11 min-w-[10.5rem] items-center gap-3 whitespace-nowrap rounded-md text-xs leading-4 tabular-nums outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Token breakdown, ${formatUsageCount(total)} tokens`}
          />
        }
      >
        <TokenGlyph
          symbol="↑"
          tone="input"
          value={tokens.effectiveInput}
        />
        <TokenGlyph
          symbol="↓"
          tone="output"
          value={tokens.output}
        />
        <TokenGlyph
          symbol={<DatabaseZapIcon size={13} strokeWidth={2.25} />}
          tone="cache"
          value={tokens.cacheReadInput}
        />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-60 p-3">
        <BreakdownTitle>Token breakdown</BreakdownTitle>
        <div className="mt-2 grid gap-1">
          <BreakdownRow
            label="Input tokens"
            value={formatUsageCount(tokens.effectiveInput)}
          />
          <BreakdownRow
            label="Output tokens"
            value={formatUsageCount(tokens.output)}
          />
          <BreakdownRow
            label="Cache read"
            value={formatUsageCount(tokens.cacheReadInput)}
          />
        </div>
        <div className="my-2 h-px bg-border" />
        <BreakdownRow
          label="Total tokens"
          value={formatUsageCount(total)}
          strong
        />
      </PopoverContent>
    </Popover>
  )
}

export function CostBreakdown({
  requestId,
  cost,
  range,
}: {
  requestId: string
  cost: UsageCostTotals
  range: UsageRange
}) {
  if (cost.usd === null) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <CompleteCostBreakdown
      requestId={requestId}
      total={formatUsageCost(cost.usd)}
      range={range}
    />
  )
}

function CompleteCostBreakdown({
  requestId,
  total,
  range,
}: {
  requestId: string
  total: string
  range: UsageRange
}) {
  const [open, setOpen] = useState(false)
  const detail = useQuery({
    ...usageRequestDetailQueryOptions(requestId, range),
    enabled: open,
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md text-left font-medium tabular-nums outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Cost breakdown, ${total}`}
          />
        }
      >
        {total}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="max-h-[var(--available-height)] w-72 overflow-y-auto p-3"
      >
        <BreakdownTitle>Cost breakdown</BreakdownTitle>
        <CostBreakdownContent detail={detail} />
      </PopoverContent>
    </Popover>
  )
}

function CostBreakdownContent({
  detail,
}: {
  detail: UseQueryResult<UsageRequestDetail, Error>
}) {
  if (detail.isPending) {
    return <p className="mt-2 text-xs text-muted-foreground">Loading pricing…</p>
  }

  if (detail.isError) {
    return <p className="mt-2 text-xs text-destructive">Unable to load pricing.</p>
  }

  const attempt = detail.data.attempt

  return (
    <>
      <div className="mt-2 grid gap-1">
        <BreakdownRow label="Input cost" value={formatOptionalCost(attempt.cost.inputUsd)} />
        <BreakdownRow label="Output cost" value={formatOptionalCost(attempt.cost.outputUsd)} />
        <BreakdownRow
          label="Cache read cost"
          value={formatOptionalCost(attempt.cost.cacheReadUsd)}
        />
        <BreakdownRow
          label="Cache write cost"
          value={formatOptionalCost(attempt.cost.cacheWriteUsd)}
        />
        <BreakdownRow
          label="Reasoning cost"
          value={formatOptionalCost(attempt.cost.reasoningUsd)}
        />
        <BreakdownRow
          label="Input audio cost"
          value={formatOptionalCost(attempt.cost.inputAudioUsd)}
        />
        <BreakdownRow
          label="Output audio cost"
          value={formatOptionalCost(attempt.cost.outputAudioUsd)}
        />
      </div>
      <div className="my-2 h-px bg-border" />
      <div className="grid gap-1">
        <BreakdownRow
          label="Applied tier"
          value={attempt.price.tierThresholdTokens === null
            ? 'Base'
            : `Over ${formatUsageCount(attempt.price.tierThresholdTokens)} tokens`}
        />
        <BreakdownRow
          label="Pricing context"
          value={attempt.price.pricingContextTokens === null
            ? null
            : `${formatUsageCount(attempt.price.pricingContextTokens)} tokens`}
        />
        <BreakdownRow
          label="Input price"
          value={formatOptionalPrice(attempt.price.inputPerMillionUsd)}
        />
        <BreakdownRow
          label="Output price"
          value={formatOptionalPrice(attempt.price.outputPerMillionUsd)}
        />
        <BreakdownRow
          label="Cache read price"
          value={formatOptionalPrice(attempt.price.cacheReadPerMillionUsd)}
        />
        <BreakdownRow
          label="Cache write price"
          value={formatOptionalPrice(attempt.price.cacheWritePerMillionUsd)}
        />
        <BreakdownRow
          label="Reasoning price"
          value={formatOptionalPrice(attempt.price.reasoningPerMillionUsd)}
        />
        <BreakdownRow
          label="Input audio price"
          value={formatOptionalPrice(attempt.price.inputAudioPerMillionUsd)}
        />
        <BreakdownRow
          label="Output audio price"
          value={formatOptionalPrice(attempt.price.outputAudioPerMillionUsd)}
        />
      </div>
      <div className="my-2 h-px bg-border" />
      <BreakdownRow
        label="Total cost"
        value={formatOptionalCost(attempt.cost.totalUsd)}
        strong
      />
    </>
  )
}

function formatOptionalCost(value: string | null): string | null {
  return value === null ? null : formatUsageCostDetailed(value)
}

function formatOptionalPrice(value: string | null): string | null {
  return value === null ? null : formatUsagePrice(value)
}

function BreakdownTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-foreground">{children}</p>
}

function BreakdownRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string | null
  strong?: boolean
}) {
  if (value === null) {
    return null
  }

  return (
    <div className="flex items-baseline justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? 'font-semibold tabular-nums text-foreground'
            : 'font-medium tabular-nums text-foreground'
        }
      >
        {value}
      </span>
    </div>
  )
}

function TokenGlyph({
  symbol,
  tone,
  value,
}: {
  symbol: React.ReactNode
  tone: 'input' | 'output' | 'cache'
  value: number
}) {
  const toneClass =
    tone === 'input'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'output'
        ? 'text-sky-600 dark:text-sky-400'
        : 'text-orange-500 dark:text-orange-400'

  return (
    <div
      className="flex items-center gap-1"
      aria-hidden
    >
      <span
        aria-hidden
        className={`inline-flex h-3.5 w-3 shrink-0 items-center justify-center text-[13px] font-semibold leading-none ${toneClass}`}
      >
        {symbol}
      </span>
      <span className="font-medium text-foreground">
        {formatUsageCompactCount(value)}
      </span>
    </div>
  )
}
