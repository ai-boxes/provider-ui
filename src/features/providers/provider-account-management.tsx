import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { apiKeysQueryOptions } from '@/features/api-keys/api-keys-query'
import { providerGroupImpact } from '@/features/providers/provider-account-impact'
import { ProviderDeleteDialog } from '@/features/providers/provider-account-delete'
import { ProviderEditDialog } from '@/features/providers/provider-account-edit'
import { setProviderEnabled } from '@/features/providers/provider-api'
import { providerKeys, providersQueryOptions } from '@/features/providers/providers-query'
import type { ProviderAccount } from '@/features/providers/provider-types'

export function ProviderAccountActions({
  account,
}: {
  account: ProviderAccount
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProviderEditDialog account={account} />
      <ProviderDeleteDialog account={account} />
    </div>
  )
}

function privateDisableImpact(
  account: ProviderAccount,
  impact: ReturnType<typeof providerGroupImpact>,
): string {
  if (!impact.ready) {
    if (impact.failed) {
      return `API keys owned by you may use “${account.groupLabel}”, but their routing impact could not be loaded. Disabling this account may leave those keys without an enabled Provider.`
    }
    return `Checking API keys and enabled Providers in “${account.groupLabel}” before disabling this account.`
  }

  if (impact.alternativeEnabledProviders > 0) {
    return `${impact.apiKeyCount} API key${impact.apiKeyCount === 1 ? '' : 's'} owned by you use “${account.groupLabel}”. They can continue routing through ${impact.alternativeEnabledProviders} other enabled Provider${impact.alternativeEnabledProviders === 1 ? '' : 's'} available to you in this group.`
  }

  return `${impact.apiKeyCount} API key${impact.apiKeyCount === 1 ? '' : 's'} owned by you use “${account.groupLabel}”. Disabling this account leaves you without an enabled Provider in that group, so those keys cannot route requests.`
}

export function ProviderEnabledControl({
  account,
}: {
  account: ProviderAccount
}) {
  const [confirmDisable, setConfirmDisable] = useState(false)
  const queryClient = useQueryClient()
  const providers = useQuery({
    ...providersQueryOptions,
    enabled: confirmDisable && account.visibility === 'private',
  })
  const apiKeys = useQuery({
    ...apiKeysQueryOptions,
    enabled: confirmDisable && account.visibility === 'private',
  })
  const impact = providerGroupImpact(
    account,
    providers.data,
    apiKeys.data,
    providers.isPending || apiKeys.isPending,
    providers.isError || apiKeys.isError,
  )
  const mutation = useMutation({
    mutationFn: setProviderEnabled,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: providerKeys.detail(input.accountId),
      })
      const previous = queryClient.getQueryData<ProviderAccount>(
        providerKeys.detail(input.accountId),
      )

      if (previous) {
        queryClient.setQueryData(providerKeys.detail(input.accountId), {
          ...previous,
          enabled: input.enabled,
        })
      }

      return { previous }
    },
    onError: (_error, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          providerKeys.detail(input.accountId),
          context.previous,
        )
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(providerKeys.detail(updated.id), updated)
      setConfirmDisable(false)
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: providerKeys.all,
        exact: true,
      })
      void queryClient.invalidateQueries({
        queryKey: providerKeys.detail(input.accountId),
      })
    },
  })

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Switch
          checked={account.enabled}
          disabled={mutation.isPending}
          aria-label={account.enabled ? 'Disable provider' : 'Enable provider'}
          onCheckedChange={(enabled) => {
            if (enabled) {
              mutation.mutate({ accountId: account.id, enabled })
            } else {
              setConfirmDisable(true)
            }
          }}
        />
        <span>{account.enabled ? 'Enabled' : 'Disabled'}</span>
        {mutation.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {mutation.isError ? (
        <span role="alert" className="text-xs text-destructive">
          Unable to update the Provider state.
        </span>
      ) : null}
      <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CircleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Disable {account.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {account.visibility === 'shared'
                ? `API keys owned by you or other users may route through the shared “${account.groupLabel}” group. Disabling this account may leave some users without an eligible Provider.`
                : privateDisableImpact(account, impact)}
              {' '}Re-enable this account, enable another Provider in the
              group, or move the API keys to restore routing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>
              Keep enabled
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                mutation.isPending ||
                (account.visibility === 'private' && impact.pending)
              }
              onClick={() =>
                mutation.mutate({ accountId: account.id, enabled: false })
              }
            >
              {mutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              Disable Provider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
