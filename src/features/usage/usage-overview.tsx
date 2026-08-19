import { useQuery } from '@tanstack/react-query'
import { RefreshCwIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { PageHeader } from '@/components/layout/page-header'
import { TimeRangeSelector } from '@/components/filters/time-range-selector'
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
import {
  applyTimeRangeParams,
  currentTimeRange,
  rememberSharedTimeRangeSelection,
  resolveTimeRangeSelection,
  type TimeRangeSelection,
} from '@/features/time-range/time-range'

export function UsageOverview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsKey = searchParams.toString()
  const timeRange = useMemo(
    () => resolveTimeRangeSelection(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  )
  const apiKeyId = searchParams.get('key')
  const modelFilter = searchParams.get('model') ?? ''
  const groupFilter = searchParams.get('group') ?? ''
  const [rangeRevision, setRangeRevision] = useState(0)
  const range = useMemo(() => {
    void rangeRevision
    return currentTimeRange(timeRange)
  }, [rangeRevision, timeRange])
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

  const overview = useQuery(usageOverviewQueryOptions(range, listFilters))
  const requests = useQuery(
    usageRequestsQueryOptions(range, listFilters, pageCursor),
  )

  useEffect(() => {
    rememberSharedTimeRangeSelection(timeRange)
  }, [timeRange])

  useEffect(() => {
    setPageCursors([null])
    setPageIndex(0)
  }, [range.fromMs, range.toMs, listFilters.apiKeyId, modelFilter, groupFilter])

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
    <UsageTableSkeleton rows={6} cols={10} />
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
          total={requests.data.total}
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
            ? formatUsageRange(overview.data.fromMs, overview.data.toMs)
            : 'Requests, tokens, cost, and performance.'
        }
        actions={
          <>
            <TimeRangeSelector value={timeRange} onChange={selectTimeRange} />
            <Button
              variant="outline"
              size="icon-sm"
              disabled={isFetching}
              aria-label="Refresh usage"
              title="Refresh usage"
              onClick={() => {
                setRangeRevision((current) => current + 1)
                if (timeRange.kind === 'custom') {
                  void Promise.all([
                    filterOptions.refetch(),
                    overview.refetch(),
                    requests.refetch(),
                  ])
                }
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
