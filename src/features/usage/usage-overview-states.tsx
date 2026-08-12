import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function UsageTableSkeleton({
  rows,
  cols,
}: {
  rows: number
  cols: number
}) {
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

export function UsageOverviewError({
  busy,
  onRetry,
}: {
  busy: boolean
  onRetry: () => void
}) {
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
        disabled={busy}
        onClick={onRetry}
      >
        <RefreshCwIcon className={busy ? 'animate-spin' : undefined} />
        {busy ? 'Retrying…' : 'Retry'}
      </Button>
    </Alert>
  )
}

export function UsageInlineError({
  busy,
  onRetry,
}: {
  busy: boolean
  onRetry: () => void
}) {
  return (
    <Alert>
      <CircleAlertIcon />
      <AlertTitle>Unable to load this section</AlertTitle>
      <AlertDescription>Try again in a moment.</AlertDescription>
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
