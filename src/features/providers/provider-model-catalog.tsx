import {
  BoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  Clock3Icon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProviderModelEditDialog } from '@/features/providers/provider-model-edit'
import { ProviderModelRefreshControl } from '@/features/providers/provider-model-refresh'
import { formatProviderModelInputModalities } from '@/features/providers/provider-model-modalities'
import type { ProviderModel } from '@/features/providers/provider-types'
import { ModelPricingSummary } from '@/features/providers/provider-model-pricing.tsx'
import { formatUnixSeconds } from '@/lib/datetime'

function formatTimestamp(timestamp: number): string {
  return formatUnixSeconds(timestamp)
}

export function ProviderModels({
  models,
  pending,
  fetching,
  error,
  accountId,
  canManage,
  onRetry,
}: {
  models: ProviderModel[] | undefined
  pending: boolean
  fetching: boolean
  error: unknown
  accountId: string
  canManage: boolean
  onRetry: () => void
}) {
  const content = pending ? (
    <ModelsLoading />
  ) : error ? (
    <ModelsError busy={fetching} onRetry={onRetry} />
  ) : models?.length === 0 ? (
    <ModelsEmpty />
  ) : models ? (
    <ModelsTable models={models} accountId={accountId} canManage={canManage} />
  ) : null

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle>Models</CardTitle>
            <CardDescription>Discovered models.</CardDescription>
          </div>
          <div className="flex flex-wrap items-start justify-end gap-2">
            {canManage ? (
              <ProviderModelRefreshControl accountId={accountId} />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {content}
      </CardContent>
    </Card>
  )
}

function ModelsTable({
  models,
  accountId,
  canManage,
}: {
  models: ProviderModel[]
  accountId: string
  canManage: boolean
}) {
  const [query, setQuery] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredModels = useMemo(
    () =>
      normalizedQuery
        ? models.filter((model) =>
            [model.effectiveModel, model.upstreamModel, model.alias ?? ''].some(
              (value) => value.toLocaleLowerCase().includes(normalizedQuery),
            ),
          )
        : models,
    [models, normalizedQuery],
  )
  const pageSize = 15
  const pageCount = Math.max(1, Math.ceil(filteredModels.length / pageSize))
  const currentPage = Math.min(pageIndex, pageCount - 1)
  const visibleModels = filteredModels.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  )

  return (
    <>
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPageIndex(0)
            }}
            placeholder="Search models"
            aria-label="Search models"
            className="pl-9"
          />
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {normalizedQuery
            ? `${formatModelCount(filteredModels.length)} found`
            : formatModelCount(models.length)}
        </p>
      </div>

      {filteredModels.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm font-medium">No matching models</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different model name or upstream identifier.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/35 hover:bg-muted/35">
                  <TableHead className="pl-4">Model</TableHead>
                  <TableHead>Upstream</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Last seen</TableHead>
                  {canManage ? (
                    <TableHead className="pr-4 text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleModels.map((model) => (
                  <TableRow key={model.upstreamModel}>
                    <TableCell className="py-3.5 pl-4">
                      <div className="grid gap-0.5">
                        <span className="font-medium">
                          {model.effectiveModel}
                        </span>
                        {model.alias ? (
                          <span className="text-xs text-muted-foreground">
                            Alias enabled
                          </span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {formatProviderModelInputModalities(
                            model.inputModalities,
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        {model.upstreamModel}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <ModelPricingSummary model={model} />
                    </TableCell>
                    <TableCell>
                      <ModelStatusBadge model={model} />
                    </TableCell>
                    <TableCell className="pr-4 text-right text-muted-foreground">
                      {model.lastSeenAt
                        ? formatTimestamp(model.lastSeenAt)
                        : 'Never'}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="pr-4 text-right">
                        <div className="flex justify-end gap-2">
                          <ProviderModelEditDialog
                            accountId={accountId}
                            model={model}
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y md:hidden">
            {visibleModels.map((model) => (
              <div key={model.upstreamModel} className="grid gap-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-1">
                    <span className="truncate font-medium">
                      {model.effectiveModel}
                    </span>
                    <code className="truncate font-mono text-xs text-muted-foreground">
                      {model.upstreamModel}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {formatProviderModelInputModalities(
                        model.inputModalities,
                      )}
                    </span>
                  </div>
                  <ModelStatusBadge model={model} />
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3Icon className="size-3" />
                  Last seen{' '}
                  {model.lastSeenAt
                    ? formatTimestamp(model.lastSeenAt)
                    : 'never'}
                </span>
                <ModelPricingSummary model={model} />
                {canManage ? (
                  <div className="flex items-center gap-2">
                    <ProviderModelEditDialog accountId={accountId} model={model} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {currentPage * pageSize + 1}–{Math.min(
                (currentPage + 1) * pageSize,
                filteredModels.length,
              )}{' '}
              of {filteredModels.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={currentPage === 0}
                aria-label="Previous model page"
                title="Previous page"
                onClick={() => setPageIndex(currentPage - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
                Page {currentPage + 1}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={currentPage === pageCount - 1}
                aria-label="Next model page"
                title="Next page"
                onClick={() => setPageIndex(currentPage + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function ModelStatusBadge({ model }: { model: ProviderModel }) {
  if (!model.enabled) {
    return <Badge variant="secondary">Disabled</Badge>
  }

  if (!model.available) {
    return <Badge variant="outline">Unavailable</Badge>
  }

  if (!model.routable) {
    return <Badge variant="outline">Not routable</Badge>
  }

  return (
    <Badge
      variant="outline"
      className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
    >
      Ready
    </Badge>
  )
}

function ModelsLoading() {
  return (
    <div className="grid gap-0">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[2fr_2fr_1fr_1fr] items-center gap-4 border-b px-4 py-3.5 last:border-b-0"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

function ModelsError({
  busy,
  onRetry,
}: {
  busy: boolean
  onRetry: () => void
}) {
  return (
    <div className="p-4">
      <Alert>
        <CircleAlertIcon />
        <AlertTitle>Unable to load models</AlertTitle>
        <AlertDescription>
          The model catalog could not be loaded.
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
    </div>
  )
}

function ModelsEmpty() {
  return (
    <Empty className="min-h-64 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BoxIcon />
        </EmptyMedia>
        <EmptyTitle>No models discovered</EmptyTitle>
        <EmptyDescription>No stored models.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function formatModelCount(count: number): string {
  return `${count} ${count === 1 ? 'model' : 'models'}`
}
