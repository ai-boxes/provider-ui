import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, Loader2Icon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { apiKeysQueryOptions } from '@/features/api-keys/api-keys-query'
import { providerGroupImpact } from '@/features/providers/provider-account-impact'
import { deleteProviderAccount } from '@/features/providers/provider-api'
import { providerKeys, providersQueryOptions } from '@/features/providers/providers-query'
import type { ProviderAccount } from '@/features/providers/provider-types'
import { ApiError } from '@/lib/api/error'

export function ProviderDeleteDialog({ account }: { account: ProviderAccount }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const providers = useQuery({
    ...providersQueryOptions,
    enabled: open && account.visibility === 'private',
  })
  const apiKeys = useQuery({
    ...apiKeysQueryOptions,
    enabled: open && account.visibility === 'private',
  })
  const impact = providerGroupImpact(
    account,
    providers.data,
    apiKeys.data,
    providers.isPending || apiKeys.isPending,
    providers.isError || apiKeys.isError,
  )
  const deleteAccount = useMutation({
    mutationFn: () => deleteProviderAccount(account.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: providerKeys.detail(account.id) })
      queryClient.removeQueries({ queryKey: providerKeys.models(account.id) })
      void queryClient.invalidateQueries({
        queryKey: providerKeys.all,
        exact: true,
      })
      setOpen(false)
      navigate('/providers', { replace: true })
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (deleteAccount.isPending) {
      return
    }

    setOpen(nextOpen)

    if (nextOpen) {
      deleteAccount.reset()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <Trash2Icon />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {account.label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently deletes the provider and model catalog.{' '}
            {account.visibility === 'shared'
              ? `Shared keys may lose routing in “${account.groupLabel}”.`
              : privateDeleteImpact(account, impact)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteAccount.isError ? (
          <MutationError
            title="Unable to delete Provider"
            error={deleteAccount.error}
          />
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAccount.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={
              deleteAccount.isPending ||
              (account.visibility === 'private' && impact.pending)
            }
            onClick={() => deleteAccount.mutate()}
          >
            {deleteAccount.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Delete Provider
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function MutationError({
  title,
  error,
}: {
  title: string
  error: unknown
}) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {error instanceof ApiError
          ? error.message
          : 'The request could not be completed. Try again.'}
      </AlertDescription>
    </Alert>
  )
}

function privateDeleteImpact(
  account: ProviderAccount,
  impact: ReturnType<typeof providerGroupImpact>,
): string {
  if (!impact.ready) {
    if (impact.failed) {
      return `Impact for “${account.groupLabel}” could not be loaded.`
    }
    return `Checking “${account.groupLabel}” routing impact.`
  }

  if (impact.alternativeEnabledProviders > 0) {
    return `${impact.apiKeyCount} key${impact.apiKeyCount === 1 ? '' : 's'} can use ${impact.alternativeEnabledProviders} other enabled provider${impact.alternativeEnabledProviders === 1 ? '' : 's'}.`
  }

  return `${impact.apiKeyCount} key${impact.apiKeyCount === 1 ? '' : 's'} will lose routing in “${account.groupLabel}”.`
}
