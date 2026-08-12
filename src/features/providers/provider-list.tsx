import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BoxesIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleOffIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  Share2Icon,
  UserRoundIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

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
import { ProviderEditDialog } from '@/features/providers/provider-account-management'
import { formatProviderKind } from '@/features/providers/provider-format'
import { ProviderQuotaSummary } from '@/features/providers/provider-quota'
import {
  syncQuotaCache,
} from '@/features/providers/provider-quota-cache'
import { shouldAutoFetchProviderQuota } from '@/features/providers/provider-quota-policy'
import {
  providersQueryOptions,
  providerQuotaQueryOptions,
} from '@/features/providers/providers-query'
import type {
  ProviderAccount,
  ProviderAccountWithQuota,
  ProviderCredentialKind,
} from '@/features/providers/provider-types'
import { cn } from '@/lib/utils'
import { formatUnixSeconds } from '@/lib/datetime'

export function ProviderList({ currentUserId }: { currentUserId: string }) {
  const providers = useQuery(providersQueryOptions)
  const content = providers.isPending ? (
    <ProviderListLoading />
  ) : providers.isError ? (
    <ProviderListError
      busy={providers.isFetching}
      onRetry={() => void providers.refetch()}
    />
  ) : providers.data.length === 0 ? (
    <ProviderListEmpty />
  ) : (
    <ProviderAccounts accounts={providers.data} currentUserId={currentUserId} />
  )

  return (
    <section className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Providers"
        description="Connect upstream accounts, review access and health, and keep model availability current."
        actions={
          <Button nativeButton={false} render={<Link to="/providers/new" />}>
            <PlusIcon />
            Add provider
          </Button>
        }
      />

      {content}
    </section>
  )
}

function ProviderAccounts({
  accounts,
  currentUserId,
}: {
  accounts: ProviderAccountWithQuota[]
  currentUserId: string
}) {
  const queryClient = useQueryClient()

  // Auto-check quota for accounts that have none yet, so the list matches the
  // detail page instead of waiting for a manual click. Shares the same React
  // Query key and 30s backend freshness window as the detail page, so a fresh
  // cache is reused rather than re-fetched.
  useEffect(() => {
    for (const account of accounts) {
      if (!shouldAutoFetchProviderQuota(account.quota)) {
        continue
      }
      void queryClient
        .fetchQuery(providerQuotaQueryOptions(account.id))
        .then((quota) => syncQuotaCache(queryClient, account.id, quota))
        .catch(() => {
          // Keep the manual "Check quota" button as the retry path.
        })
    }
  }, [accounts, queryClient])

  return (
    <>
      <Card className="hidden gap-0 py-0 md:flex">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/55 hover:bg-muted/55">
              <TableHead className="pl-4">Provider</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Credential</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-48 pr-4">Quota</TableHead>
              <TableHead className="pr-4 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <ProviderTableRow
                key={account.id}
                account={account}
                currentUserId={currentUserId}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {accounts.map((account) => (
          <ProviderCard
            key={account.id}
            account={account}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </>
  )
}

function ProviderTableRow({
  account,
  currentUserId,
}: {
  account: ProviderAccountWithQuota
  currentUserId: string
}) {
  const ownedByCurrentUser = account.ownerUserId === currentUserId
  const navigate = useNavigate()
  const detailPath = getProviderDetailPath(account.id)

  return (
    <TableRow
      className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      role="link"
      tabIndex={0}
      aria-label={`Open ${account.label} details`}
      onClick={(event) => {
        if (isInteractiveTarget(event.target)) {
          return
        }

        navigate(detailPath)
      }}
      onKeyDown={(event) => {
        if (!isActivationKey(event.key) || isInteractiveTarget(event.target)) {
          return
        }

        event.preventDefault()
        navigate(detailPath)
      }}
    >
      <TableCell className="py-3.5 pl-4">
        <ProviderIdentity account={account} />
      </TableCell>
      <TableCell>
        <AccessSummary
          account={account}
          ownedByCurrentUser={ownedByCurrentUser}
        />
      </TableCell>
      <TableCell>
        <CredentialSummary credentialKind={account.credentialKind} />
      </TableCell>
      <TableCell className="tabular-nums">{account.priority}</TableCell>
      <TableCell>
        <ProviderStatus account={account} />
      </TableCell>
      <TableCell className="pr-4">
        <ProviderQuotaSummary accountId={account.id} quota={account.quota} />
      </TableCell>
      <TableCell className="pr-4 text-right">
        {ownedByCurrentUser ? <ProviderEditDialog account={account} /> : null}
      </TableCell>
    </TableRow>
  )
}

function ProviderCard({
  account,
  currentUserId,
}: {
  account: ProviderAccountWithQuota
  currentUserId: string
}) {
  const ownedByCurrentUser = account.ownerUserId === currentUserId
  const navigate = useNavigate()
  const detailPath = getProviderDetailPath(account.id)

  return (
    <Card
      className="cursor-pointer gap-4 p-4 transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      role="link"
      tabIndex={0}
      aria-label={`Open ${account.label} details`}
      onClick={(event) => {
        if (isInteractiveTarget(event.target)) {
          return
        }

        navigate(detailPath)
      }}
      onKeyDown={(event) => {
        if (!isActivationKey(event.key) || isInteractiveTarget(event.target)) {
          return
        }

        event.preventDefault()
        navigate(detailPath)
      }}
    >
      <ProviderIdentity account={account} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t pt-4 text-sm">
        <MobileField label="Access">
          <AccessSummary
            account={account}
            ownedByCurrentUser={ownedByCurrentUser}
          />
        </MobileField>
        <MobileField label="Credential">
          <CredentialSummary credentialKind={account.credentialKind} />
        </MobileField>
        <MobileField label="Priority">
          <span className="tabular-nums text-foreground">
            {account.priority}
          </span>
        </MobileField>
        <MobileField label="Status">
          <ProviderStatus account={account} />
        </MobileField>
        <MobileField label="Updated">
          <span className="text-muted-foreground">
            {formatTimestamp(account.updatedAt)}
          </span>
        </MobileField>
        <div className="col-span-2 grid min-w-0 content-start gap-1.5 border-t pt-4">
          <span className="text-xs font-medium text-muted-foreground">Quota</span>
          <ProviderQuotaSummary accountId={account.id} quota={account.quota} />
        </div>
        {ownedByCurrentUser ? (
          <div className="col-span-2 flex justify-end border-t pt-4">
            <ProviderEditDialog account={account} />
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function ProviderIdentity({ account }: { account: ProviderAccount }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/45 text-muted-foreground shadow-xs">
        <ServerIcon className="size-4" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <Link
          to={`/providers/${encodeURIComponent(account.id)}`}
          className="truncate font-medium text-foreground underline-offset-4 hover:underline"
        >
          {account.label}
        </Link>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0">{formatProviderKind(account.provider)}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 truncate" title={account.groupLabel}>
            {account.groupLabel}
          </span>
          {account.baseUrl ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate" title={account.baseUrl}>
                {account.baseUrl}
              </span>
            </>
          ) : null}
        </span>
        <span className="hidden text-xs text-muted-foreground md:block">
          Updated {formatTimestamp(account.updatedAt)}
        </span>
      </span>
    </div>
  )
}

function getProviderDetailPath(accountId: string): string {
  return `/providers/${encodeURIComponent(accountId)}`
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    ? Boolean(target.closest('a, button, input, select, textarea, [role="button"]'))
    : false
}

function isActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' '
}

function AccessSummary({
  account,
  ownedByCurrentUser,
}: {
  account: ProviderAccount
  ownedByCurrentUser: boolean
}) {
  const VisibilityIcon =
    account.visibility === 'shared' ? Share2Icon : LockKeyholeIcon

  return (
    <span className="grid gap-1">
      <span className="flex items-center gap-1.5 text-foreground">
        <VisibilityIcon className="size-3.5 text-muted-foreground" />
        {account.visibility === 'shared' ? 'Shared' : 'Private'}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <UserRoundIcon className="size-3" />
        {ownedByCurrentUser ? 'Owned by you' : 'Shared with you'}
      </span>
    </span>
  )
}

function CredentialSummary({
  credentialKind,
}: {
  credentialKind: ProviderCredentialKind
}) {
  return (
    <span className="flex items-center gap-1.5 text-foreground">
      <KeyRoundIcon className="size-3.5 text-muted-foreground" />
      {formatCredentialKind(credentialKind)}
    </span>
  )
}

function ProviderStatus({ account }: { account: ProviderAccount }) {
  const status = getProviderStatus(account)
  const StatusIcon = status.icon

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 bg-background', status.className)}
    >
      <StatusIcon />
      {status.label}
    </Badge>
  )
}

function MobileField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function ProviderListLoading() {
  return (
    <>
      <Card className="hidden gap-0 py-0 md:flex">
        <div className="grid grid-cols-[2fr_1fr_1fr_0.7fr_1fr_1.4fr_auto] gap-4 border-b bg-muted/35 px-4 py-3">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[2fr_1fr_1fr_0.7fr_1fr_1.4fr_auto] items-center gap-4 border-b px-4 py-3.5 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9" />
              <div className="grid gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-1 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </Card>

      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="gap-4 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9" />
              <div className="grid gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44 max-w-full" />
              </div>
            </div>
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

function ProviderListError({
  busy,
  onRetry,
}: {
  busy: boolean
  onRetry: () => void
}) {
  return (
    <Alert className="max-w-2xl">
      <CircleAlertIcon />
      <AlertTitle>Unable to load providers</AlertTitle>
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

function ProviderListEmpty() {
  return (
    <Card className="min-h-80 justify-center">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-10 rounded-xl">
            <BoxesIcon />
          </EmptyMedia>
          <EmptyTitle>No providers configured</EmptyTitle>
          <EmptyDescription>
            Add the first upstream Provider account to make a routing group
            available.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  )
}

function getProviderStatus(account: ProviderAccount): {
  label: string
  icon: typeof CircleCheckIcon
  className: string
} {
  if (account.authState === 'reauth_required') {
    return {
      label: 'Reauthentication required',
      icon: CircleAlertIcon,
      className:
        'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
    }
  }

  if (account.enabled) {
    return {
      label: 'Activated',
      icon: CircleCheckIcon,
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
    }
  }

  return {
    label: 'Disabled',
    icon: CircleOffIcon,
    className: 'text-muted-foreground',
  }
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
