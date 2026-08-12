import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  BoxIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  KeyRoundIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
  Share2Icon,
  UserRoundIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ProviderAccountActions,
  ProviderEnabledControl,
} from '@/features/providers/provider-account-management'
import {
  ProviderModelEditDialog,
  ProviderModelRefreshControl,
} from '@/features/providers/provider-model-management'
import { formatProviderModelInputModalities } from '@/features/providers/provider-model-modalities'
import { formatProviderKind } from '@/features/providers/provider-format'
import {
  ProviderHealthCard,
} from '@/features/providers/provider-health'
import { ProviderQuotaCard } from '@/features/providers/provider-quota'
import {
  providerModelsQueryOptions,
  providerHealthQueryOptions,
  providerQueryOptions,
} from '@/features/providers/providers-query'
import type {
  ProviderAccount,
  ProviderCredentialKind,
  ProviderModel,
} from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'
import { cn } from '@/lib/utils'
import { formatUnixSeconds } from '@/lib/datetime'


export function ProviderDetail({
  accountId,
  currentUserId,
}: {
  accountId: string
  currentUserId: string
}) {
  const account = useQuery(providerQueryOptions(accountId))
  const providerHealth = useQuery(providerHealthQueryOptions())
  const models = useQuery({
    ...providerModelsQueryOptions(accountId),
    enabled: account.isSuccess,
  })

  if (account.isPending) {
    return <ProviderDetailLoading />
  }

  if (account.isError) {
    return (
      <ProviderDetailError
        error={account.error}
        busy={account.isFetching}
        onRetry={() => void account.refetch()}
      />
    )
  }

  const ownedByCurrentUser = account.data.ownerUserId === currentUserId
  const health = providerHealth.data?.accounts.find(
    (item) => item.accountId === accountId,
  ) ?? (providerHealth.isError ? null : undefined)

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="grid gap-4">
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-muted-foreground"
          render={<Link to="/providers" />}
        >
          <ArrowLeftIcon />
          Back to providers
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/45 text-muted-foreground shadow-xs">
              <ServerIcon className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.025em]">
                {account.data.label}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatProviderKind(account.data.provider)} Provider account
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccountStatusBadge account={account.data} />
            {ownedByCurrentUser ? (
              <ProviderAccountActions account={account.data} />
            ) : null}
          </div>
        </div>
      </div>

      {!ownedByCurrentUser ? (
        <Alert>
          <LockKeyholeIcon />
          <AlertTitle>Shared Provider</AlertTitle>
          <AlertDescription>
            You can view and use this Provider, but only its owner can change
            the account or Models.
          </AlertDescription>
        </Alert>
      ) : null}

      {account.data.authState === 'reauth_required' ? (
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>Reauthentication required</AlertTitle>
          <AlertDescription>
            This Provider credential is no longer valid. Update or replace its
            credential before routing traffic through this account.
          </AlertDescription>
        </Alert>
      ) : null}

      <ProviderOverview
        account={account.data}
        ownedByCurrentUser={ownedByCurrentUser}
      />
      <ProviderHealthCard health={health} />
      <ProviderQuotaCard accountId={accountId} />
      <ProviderModels
        models={models.data}
        pending={models.isPending}
        fetching={models.isFetching}
        error={models.error}
        accountId={accountId}
        canManage={ownedByCurrentUser}
        onRetry={() => void models.refetch()}
      />
    </section>
  )
}

function ProviderOverview({
  account,
  ownedByCurrentUser,
}: {
  account: ProviderAccount
  ownedByCurrentUser: boolean
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Overview</CardTitle>
        <CardDescription>
          Connection, access, and runtime settings for this Provider account.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Provider">
          {formatProviderKind(account.provider)}
        </DetailField>
        <DetailField label="Access">
          <span className="flex items-center gap-1.5">
            {account.visibility === 'shared' ? (
              <Share2Icon className="size-3.5 text-muted-foreground" />
            ) : (
              <LockKeyholeIcon className="size-3.5 text-muted-foreground" />
            )}
            {account.visibility === 'shared' ? 'Shared' : 'Private'}
          </span>
        </DetailField>
        <DetailField label="Ownership">
          <span className="flex items-center gap-1.5">
            <UserRoundIcon className="size-3.5 text-muted-foreground" />
            {ownedByCurrentUser ? 'Owned by you' : 'Shared with you'}
          </span>
        </DetailField>
        <DetailField label="Credential">
          <span className="flex items-center gap-1.5">
            <KeyRoundIcon className="size-3.5 text-muted-foreground" />
            {formatCredentialKind(account.credentialKind)}
          </span>
        </DetailField>
        <DetailField label="Priority">
          <span className="tabular-nums">{account.priority}</span>
        </DetailField>
        <DetailField label="Enabled">
          {ownedByCurrentUser ? (
            <ProviderEnabledControl account={account} />
          ) : account.enabled ? (
            'Yes'
          ) : (
            'No'
          )}
        </DetailField>
        <DetailField label="Authentication">
          {account.authState === 'active' ? 'Active' : 'Reauthentication required'}
        </DetailField>
        {account.baseUrl ? (
          <DetailField label="Base URL" className="sm:col-span-2">
            <span className="break-all font-mono text-xs">
              {account.baseUrl}
            </span>
          </DetailField>
        ) : null}
        <DetailField label="Created">
          {formatTimestamp(account.createdAt)}
        </DetailField>
        <DetailField label="Updated">
          {formatTimestamp(account.updatedAt)}
        </DetailField>
        {account.safeErrorCode ? (
          <DetailField label="Error code">
            <code className="font-mono text-xs">{account.safeErrorCode}</code>
          </DetailField>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ProviderModels({
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
            <CardDescription>
              Models currently discovered for this Provider account.
            </CardDescription>
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

function ModelPricingSummary({ model }: { model: ProviderModel }) {
  const pricing = model.pricing
  if (!pricing) {
    return <span className="text-xs text-muted-foreground">Not configured</span>
  }
  const summary = <PricingComponents pricing={pricing} />

  if (pricing.tiers.length === 0) {
    return summary
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            className="rounded-md text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Pricing tiers for ${model.upstreamModel}`}
          />
        }
      >
        {summary}
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72 p-3">
        <p className="text-xs font-semibold text-foreground">Pricing tiers</p>
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
          USD per 1M tokens
        </p>
        <PricingTier label="Base" pricing={pricing} />
        {pricing.tiers.map((tier) => (
          <PricingTier
            key={tier.thresholdTokens}
            label={`Above ${formatTokenThreshold(tier.thresholdTokens)} context tokens`}
            pricing={tier}
          />
        ))}
      </HoverCardContent>
    </HoverCard>
  )
}

type PriceComponents = Pick<
  NonNullable<ProviderModel['pricing']>,
  | 'input'
  | 'output'
  | 'cacheRead'
  | 'cacheWrite'
  | 'reasoning'
  | 'inputAudio'
  | 'outputAudio'
>

function PricingComponents({ pricing }: { pricing: PriceComponents }) {
  const components = pricingComponents(pricing)

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {components.map(([label, value]) => (
        <span key={label} className="whitespace-nowrap text-muted-foreground">
          {label}{' '}
          <span className="font-medium tabular-nums text-foreground">
            ${trimPrice(value)}
          </span>
        </span>
      ))}
    </div>
  )
}

function PricingTier({
  label,
  pricing,
}: {
  label: string
  pricing: PriceComponents
}) {
  const components = pricingComponents(pricing)

  return (
    <div className="mt-2 border-t pt-2">
      <p className="mb-1.5 text-[0.7rem] font-medium text-foreground">{label}</p>
      <div className="grid gap-1">
        {components.map(([component, value]) => (
          <div
            key={component}
            className="flex items-baseline justify-between gap-4 text-xs"
          >
            <span className="text-muted-foreground">{component}</span>
            <span className="font-medium tabular-nums text-foreground">
              ${trimPrice(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function pricingComponents(pricing: PriceComponents): [string, string][] {
  return [
    ['Input', pricing.input],
    ['Output', pricing.output],
    ['Cache read', pricing.cacheRead],
    ['Cache write', pricing.cacheWrite],
    ['Reasoning', pricing.reasoning],
    ['Input audio', pricing.inputAudio],
    ['Output audio', pricing.outputAudio],
  ].filter((entry): entry is [string, string] => entry[1] !== null)
}

function formatTokenThreshold(value: number): string {
  if (value >= 1_000_000 && value % 1_000_000 === 0) {
    return `${value / 1_000_000}M`
  }
  if (value >= 1_000 && value % 1_000 === 0) {
    return `${value / 1_000}K`
  }
  return new Intl.NumberFormat('en-US').format(value)
}

function trimPrice(value: string): string {
  if (!value.includes('.')) return value
  return value.replace(/0+$/, '').replace(/\.$/, '')
}

function DetailField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function AccountStatusBadge({ account }: { account: ProviderAccount }) {
  if (account.authState === 'reauth_required') {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
      >
        <CircleAlertIcon />
        Reauthentication required
      </Badge>
    )
  }

  if (account.enabled) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <CircleCheckIcon />
        Activated
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <CircleOffIcon />
      Disabled
    </Badge>
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

function ProviderDetailLoading() {
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

function ProviderDetailError({
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
              ? 'This Provider does not exist or is not visible to the current user.'
              : 'Check the server connection and try again.'}
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
          The Provider account loaded, but its model catalog could not be read.
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
        <EmptyDescription>
          This Provider account does not currently have any stored models.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function formatCredentialKind(kind: ProviderCredentialKind): string {
  const labels: Record<ProviderCredentialKind, string> = {
    oauth: 'OAuth',
    api_key: 'API key',
  }

  return labels[kind]
}

function formatTimestamp(timestamp: number): string {
  return formatUnixSeconds(timestamp)
}

function formatModelCount(count: number): string {
  return `${count} ${count === 1 ? 'model' : 'models'}`
}
