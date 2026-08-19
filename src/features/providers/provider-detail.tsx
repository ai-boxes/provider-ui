import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  LockKeyholeIcon,
  ServerIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ProviderAccountActions } from '@/features/providers/provider-account-management'
import {
  AccountStatusBadge,
  ProviderOverview,
} from '@/features/providers/provider-detail-overview'
import {
  ProviderDetailError,
  ProviderDetailLoading,
} from '@/features/providers/provider-detail-states'
import { ProviderHealthCard } from '@/features/providers/provider-health'
import { ProviderModels } from '@/features/providers/provider-model-catalog'
import { ProviderQuotaCard } from '@/features/providers/provider-quota'
import { ProviderReauthDialog } from '@/features/providers/provider-reauth-dialog'
import {
  providerHealthQueryOptions,
  providerModelsQueryOptions,
  providerQueryOptions,
} from '@/features/providers/providers-query'
import {
  formatProviderKind,
  isOAuthProvider,
} from '@/features/providers/provider-format'

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
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground shadow-xs">
              <ServerIcon className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1">
              <h1 className="truncate font-heading text-2xl font-semibold tracking-[-0.025em]">
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
            {ownedByCurrentUser && isOAuthProvider(account.data.provider) ? (
              <ProviderReauthDialog account={account.data} />
            ) : (
              'This Provider credential is no longer valid. The account owner must reauthenticate before routing traffic through it.'
            )}
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
