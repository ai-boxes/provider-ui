import { useQuery } from '@tanstack/react-query'
import { RefreshCwIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { apiKeysQueryOptions } from '@/features/api-keys/api-keys-query'
import { formatUsageRange } from '@/features/usage/usage-format'
import {
  UsageInlineError,
  UsageOverviewError,
  UsageTableSkeleton,
} from '@/features/usage/usage-overview-states'
import { UsageRequestsPagination } from '@/features/usage/usage-pagination'
import { UsageRequestFilters } from '@/features/usage/usage-request-filters'
import { UsageRequestsTable } from '@/features/usage/usage-request-table'
import {
  usageFilterOptionsQueryOptions,
  usageOverviewQueryOptions,
  usageRequestsQueryOptions,
  type UsageFilterState,
} from '@/features/usage/usage-query'
import {
  UsageOverviewLoading,
  UsageSummary,
} from '@/features/usage/usage-summary'
import type { UsageWindowId } from '@/features/usage/usage-types'
import {
  currentUsageRange,
  defaultUsageWindow,
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

  const nextCursor = requests.data?.nextCursor ?? null
  const canGoPrevious = pageIndex > 0
  const canGoNext = Boolean(nextCursor)
  const overviewContent = overview.isPending ? (
    <UsageOverviewLoading />
  ) : overview.isError ? (
    <UsageOverviewError
      busy={overview.isFetching}
      onRetry={() => void overview.refetch()}
    />
  ) : (
    <UsageSummary overview={overview.data} />
  )
  const requestContent = requests.isPending ? (
    <UsageTableSkeleton rows={6} cols={8} />
  ) : requests.isError ? (
    <UsageInlineError
      busy={requests.isFetching}
      onRetry={() => void requests.refetch()}
    />
  ) : (
    <>
      <UsageRequestsTable items={requestItems} range={range} />
      {requestItems.length > 0 ? (
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
      ) : null}
    </>
  )

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

      {overviewContent}

      {overview.isSuccess ? (
        <UsageSection title="Requests">
          <div className="flex min-w-0 flex-col gap-3">
            <UsageRequestFilters
              apiKeyId={listFilters.apiKeyId ?? ''}
              model={modelFilter}
              group={groupFilter}
              apiKeys={apiKeys}
              filterOptions={filterOptions}
              onSelectApiKey={selectApiKey}
              onSelectModel={selectModel}
              onSelectGroup={selectGroup}
            />

            {requestContent}
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
