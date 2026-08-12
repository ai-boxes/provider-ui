import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatUsageCount } from '@/features/usage/usage-format'

export function UsageRequestsPagination({
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
