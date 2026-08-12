import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/error'

export function ProviderDetailLoading() {
  return (
    <section className="grid gap-6">
      <Skeleton className="h-7 w-32" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-11" />
        <div className="grid gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="grid gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

export function ProviderDetailError({
  error,
  busy,
  onRetry,
}: {
  error: unknown
  busy: boolean
  onRetry: () => void
}) {
  const notFound = error instanceof ApiError && error.status === 404

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 items-center">
      <Empty className="border bg-card shadow-xs">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>
            {notFound ? 'Provider not found' : 'Unable to load provider'}
          </EmptyTitle>
          <EmptyDescription>
            {notFound
              ? 'The provider does not exist or is not visible.'
              : 'Check the server connection.'}
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex gap-2">
          {!notFound ? (
            <Button variant="outline" disabled={busy} onClick={onRetry}>
              <RefreshCwIcon className={busy ? 'animate-spin' : undefined} />
              {busy ? 'Retrying…' : 'Retry'}
            </Button>
          ) : null}
          <Button nativeButton={false} render={<Link to="/providers" />}>
            Back to providers
          </Button>
        </div>
      </Empty>
    </section>
  )
}
