import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  ChartNoAxesColumnIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  DatabaseZapIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiKeysQueryOptions } from '@/features/api-keys/api-keys-query'
import {
  formatCacheHitRate,
  formatUsageCompactCount,
  formatUsageCost,
  formatUsageCostDetailed,
  formatUsageWindowCost,
  formatUsagePrice,
  formatUsageCount,
  formatUsageDateTime,
  formatUsageLatencyMs,
  elapsedLatencyMs,
  formatUsageRange,
  totalLatencyMs,
} from '@/features/usage/usage-format'
import {
  usageFilterOptionsQueryOptions,
  usageOverviewQueryOptions,
  usageRequestDetailQueryOptions,
  usageRequestsQueryOptions,
  type UsageFilterState,
} from '@/features/usage/usage-query'
import type {
  UsageOverview as UsageOverviewData,
  UsageCostTotals,
  UsageRequestSummary,
  UsageRequestDetail,
  UsageTokenTotals,
  UsageRange,
  UsageWindowId,
} from '@/features/usage/usage-types'
import {
  defaultUsageWindow,
  currentUsageRange,
  parseUsageWindow,
  usageWindows,
} from '@/features/usage/usage-window'

export function UsageOverview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const windowId = parseUsageWindow(searchParams.get('window'))
  const apiKeyId = searchParams.get('key')
  const modelFilter = searchParams.get('model') ?? ''
  const groupFilter = searchParams.get('group') ?? ''
  const [rangeRevision, setRangeRevision] = useState(0)
  const range = useMemo(() => {
    void rangeRevision
    return currentUsageRange(windowId)
  }, [windowId, rangeRevision])
  const listFilters: UsageFilterState = {
    apiKeyId: apiKeyId && apiKeyId.trim() ? apiKeyId : null,
    model: modelFilter.trim() || null,
    groupLabel: groupFilter.trim() || null,
  }

  // Cursor stack lets keyset pages walk backward without offset queries.
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null])
  const [pageIndex, setPageIndex] = useState(0)
  const pageCursor = pageCursors[pageIndex] ?? null

  const apiKeys = useQuery(apiKeysQueryOptions)
  const filterOptions = useQuery(usageFilterOptionsQueryOptions(range))

  // The summary is time-scoped only. Key filtering is reserved for the request list.
  const overview = useQuery(usageOverviewQueryOptions(range))
  const requests = useQuery(
    usageRequestsQueryOptions(range, listFilters, pageCursor),
  )

  useEffect(() => {
    setPageCursors([null])
    setPageIndex(0)
  }, [range.fromMs, range.toMs, listFilters.apiKeyId, modelFilter, groupFilter])

  function patchParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams)
    mutate(params)
    setSearchParams(params, { replace: true })
  }

  function selectWindow(next: UsageWindowId) {
    patchParams((params) => {
      if (next === defaultUsageWindow) {
        params.delete('window')
      } else {
        params.set('window', next)
      }
    })
  }

  function selectApiKey(next: string) {
    patchParams((params) => {
      if (!next) {
        params.delete('key')
      } else {
        params.set('key', next)
      }
    })
  }

  function selectModel(next: string) {
    patchParams((params) => {
      if (!next) {
        params.delete('model')
      } else {
        params.set('model', next)
      }
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

  const isFetching = overview.isFetching || requests.isFetching

  const requestItems = requests.data?.requests ?? []
  const modelOptions = filterOptions.data?.models ?? []
  const groupOptions = filterOptions.data?.groups ?? []

  const nextCursor = requests.data?.nextCursor ?? null
  const canGoPrevious = pageIndex > 0
  const canGoNext = Boolean(nextCursor)

  function goPreviousPage() {
    if (!canGoPrevious) {
      return
    }
    setPageIndex((current) => Math.max(0, current - 1))
  }

  function goNextPage() {
    if (!nextCursor) {
      return
    }
    setPageCursors((current) => {
      const head = current.slice(0, pageIndex + 1)
      return [...head, nextCursor]
    })
    setPageIndex((current) => current + 1)
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Usage"
        description={
          overview.data
            ? `Track requests, tokens, cost, and upstream performance · ${formatUsageRange(overview.data.fromMs, overview.data.toMs)}`
            : 'Track requests, token consumption, cost, and upstream performance.'
        }
        actions={
          <>
          <UsageWindowSelector value={windowId} onSelect={selectWindow} />
          <Button
            variant="outline"
            size="icon"
            disabled={isFetching}
            aria-label="Refresh usage"
            title="Refresh usage"
            onClick={() => {
              setRangeRevision((current) => current + 1)
              void apiKeys.refetch()
            }}
          >
            <RefreshCwIcon className={isFetching ? 'animate-spin' : undefined} />
          </Button>
          </>
        }
      />

      {overview.isPending ? <UsageOverviewLoading /> : null}
      {overview.isError ? (
        <UsageOverviewError onRetry={() => void overview.refetch()} />
      ) : null}
      {overview.data ? <UsageSummary overview={overview.data} /> : null}

      {overview.data ? (
        <UsageSection title="Requests">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <NativeSelect
                  aria-label="API key filter"
                  className="h-8 w-44"
                  value={listFilters.apiKeyId ?? ''}
                  onChange={(event) => selectApiKey(event.target.value)}
                >
                  <NativeSelectOption value="">API Key</NativeSelectOption>
                  {(apiKeys.data ?? []).map((apiKey) => (
                    <NativeSelectOption key={apiKey.id} value={apiKey.id}>
                      {apiKey.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Model filter"
                  className="h-8 w-48"
                  value={modelFilter}
                  onChange={(event) => selectModel(event.target.value)}
                  disabled={filterOptions.isPending}
                >
                  <NativeSelectOption value="">Model</NativeSelectOption>
                  {modelOptions.map((model) => (
                    <NativeSelectOption key={model} value={model}>
                      {model}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Group filter"
                  className="h-8 w-40"
                  value={groupFilter}
                  onChange={(event) => selectGroup(event.target.value)}
                  disabled={filterOptions.isPending}
                >
                  <NativeSelectOption value="">Group</NativeSelectOption>
                  {groupOptions.map((group) => (
                    <NativeSelectOption key={group} value={group}>
                      {group}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
            </div>

            {requests.isPending ? <UsageTableSkeleton rows={6} cols={8} /> : null}
            {requests.isError ? (
              <UsageInlineError onRetry={() => void requests.refetch()} />
            ) : null}
            {requests.data ? (
              <>
                <UsageRequestsTable
                  items={requestItems}
                  range={range}
                />
                <UsageRequestsPagination
                  pageIndex={pageIndex}
                  pageSize={requests.data.pageSize}
                  itemCount={requestItems.length}
                  canGoPrevious={canGoPrevious}
                  canGoNext={canGoNext}
                  isFetching={requests.isFetching}
                  onPrevious={goPreviousPage}
                  onNext={goNextPage}
                />
              </>
            ) : null}
          </div>
        </UsageSection>
      ) : null}
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
      className="flex items-center gap-1 rounded-xl border border-border/80 bg-card p-1 shadow-xs"
    >
      {usageWindows.map((window) => (
        <Button
          key={window.id}
          size="sm"
          variant={window.id === value ? 'secondary' : 'ghost'}
          aria-pressed={window.id === value}
          title={window.label}
          className="px-3 text-xs"
          onClick={() => onSelect(window.id)}
        >
          {window.short}
        </Button>
      ))}
    </div>
  )
}

function UsageSummary({ overview }: { overview: UsageOverviewData }) {
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
        value={formatUsageCount(tokens.effectiveInput)}
      />
      <UsageStat
        label="Output tokens"
        value={formatUsageCount(tokens.output)}
      />
      <UsageStat label="Window cost" value={windowCost} />
      <UsageStat label="Cache hit rate" value={formatCacheHitRate(cache)} />
    </div>
  )
}

function UsageRequestsTable({
  items,
  range,
}: {
  items: UsageRequestSummary[]
  range: UsageRange
}) {
  if (items.length === 0) {
    return <UsagePanelEmpty text="No requests match the current filters." />
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">API Key</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Reasoning effort</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Latency</TableHead>
            <TableHead className="pr-4">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const meta = resolveApiKeyMeta(item)
            return (
              <TableRow key={item.requestId}>
                <TableCell className="max-w-36 truncate pl-4 font-medium">
                  {meta.name}
                </TableCell>
                <TableCell className="max-w-44 truncate font-mono text-xs">
                  {item.clientModel ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.reasoningEffort ?? '—'}
                </TableCell>
                <TableCell className="max-w-32 truncate text-muted-foreground">
                  {meta.group}
                </TableCell>
                <TableCell>
                  <TokensBreakdown tokens={item.tokens} />
                </TableCell>
                <TableCell className="tabular-nums">
                  <CostBreakdown
                    requestId={item.requestId}
                    cost={item.cost}
                    range={range}
                  />
                </TableCell>
                <TableCell>
                  <LatencyBreakdown
                    startedAtMs={item.startedAtMs}
                    firstTokenAtMs={item.firstTokenAtMs}
                    completedAtMs={item.completedAtMs}
                  />
                </TableCell>
                <TableCell className="pr-4 whitespace-nowrap text-muted-foreground">
                  {formatUsageDateTime(item.startedAtMs)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function TokensBreakdown({ tokens }: { tokens: UsageTokenTotals }) {
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

function CostBreakdown({
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
            ? '—'
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

function formatOptionalCost(value: string | null): string {
  return value === null ? '—' : formatUsageCostDetailed(value)
}

function formatOptionalPrice(value: string | null): string {
  return value === null ? '—' : formatUsagePrice(value)
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
  value: string
  strong?: boolean
}) {
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

function LatencyBreakdown({
  startedAtMs,
  firstTokenAtMs,
  completedAtMs,
}: {
  startedAtMs: number
  firstTokenAtMs: number | null
  completedAtMs: number
}) {
  const firstTokenMs = elapsedLatencyMs(startedAtMs, firstTokenAtMs)
  const totalMs = totalLatencyMs(startedAtMs, completedAtMs)

  return (
    <div className="flex w-fit items-stretch gap-1.5">
      <LatencyVerticalBar ms={totalMs} />
      <div className="space-y-0.5 text-xs leading-4 tabular-nums">
        <span className="block font-medium text-foreground">
          {formatUsageLatencyMs(firstTokenMs)}
        </span>
        <span className="block font-medium text-foreground">
          {formatUsageLatencyMs(totalMs)}
        </span>
      </div>
    </div>
  )
}

// Vertical strip: green = fast, yellow = slow. Color is continuous on a
// 0–10s scale; missing totals stay muted instead of pretending to be zero.
const LATENCY_BAR_FULL_MS = 10_000

function LatencyVerticalBar({ ms }: { ms: number | null }) {
  const color =
    ms === null
      ? 'var(--muted-foreground)'
      : latencyTone(Math.max(0, Math.min(1, ms / LATENCY_BAR_FULL_MS)))

  return (
    <div
      aria-hidden
      title={ms === null ? undefined : formatUsageLatencyMs(ms)}
      className="w-1.5 shrink-0 self-stretch rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

function latencyTone(ratio: number): string {
  // 0 → green, 0.5 → lime/yellow, 1 → amber/yellow
  const hue = 145 - ratio * 70
  const chroma = 0.14 + ratio * 0.04
  const lightness = 0.72 + ratio * 0.06
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`
}

function UsageRequestsPagination({
  pageIndex,
  pageSize,
  itemCount,
  canGoPrevious,
  canGoNext,
  isFetching,
  onPrevious,
  onNext,
}: {
  pageIndex: number
  pageSize: number
  itemCount: number
  canGoPrevious: boolean
  canGoNext: boolean
  isFetching: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  const from = itemCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = pageIndex * pageSize + itemCount

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {formatUsageCount(from)}–{formatUsageCount(to)}
        {' · '}
        {formatUsageCount(pageSize)} per page
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canGoPrevious || isFetching}
          aria-label="Previous page"
          title="Previous page"
          onClick={onPrevious}
        >
          <ChevronLeftIcon />
        </Button>
        <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
          Page {pageIndex + 1}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canGoNext || isFetching}
          aria-label="Next page"
          title="Next page"
          onClick={onNext}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}

function resolveApiKeyMeta(item: UsageRequestSummary): {
  name: string
  group: string
} {
  if (item.apiKeyId === null) {
    return { name: 'No key', group: '—' }
  }

  return {
    name: item.apiKeyLabel ?? '—',
    group: item.apiKeyGroupLabel ?? '—',
  }
}

function UsageSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="grid min-w-0 gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  )
}

function UsagePanelEmpty({ text }: { text: string }) {
  return <Card className="p-4 text-sm text-muted-foreground">{text}</Card>
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

function UsageTableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <Card className="gap-3 p-4">
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: cols }, (_, col) => (
            <Skeleton key={col} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </Card>
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

function UsageInlineError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert>
      <CircleAlertIcon />
      <AlertTitle>Unable to load this section</AlertTitle>
      <AlertDescription>Try again in a moment.</AlertDescription>
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
