import { useQuery } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  CircleCheckIcon,
  Clock3Icon,
  KeyRoundIcon,
  RefreshCwIcon,
  ShieldOffIcon,
  WalletCardsIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ApiKeyActions,
  ApiKeyRevealDialog,
} from '@/features/api-keys/api-key-actions'
import { ApiKeyCreateDialog } from '@/features/api-keys/api-key-create'
import {
  formatApiKeyDate,
  formatApiKeyDateTime,
  getApiKeyStatus,
  type ApiKeyStatus,
} from '@/features/api-keys/api-key-format'
import { apiKeysQueryOptions } from '@/features/api-keys/api-keys-query'
import type { ApiKeySummary } from '@/features/api-keys/api-key-types'
import {
  availableProviderGroups,
  type ProviderGroupCatalog,
} from '@/features/api-keys/provider-group-options'
import { providersQueryOptions } from '@/features/providers/providers-query'
import { formatUsageCost } from '@/features/usage/usage-format'
import { useMinuteNow } from '@/hooks/use-minute-now'

export function ApiKeyList() {
  const apiKeys = useQuery(apiKeysQueryOptions)
  const providers = useQuery(providersQueryOptions)
  const now = useMinuteNow()
  const providerGroups: ProviderGroupCatalog = {
    values: availableProviderGroups(providers.data ?? []),
    status: providers.isPending
      ? 'loading'
      : providers.isError
        ? 'error'
        : 'ready',
    refreshing: providers.isFetching,
    retry: () => void providers.refetch(),
  }
  const content = apiKeys.isPending ? (
    <ApiKeyListLoading />
  ) : apiKeys.isError ? (
    <ApiKeyListError
      busy={apiKeys.isFetching}
      onRetry={() => void apiKeys.refetch()}
    />
  ) : apiKeys.data.length === 0 ? (
    <ApiKeyListEmpty />
  ) : (
    <ApiKeyCollection
      apiKeys={apiKeys.data}
      now={now}
      providerGroups={providerGroups}
    />
  )

  return (
    <section className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="API keys"
        description="Issue scoped credentials and monitor expiration, spending limits, and access status."
        actions={<ApiKeyCreateDialog providerGroups={providerGroups} />}
      />
      {content}
    </section>
  )
}

function ApiKeyCollection({
  apiKeys,
  now,
  providerGroups,
}: {
  apiKeys: ApiKeySummary[]
  now: number
  providerGroups: ProviderGroupCatalog
}) {
  return (
    <>
      <Card className="hidden gap-0 py-0 lg:flex">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/55 hover:bg-muted/55">
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-16 pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((apiKey) => (
              <ApiKeyTableRow
                key={apiKey.id}
                apiKey={apiKey}
                now={now}
                providerGroups={providerGroups}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 lg:hidden">
        {apiKeys.map((apiKey) => (
          <ApiKeyCard
            key={apiKey.id}
            apiKey={apiKey}
            now={now}
            providerGroups={providerGroups}
          />
        ))}
      </div>
    </>
  )
}

function ApiKeyTableRow({
  apiKey,
  now,
  providerGroups,
}: {
  apiKey: ApiKeySummary
  now: number
  providerGroups: ProviderGroupCatalog
}) {
  return (
    <TableRow>
      <TableCell className="py-4 pl-4">
        <span className="font-medium">{apiKey.label}</span>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <code className="max-w-44 truncate font-mono text-xs tracking-wide text-muted-foreground">
            {apiKey.maskedKey}
          </code>
          <ApiKeyRevealDialog apiKey={apiKey} />
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {apiKey.groupLabel}
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {formatUsage(apiKey)}
      </TableCell>
      <TableCell>
        <ExpirationSummary apiKey={apiKey} now={now} />
      </TableCell>
      <TableCell>
        <ApiKeyStatusBadge apiKey={apiKey} now={now} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatApiKeyDate(apiKey.createdAt)}
      </TableCell>
      <TableCell className="pr-4">
        <div className="flex justify-end">
          <ApiKeyActions
            apiKey={apiKey}
            now={now}
            providerGroups={providerGroups}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

function ApiKeyCard({
  apiKey,
  now,
  providerGroups,
}: {
  apiKey: ApiKeySummary
  now: number
  providerGroups: ProviderGroupCatalog
}) {
  return (
    <Card className="gap-4 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className="font-medium">{apiKey.label}</span>
          <ApiKeyStatusBadge apiKey={apiKey} now={now} />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <code className="min-w-0 flex-1 truncate font-mono text-xs tracking-wide text-muted-foreground">
            {apiKey.maskedKey}
          </code>
          <ApiKeyRevealDialog apiKey={apiKey} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t pt-4 text-sm">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Group</span>
          <span className="text-muted-foreground">
            {apiKey.groupLabel}
          </span>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Usage</span>
          <span className="text-muted-foreground tabular-nums">
            {formatUsage(apiKey)}
          </span>
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Expires</span>
          <ExpirationSummary apiKey={apiKey} now={now} />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Created</span>
          <span className="text-muted-foreground">
            {formatApiKeyDate(apiKey.createdAt)}
          </span>
        </div>
      </div>

      <div className="border-t pt-4">
        <ApiKeyActions
          apiKey={apiKey}
          now={now}
          providerGroups={providerGroups}
        />
      </div>
    </Card>
  )
}

function ExpirationSummary({
  apiKey,
  now,
}: {
  apiKey: ApiKeySummary
  now: number
}) {
  if (apiKey.expiresAt === null) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock3Icon className="size-3.5" />
        Never
      </span>
    )
  }

  const expired = apiKey.expiresAt <= now

  return (
    <span
      className={
        expired
          ? 'flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300'
          : 'flex items-center gap-1.5 text-sm text-muted-foreground'
      }
      title={formatApiKeyDateTime(apiKey.expiresAt)}
    >
      <Clock3Icon className="size-3.5" />
      {expired ? 'Expired' : formatApiKeyDate(apiKey.expiresAt)}
    </span>
  )
}

function ApiKeyStatusBadge({
  apiKey,
  now,
}: {
  apiKey: ApiKeySummary
  now: number
}) {
  const status = getApiKeyStatus(apiKey, now)
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={config.className}>
      <Icon />
      {config.label}
    </Badge>
  )
}

const statusConfig: Record<
  ApiKeyStatus,
  { label: string; icon: typeof CircleCheckIcon; className: string }
> = {
  active: {
    label: 'Active',
    icon: CircleCheckIcon,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  disabled: {
    label: 'Disabled',
    icon: ShieldOffIcon,
    className: 'bg-background text-muted-foreground',
  },
  expired: {
    label: 'Expired',
    icon: Clock3Icon,
    className:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  },
  exhausted: {
    label: 'Quota exhausted',
    icon: WalletCardsIcon,
    className:
      'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
  },
}

function ApiKeyListLoading() {
  return (
    <>
      <Card className="hidden gap-0 py-0 lg:flex">
        <div className="grid grid-cols-7 gap-4 border-b bg-muted/35 px-4 py-3">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-7 items-center gap-4 border-b px-4 py-4 last:border-b-0"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </Card>

      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="gap-4 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              {Array.from({ length: 4 }, (_, fieldIndex) => (
                <div key={fieldIndex} className="grid gap-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

function ApiKeyListError({
  busy,
  onRetry,
}: {
  busy: boolean
  onRetry: () => void
}) {
  return (
    <Alert className="max-w-2xl">
      <CircleAlertIcon />
      <AlertTitle>Unable to load API keys</AlertTitle>
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

function ApiKeyListEmpty() {
  return (
    <Card className="min-h-80 justify-center">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-10 rounded-xl">
            <KeyRoundIcon />
          </EmptyMedia>
          <EmptyTitle>No API keys yet</EmptyTitle>
          <EmptyDescription>
            Create a credential before connecting Codex, Claude, or another API client.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  )
}

function formatUsage(apiKey: {
  quotaLimitUsd: string | null
  spentUsd: string
}): string {
  if (!apiKey.quotaLimitUsd) {
    return `${formatUsageCost(apiKey.spentUsd)} / ∞`
  }
  return `${formatUsageCost(apiKey.spentUsd)} / ${formatUsageCost(apiKey.quotaLimitUsd)}`
}
